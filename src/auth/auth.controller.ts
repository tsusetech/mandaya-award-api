import { Controller, Get, Post, Body, UseGuards, Req, HttpStatus, BadRequestException, UseInterceptors, UploadedFile } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthService } from './auth.service';
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';
import { LoginResponseDto, SignupResponseDto, ProfileResponseDto } from './dto/auth-response.dto';
import { BulkUserDto, BulkSignupDto, BulkSignupResponseDto } from './dto/bulk-signup.dto';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  // --- Local Auth ---
  @Post('signup')
  @ApiOperation({ 
    summary: 'Register a new user',
    description: 'Register a new user with optional group assignment. If groupId is provided, the user will be automatically assigned to that group.'
  })
  @ApiResponse({ 
    status: HttpStatus.CREATED, 
    description: 'User successfully created',
    type: SignupResponseDto 
  })
  @ApiResponse({ 
    status: HttpStatus.BAD_REQUEST, 
    description: 'Invalid input data or group not found' 
  })
  @ApiResponse({ 
    status: HttpStatus.CONFLICT, 
    description: 'User already exists' 
  })
  @ApiBody({ type: SignupDto })
  async signup(@Body() signupDto: SignupDto): Promise<SignupResponseDto> {
    return this.authService.signup(signupDto);
  }

  @UseGuards(AuthGuard('local'))
  @Post('login')
  @ApiOperation({ summary: 'Login with email and password' })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Login successful',
    type: LoginResponseDto 
  })
  @ApiResponse({ 
    status: HttpStatus.UNAUTHORIZED, 
    description: 'Invalid credentials' 
  })
  @ApiBody({ type: LoginDto })
  async login(@Req() req): Promise<LoginResponseDto> {
    return this.authService.login(req.user);
  }

  // --- Google OAuth ---
  @Get('google')
  @ApiOperation({ 
    summary: 'Initiate Google OAuth login',
    description: 'This endpoint redirects to Google OAuth. Cannot be tested directly in Swagger. Use browser instead.'
  })
  @ApiResponse({ 
    status: HttpStatus.FOUND, 
    description: 'Redirects to Google OAuth (302 redirect)',
    headers: {
      'Location': {
        description: 'Google OAuth URL',
        schema: { type: 'string' }
      }
    }
  })
  @UseGuards(AuthGuard('google'))
  async googleAuth(@Req() req) {
    // This route initiates the Google OAuth2 flow
  }

  @Get('google/callback')
  @ApiOperation({ 
    summary: 'Google OAuth callback',
    description: 'This endpoint is called by Google after authentication. Not for direct use.'
  })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Google OAuth successful',
    type: LoginResponseDto 
  })
  @UseGuards(AuthGuard('google'))
  googleAuthRedirect(@Req() req): Promise<LoginResponseDto> {
    return this.authService.login(req.user);
  }

  @Get('test-google')
  @ApiOperation({ summary: 'Test Google OAuth (Development only)' })
  @ApiResponse({ status: 200, description: 'Returns Google OAuth URL' })
  async testGoogleAuth() {
    return {
      message: 'To test Google OAuth, visit this URL in your browser',
      url: 'http://localhost:3000/auth/google',
      note: 'This will redirect you to Google login page'
    };
  }

  // --- Protected Routes ---
  @Get('profile')
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'User profile retrieved',
    type: ProfileResponseDto 
  })
  @ApiResponse({ 
    status: HttpStatus.UNAUTHORIZED, 
    description: 'Invalid or missing token' 
  })
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  async getProfile(@Req() req): Promise<ProfileResponseDto> {
    return this.authService.getProfile(req.user.userId);
  }

  @Post('bulk-register')
  @ApiOperation({ 
    summary: 'Bulk user registration',
    description: 'Register multiple users at once by providing an array of user data. Each user can be assigned to a specific group using the groupId field.'
  })
  @ApiResponse({ 
    status: 201, 
    description: 'Bulk registration completed', 
    type: BulkSignupResponseDto 
  })
  @ApiResponse({ status: 400, description: 'Invalid user data or group not found' })
  @ApiBody({ type: BulkSignupDto })
  async bulkRegister(@Body() bulkSignupDto: BulkSignupDto) {
    return this.authService.bulkSignup(bulkSignupDto.users);
  }

  @Post('bulk-register/excel')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ 
    summary: 'Bulk user registration from Excel file',
    description: 'Register multiple users by uploading an Excel file. Required columns: email, username, password. Optional columns: name, role, groupId. If groupId column is present, users will be assigned to the specified groups.'
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Excel file containing user data',
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Excel file (.xlsx or .xls) with columns: email, username, password, name (optional), role (optional), groupId (optional)'
        }
      }
    }
  })
  @ApiResponse({ 
    status: 201, 
    description: 'Bulk registration from Excel completed', 
    type: BulkSignupResponseDto 
  })
  @ApiResponse({ status: 400, description: 'Invalid file, file format, or group not found' })
  async bulkRegisterFromExcel(@UploadedFile() file: any) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    // Validate file type
    const allowedMimeTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-excel', // .xls
      'application/octet-stream' // Sometimes Excel files are detected as this
    ];
    
    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException(`Please upload a valid Excel file (.xlsx or .xls). Received file type: ${file.mimetype}`);
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      throw new BadRequestException('File size too large. Maximum size is 5MB');
    }

    // Validate file has content
    if (!file.buffer || file.buffer.length === 0) {
      throw new BadRequestException('Uploaded file is empty');
    }

    try {
      console.log(`Processing Excel file: ${file.originalname}, size: ${file.size} bytes, type: ${file.mimetype}`);
      const users = await this.authService.parseExcelFile(file.buffer);
      console.log(`Parsed ${users.length} users from Excel file`);
      return this.authService.bulkSignup(users);
    } catch (error) {
      console.error('Excel processing error:', error);
      throw new BadRequestException(`Failed to process Excel file: ${error.message}`);
    }
  }
}