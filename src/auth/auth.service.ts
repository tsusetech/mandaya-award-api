import { Injectable, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { SignupDto } from './dto/signup.dto';
import { BulkUserDto, UserCreationResult } from './dto/bulk-signup.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async validateUser(email: string, pass: string): Promise<any> {
    const user = await this.prisma.user.findUnique({ 
      where: { email },
      include: {
        userRoles: {
          include: {
            role: true,
          },
        },
      },
    });
    
    // Check if user exists and has a password (not OAuth user)
    if (user && user.password && (await bcrypt.compare(pass, user.password))) {
      const { password: _, ...result } = user;
      return result;
    }
    return null;
  }

  async login(user: any) {
    // Extract role names for JWT payload
    const roles = user.userRoles?.map(ur => ur.role.name) || [];
    
    const payload = { 
      email: user.email, 
      sub: user.id,
      roles: roles // Include roles array in JWT
    };
    
    const { password: _, updatedAt: __, ...userResponse } = user;
    
    return {
      message: 'Login successful',
      accessToken: this.jwtService.sign(payload),
      user: userResponse,
    };
  }

  async signup(signupDto: SignupDto) {
    try {
      // Check if user already exists
      const existingUser = await this.prisma.user.findFirst({
        where: {
          OR: [
            { email: signupDto.email },
            { username: signupDto.username },
          ],
        },
      });

      if (existingUser) {
        throw new ConflictException('User with this email or username already exists');
      }

      const salt = await bcrypt.genSalt();
      const hashedPassword = await bcrypt.hash(signupDto.password, salt);
      
      // Create user
      const user = await this.prisma.user.create({
        data: {
          email: signupDto.email,
          username: signupDto.username,
          name: signupDto.name,
          password: hashedPassword,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });

      // Assign default PESERTA role
      const pesertaRole = await this.prisma.role.findUnique({
        where: { name: 'PESERTA' },
      });

      if (pesertaRole) {
        await this.prisma.userRole.create({
          data: {
            userId: user.id,
            roleId: pesertaRole.id,
          },
        });
      }

      // Fetch user with roles (excluding password)
      const userWithRoles = await this.prisma.user.findUnique({
        where: { id: user.id },
        select: {
          id: true,
          email: true,
          username: true,
          name: true,
          createdAt: true,
          updatedAt: true,
          userRoles: {
            include: {
              role: true,
            },
          },
        },
      });

      const userResponse = { 
        ...userWithRoles!, 
        name: userWithRoles!.name ?? undefined 
      };

      return {
        message: 'User created successfully',
        user: userResponse,
      };
    } catch (error) {
      if (error instanceof ConflictException) {
        throw error;
      }
      throw new BadRequestException('Failed to create user');
    }
  }

  async getProfile(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        username: true,
        name: true,
        createdAt: true,
        updatedAt: true,
        userRoles: {
          include: {
            role: true,
          },
        },
      },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    return {
      message: 'Profile retrieved successfully',
      user: { ...user, name: user.name ?? undefined },
    };
  }

  async findOrCreateGoogleUser(googleUser: any) {
    let user = await this.prisma.user.findUnique({
      where: { email: googleUser.email },
      select: {
        id: true,
        email: true,
        username: true,
        name: true,
        createdAt: true,
        updatedAt: true,
        userRoles: {
          include: {
            role: true,
          },
        },
      },
    });

    if (!user) {
      // Create new user
      const newUser = await this.prisma.user.create({
        data: {
          email: googleUser.email,
          name: googleUser.name,
          username: googleUser.email.split('@')[0],
          password: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });

      // Assign default PESERTA role
      const pesertaRole = await this.prisma.role.findUnique({
        where: { name: 'PESERTA' },
      });

      if (pesertaRole) {
        await this.prisma.userRole.create({
          data: {
            userId: newUser.id,
            roleId: pesertaRole.id,
          },
        });
      }

      // Fetch user with roles (excluding password)
      user = await this.prisma.user.findUnique({
        where: { id: newUser.id },
        select: {
          id: true,
          email: true,
          username: true,
          name: true,
          createdAt: true,
          updatedAt: true,
          userRoles: {
            include: {
              role: true,
            },
          },
        },
      });
    }

    return user!;
  }

  async getAllUsers() {
    const users = await this.prisma.user.findMany({
      select: {
        id: true,
        email: true,
        username: true,
        name: true,
        createdAt: true,
        updatedAt: true,
        userRoles: {
          include: {
            role: true,
          },
        },
      },
    });

    return {
      message: 'Users retrieved successfully',
      users: users.map(user => ({
        ...user,
        name: user.name ?? undefined,
      })),
      count: users.length,
    };
  }

  async bulkSignup(users: BulkUserDto[]) {
    const results: UserCreationResult[] = [];
    let successful = 0;
    let failed = 0;

    // Process users in batches to avoid memory issues
    const batchSize = 100;
    
    for (let i = 0; i < users.length; i += batchSize) {
      const batch = users.slice(i, i + batchSize);
      
      for (const userData of batch) {
        try {
          const result = await this.createSingleUserForBulk(userData);
          results.push(result);
          if (result.success) {
            successful++;
          } else {
            failed++;
          }
        } catch (error) {
          results.push({
            email: userData.email,
            username: userData.username,
            success: false,
            error: error.message || 'Unknown error occurred',
          });
          failed++;
        }
      }
    }

    return {
      message: 'Bulk user registration completed',
      totalProcessed: users.length,
      successful,
      failed,
      results,
    };
  }

  private async createSingleUserForBulk(userData: BulkUserDto): Promise<UserCreationResult> {
    try {
      // Check if user already exists
      const existingUser = await this.prisma.user.findFirst({
        where: {
          OR: [
            { email: userData.email },
            { username: userData.username },
          ],
        },
      });

      if (existingUser) {
        return {
          email: userData.email,
          username: userData.username,
          success: false,
          error: 'User with this email or username already exists',
        };
      }

      const salt = await bcrypt.genSalt();
      const hashedPassword = await bcrypt.hash(userData.password, salt);
      
      // Create user
      const user = await this.prisma.user.create({
        data: {
          email: userData.email,
          username: userData.username,
          name: userData.name,
          password: hashedPassword,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });

      // Assign role (default to PESERTA if not specified)
      const roleName = userData.role || 'PESERTA';
      const role = await this.prisma.role.findUnique({
        where: { name: roleName },
      });

      if (role) {
        await this.prisma.userRole.create({
          data: {
            userId: user.id,
            roleId: role.id,
          },
        });
      }

      return {
        email: userData.email,
        username: userData.username,
        success: true,
        message: 'User created successfully',
        userId: user.id,
      };
    } catch (error) {
      return {
        email: userData.email,
        username: userData.username,
        success: false,
        error: error.message || 'Failed to create user',
      };
    }
  }

  async parseExcelFile(fileBuffer: Buffer): Promise<BulkUserDto[]> {
    try {
      // Note: You'll need to install exceljs: npm install exceljs @types/exceljs
      const ExcelJS = require('exceljs');
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(fileBuffer);
      
      const worksheet = workbook.getWorksheet(1); // Get first worksheet
      if (!worksheet) {
        throw new BadRequestException('No worksheet found in Excel file');
      }

      const users: BulkUserDto[] = [];
      const headers: string[] = [];
      
      // Get headers from first row
      const headerRow = worksheet.getRow(1);
      headerRow.eachCell((cell, colNumber) => {
        headers[colNumber] = cell.value?.toString().toLowerCase().trim() || '';
      });

      // Validate required headers
      const requiredHeaders = ['email', 'username', 'password'];
      const missingHeaders = requiredHeaders.filter(header => 
        !headers.some(h => h.includes(header))
      );
      
      if (missingHeaders.length > 0) {
        throw new BadRequestException(
          `Missing required columns: ${missingHeaders.join(', ')}. Required columns are: email, username, password`
        );
      }

      // Process data rows
      worksheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return; // Skip header row
        
        const userData: Partial<BulkUserDto> = {};
        
        row.eachCell((cell, colNumber) => {
          const header = headers[colNumber];
          const value = cell.value?.toString().trim();
          
          if (header.includes('email')) {
            userData.email = value;
          } else if (header.includes('username')) {
            userData.username = value;
          } else if (header.includes('name')) {
            userData.name = value;
          } else if (header.includes('password')) {
            userData.password = value;
          } else if (header.includes('role')) {
            userData.role = value;
          }
        });

        // Only add if required fields are present
        if (userData.email && userData.username && userData.password) {
          users.push(userData as BulkUserDto);
        }
      });

      if (users.length === 0) {
        throw new BadRequestException('No valid user data found in Excel file');
      }

      return users;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Failed to parse Excel file. Please ensure it\'s a valid Excel file.');
    }
  }
}