import { ApiProperty } from '@nestjs/swagger';

export class UserResponseDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'john.doe@example.com' })
  email: string;

  @ApiProperty({ example: 'johndoe' })
  username: string;

  @ApiProperty({ example: 'John Doe', required: false })
  name?: string | null; // Change this line

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  createdAt: Date;
}

export class LoginResponseDto {
  @ApiProperty({ example: 'Login successful' })
  message: string;

  @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' })
  accessToken: string;

  @ApiProperty({ type: UserResponseDto })
  user: UserResponseDto;
}

export class SignupResponseDto {
  @ApiProperty({ example: 'User created successfully' })
  message: string;

  @ApiProperty({ type: UserResponseDto })
  user: UserResponseDto;
}

export class ProfileResponseDto {
  @ApiProperty({ example: 'Profile retrieved successfully' })
  message: string;

  @ApiProperty({ type: UserResponseDto })
  user: UserResponseDto;
} 