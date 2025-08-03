import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsEmail, IsOptional, IsString, MinLength, ValidateNested } from 'class-validator';

export class BulkUserDto {
  @ApiProperty({ example: 'john.doe@example.com', description: 'User email address' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'johndoe', description: 'Username' })
  @IsString()
  @MinLength(3)
  username: string;

  @ApiProperty({ example: 'John Doe', description: 'Full name', required: false })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ example: 'password123', description: 'Password (minimum 6 characters)' })
  @IsString()
  @MinLength(6)
  password: string;

  @ApiProperty({ example: 'PESERTA', description: 'User role', required: false })
  @IsOptional()
  @IsString()
  role?: string;
}

export class BulkSignupDto {
  @ApiProperty({ 
    type: [BulkUserDto], 
    description: 'Array of users to register',
    example: [
      {
        email: 'user1@example.com',
        username: 'user1',
        name: 'User One',
        password: 'password123',
        role: 'PESERTA'
      },
      {
        email: 'user2@example.com',
        username: 'user2',
        name: 'User Two',
        password: 'password123'
      }
    ]
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BulkUserDto)
  users: BulkUserDto[];
}

export class UserCreationResult {
  @ApiProperty({ example: 'user1@example.com' })
  email: string;

  @ApiProperty({ example: 'user1' })
  username: string;

  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ example: 'User created successfully', required: false })
  message?: string;

  @ApiProperty({ example: 'Email already exists', required: false })
  error?: string;

  @ApiProperty({ example: 1, required: false })
  userId?: number;
}

export class BulkSignupResponseDto {
  @ApiProperty({ example: 'Bulk user registration completed' })
  message: string;

  @ApiProperty({ example: 8 })
  totalProcessed: number;

  @ApiProperty({ example: 6 })
  successful: number;

  @ApiProperty({ example: 2 })
  failed: number;

  @ApiProperty({ type: [UserCreationResult] })
  results: UserCreationResult[];

  @ApiProperty({ example: ['Password too short for user3@example.com', 'Invalid email format for row 5'], required: false })
  validationErrors?: string[];
} 