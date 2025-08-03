import { ApiProperty } from '@nestjs/swagger';

export class SignupDto {
  @ApiProperty({ example: 'john.doe@example.com', description: 'User email address' })
  email: string;

  @ApiProperty({ example: 'johndoe', description: 'Username' })
  username: string;

  @ApiProperty({ example: 'John Doe', description: 'Full name', required: false })
  name?: string;

  @ApiProperty({ example: 'password123', description: 'Password (minimum 6 characters)' })
  password: string;
} 