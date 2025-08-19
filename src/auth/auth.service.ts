import {
  Injectable,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { SignupDto } from './dto/signup.dto';
import { BulkUserDto, UserCreationResult } from './dto/bulk-signup.dto';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private notificationsService: NotificationsService,
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
    const roles = user.userRoles?.map((ur) => ur.role.name) || [];

    const payload = {
      email: user.email,
      sub: user.id,
      roles: roles, // Include roles array in JWT
    };

    const { password: _, updatedAt: __, ...userResponse } = user;

    return {
      message: 'Login successful',
      accessToken: this.jwtService.sign(payload),
      user: userResponse,
    };
  }

  async signup(signupDto: SignupDto & { roleName: string }) {
    try {
      // Remove the validation check - let database handle uniqueness
      // const existingUser = await this.prisma.user.findFirst({
      //   where: {
      //     OR: [{ email: signupDto.email }, { username: signupDto.username }],
      //     deletedAt: null,
      //   },
      // });

      // if (existingUser) {
      //   throw new ConflictException(
      //     'User with this email or username already exists',
      //   );
      // }

      // Validate group if provided
      if (signupDto.groupId) {
        const group = await this.prisma.group.findFirst({
          where: {
            id: signupDto.groupId,
            deletedAt: null,
          },
        });

        if (!group) {
          throw new BadRequestException(
            `Group with ID ${signupDto.groupId} not found`,
          );
        }
      }

      const salt = await bcrypt.genSalt();
      const hashedPassword = await bcrypt.hash(signupDto.password, salt);

      // Create user with group assignment in a transaction
      const result = await this.prisma.$transaction(async (prisma) => {
        // Create user
        const user = await prisma.user.create({
          data: {
            email: signupDto.email,
            username: signupDto.username,
            name: signupDto.name,
            password: hashedPassword,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        });

        // Assign role from request (required)
        const roleNameToAssign = signupDto.roleName.toUpperCase();
        const selectedRole = await prisma.role.findUnique({
          where: { name: roleNameToAssign },
        });

        if (!selectedRole) {
          throw new BadRequestException(`Role '${roleNameToAssign}' not found in database`);
        }

        await prisma.userRole.create({
          data: {
            userId: user.id,
            roleId: selectedRole.id,
          },
        });

        // Assign user to group if provided
        if (signupDto.groupId) {
          await prisma.userGroup.create({
            data: {
              userId: user.id,
              groupId: signupDto.groupId,
            },
          });
        }

        return user;
      });

      // Fetch user with roles and groups (excluding password)
      const userWithRoles = await this.prisma.user.findUnique({
        where: { id: result.id },
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
          userGroups: {
            include: {
              group: {
                select: {
                  id: true,
                  groupName: true,
                  description: true,
                },
              },
            },
          },
        },
      });

      const userResponse = {
        ...userWithRoles!,
        name: userWithRoles!.name ?? undefined,
      };

      // Send welcome email with credentials
      try {
        await this.notificationsService.sendWelcomeEmailWithCredentials({
          to: signupDto.email,
          username: signupDto.username,
          email: signupDto.email,
          password: signupDto.password, // Send the plain text password
          loginUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
        });
      } catch (emailError) {
        // Log the error but don't fail the signup process
        console.error('Failed to send welcome email:', emailError);
      }

      return {
        message: 'User created successfully',
        user: userResponse,
      };
    } catch (error) {
      if (
        error instanceof ConflictException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      
      // Log the actual error for debugging
      console.error('Signup error:', error);
      
      // Check for specific database errors
      if (error.code === 'P2002') {
        // Prisma unique constraint violation
        if (error.meta?.target?.includes('email')) {
          throw new ConflictException('User with this email already exists');
        }
        if (error.meta?.target?.includes('username')) {
          throw new ConflictException('User with this username already exists');
        }
        throw new ConflictException('User with this email or username already exists');
      }
      
      if (error.code === 'P2003') {
        // Prisma foreign key constraint violation
        throw new BadRequestException('Invalid group ID or role reference');
      }
      
      throw new BadRequestException(`Failed to create user: ${error.message}`);
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
        userGroups: {
          include: {
            group: {
              select: {
                id: true,
                groupName: true,
                description: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      // Create new user with default group assignment if configured
      const defaultGroupId = process.env.DEFAULT_GROUP_ID
        ? parseInt(process.env.DEFAULT_GROUP_ID)
        : null;

      // Validate default group if configured
      if (defaultGroupId) {
        const group = await this.prisma.group.findFirst({
          where: {
            id: defaultGroupId,
            deletedAt: null,
          },
        });

        if (!group) {
          console.warn(
            `Default group with ID ${defaultGroupId} not found, creating user without group assignment`,
          );
        }
      }

      const newUser = await this.prisma.$transaction(async (prisma) => {
        // Create user
        const createdUser = await prisma.user.create({
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
        const pesertaRole = await prisma.role.findUnique({
          where: { name: 'PESERTA' },
        });

        if (pesertaRole) {
          await prisma.userRole.create({
            data: {
              userId: createdUser.id,
              roleId: pesertaRole.id,
            },
          });
        }

        // Assign user to default group if configured and valid
        if (defaultGroupId) {
          const group = await prisma.group.findFirst({
            where: {
              id: defaultGroupId,
              deletedAt: null,
            },
          });

          if (group) {
            await prisma.userGroup.create({
              data: {
                userId: createdUser.id,
                groupId: defaultGroupId,
              },
            });
          }
        }

        return createdUser;
      });

      // Fetch user with roles and groups (excluding password)
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
          userGroups: {
            include: {
              group: {
                select: {
                  id: true,
                  groupName: true,
                  description: true,
                },
              },
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
      users: users.map((user) => ({
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
    const validationErrors: string[] = [];

    // Validate all users first
    for (let i = 0; i < users.length; i++) {
      const userData = users[i];
      const rowNumber = i + 2; // +2 because Excel has header row and we're 0-indexed

      // Validate email format
      if (!this.isValidEmail(userData.email)) {
        validationErrors.push(
          `Row ${rowNumber}: Invalid email format "${userData.email}"`,
        );
      }

      // Validate username length
      if (userData.username.length < 3) {
        validationErrors.push(
          `Row ${rowNumber}: Username "${userData.username}" must be at least 3 characters`,
        );
      }

      // Validate password length
      if (userData.password.length < 6) {
        validationErrors.push(
          `Row ${rowNumber}: Password must be at least 6 characters`,
        );
      }

      // Validate role if provided
      if (
        userData.role &&
        !['USER', 'ADMIN', 'JURY', 'PESERTA'].includes(
          userData.role.toUpperCase(),
        )
      ) {
        validationErrors.push(
          `Row ${rowNumber}: Invalid role "${userData.role}". Valid roles are: USER, ADMIN, JURY, PESERTA`,
        );
      }
    }

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
      validationErrors,
    };
  }

  private async createSingleUserForBulk(
    userData: BulkUserDto,
  ): Promise<UserCreationResult> {
    try {
      console.log(`Processing user: ${userData.email} (${userData.username})`);

      // Remove the validation check - let database handle uniqueness
      // const existingUser = await this.prisma.user.findFirst({
      //   where: {
      //     OR: [{ email: userData.email }, { username: userData.username }],
      //     deletedAt: null,
      //   },
      // });

      // if (existingUser) {
      //   console.log(`User already exists: ${userData.email}`);
      //   return {
      //     email: userData.email,
      //     username: userData.username,
      //     success: false,
      //     error: 'User with this email or username already exists',
      //   };
      // }

      // Validate group if provided
      if (userData.groupId) {
        console.log(`Validating group ID: ${userData.groupId}`);
        const group = await this.prisma.group.findFirst({
          where: {
            id: userData.groupId,
            deletedAt: null,
          },
        });

        if (!group) {
          console.log(`Group not found: ${userData.groupId}`);
          return {
            email: userData.email,
            username: userData.username,
            success: false,
            error: `Group with ID ${userData.groupId} not found`,
          };
        }
        console.log(`Group validated: ${group.groupName}`);
      }

      const salt = await bcrypt.genSalt();
      const hashedPassword = await bcrypt.hash(userData.password, salt);

      // Create user with role and group assignment in a transaction
      const user = await this.prisma.$transaction(async (prisma) => {
        // Create user
        const newUser = await prisma.user.create({
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
        const roleName = userData.role
          ? userData.role.toUpperCase()
          : 'PESERTA';
        console.log(`Looking for role: ${roleName}`);
        const role = await prisma.role.findUnique({
          where: { name: roleName },
        });

        if (role) {
          console.log(`Role found: ${role.name} (ID: ${role.id})`);
          await prisma.userRole.create({
            data: {
              userId: newUser.id,
              roleId: role.id,
            },
          });
          console.log(`Role assigned to user: ${newUser.id}`);
        } else {
          console.warn(
            `Role "${roleName}" not found for user ${userData.email}. User created without role assignment.`,
          );
        }

        // Assign user to group if provided
        if (userData.groupId) {
          await prisma.userGroup.create({
            data: {
              userId: newUser.id,
              groupId: userData.groupId,
            },
          });
        }

        return newUser;
      });

      // Send welcome email with credentials for bulk signup
      try {
        await this.notificationsService.sendWelcomeEmailWithCredentials({
          to: userData.email,
          username: userData.username,
          email: userData.email,
          password: userData.password, // Send the plain text password
          loginUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
        });
      } catch (emailError) {
        // Log the error but don't fail the user creation process
        console.error(
          `Failed to send welcome email for ${userData.email}:`,
          emailError,
        );
        // Note: We don't throw the error here to prevent the entire bulk import from failing
      }

      console.log(
        `User created successfully: ${userData.email} (ID: ${user.id})`,
      );
      return {
        email: userData.email,
        username: userData.username,
        success: true,
        message: 'User created successfully',
        userId: user.id,
      };
    } catch (error) {
      console.error(`Failed to create user ${userData.email}:`, error);
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
      const ExcelJS = require('exceljs');
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(fileBuffer);

      const worksheet = workbook.getWorksheet(1); // Get first worksheet
      if (!worksheet) {
        throw new BadRequestException('No worksheet found in Excel file');
      }

      const users: BulkUserDto[] = [];
      const headers: string[] = [];
      const validationErrors: string[] = [];

      // Get headers from first row
      const headerRow = worksheet.getRow(1);
      headerRow.eachCell((cell, colNumber) => {
        headers[colNumber] = cell.value?.toString().toLowerCase().trim() || '';
      });
      console.log('Detected headers:', headers);

      // Validate required headers
      const requiredHeaders = ['email', 'username', 'password'];
      const missingHeaders = requiredHeaders.filter(
        (header) => !headers.some((h) => h.includes(header)),
      );

      if (missingHeaders.length > 0) {
        throw new BadRequestException(
          `Missing required columns: ${missingHeaders.join(', ')}. Required columns are: email, username, password`,
        );
      }

      // Process data rows
      console.log(`Total rows in worksheet: ${worksheet.rowCount}`);
      let processedRows = 0;
      worksheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return; // Skip header row

        processedRows++;
        console.log(`Processing row ${rowNumber}:`, row.values);

        // Check if row has any data
        const rowValues = row.values.filter(
          (val) => val !== undefined && val !== null && val !== '',
        );
        console.log(
          `Row ${rowNumber} has ${rowValues.length} non-empty values:`,
          rowValues,
        );

        if (rowValues.length === 0) {
          console.log(`Skipping empty row ${rowNumber}`);
          return;
        }

        const userData: Partial<BulkUserDto> = {};
        let hasRequiredFields = true;

        row.eachCell((cell, colNumber) => {
          const header = headers[colNumber];
          let value = '';

          // Handle different cell value types
          if (
            cell.value &&
            typeof cell.value === 'object' &&
            'text' in cell.value
          ) {
            // Handle hyperlink objects
            value = cell.value.text?.toString().trim() || '';
          } else {
            // Handle regular values
            value = cell.value?.toString().trim() || '';
          }

          console.log(
            `Row ${rowNumber}, Col ${colNumber}, Header: "${header}", Value: "${value}", Raw:`,
            cell.value,
          );

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
          } else if (header.includes('group') || header.includes('groupid')) {
            // Handle groupId - convert to number if it's a valid number
            if (value && value !== '') {
              const groupId = parseInt(value);
              if (!isNaN(groupId)) {
                userData.groupId = groupId;
              } else {
                validationErrors.push(
                  `Row ${rowNumber}: Invalid groupId "${value}" - must be a number`,
                );
              }
            }
          }
        });

        // Validate required fields
        if (!userData.email) {
          validationErrors.push(`Row ${rowNumber}: Missing email`);
          hasRequiredFields = false;
        } else if (!this.isValidEmail(userData.email)) {
          validationErrors.push(
            `Row ${rowNumber}: Invalid email format "${userData.email}"`,
          );
          hasRequiredFields = false;
        }

        if (!userData.username) {
          validationErrors.push(`Row ${rowNumber}: Missing username`);
          hasRequiredFields = false;
        } else if (userData.username.length < 3) {
          validationErrors.push(
            `Row ${rowNumber}: Username "${userData.username}" must be at least 3 characters`,
          );
          hasRequiredFields = false;
        }

        if (!userData.password) {
          validationErrors.push(`Row ${rowNumber}: Missing password`);
          hasRequiredFields = false;
        } else if (userData.password.length < 6) {
          validationErrors.push(
            `Row ${rowNumber}: Password must be at least 6 characters`,
          );
          hasRequiredFields = false;
        }

        // Only add if required fields are present and valid
        console.log(
          `Row ${rowNumber} userData:`,
          userData,
          'hasRequiredFields:',
          hasRequiredFields,
        );
        if (
          hasRequiredFields &&
          userData.email &&
          userData.username &&
          userData.password
        ) {
          users.push(userData as BulkUserDto);
          console.log(`Added user from row ${rowNumber}:`, userData);
        } else {
          console.log(
            `Skipped user from row ${rowNumber} - missing required fields`,
          );
        }
      });

      console.log(`Processed ${processedRows} data rows`);
      console.log(`Final users array length: ${users.length}`);
      console.log('Final users:', users);
      if (users.length === 0) {
        throw new BadRequestException(
          `No valid user data found in Excel file. Processed ${processedRows} rows but found no valid data.`,
        );
      }

      return users;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      console.error('Excel parsing error:', error);
      throw new BadRequestException(
        "Failed to parse Excel file. Please ensure it's a valid Excel file.",
      );
    }
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
}
