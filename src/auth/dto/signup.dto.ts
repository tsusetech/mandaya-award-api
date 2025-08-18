import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsInt } from 'class-validator';

export class SignupDto {
  @ApiProperty({
    example: 'john.doe@example.com',
    description: 'User email address',
  })
  @IsString()
  email: string;

  @ApiProperty({ example: 'johndoe', description: 'Username' })
  @IsString()
  username: string;

  @ApiProperty({
    example: 'John Doe',
    description: 'Full name',
    required: false,
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({
    example: 'password123',
    description: 'Password (minimum 6 characters)',
  })
  @IsString()
  password: string;

  @ApiProperty({
    example: 1,
    description: 'Group ID to assign the user to',
    required: false,
  })
  @IsOptional()
  @IsInt()
  groupId?: number;
}
