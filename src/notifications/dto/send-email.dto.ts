import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, IsOptional, IsArray } from 'class-validator';

export class SendEmailDto {
  @ApiProperty({
    example: 'user@example.com',
    description: 'Recipient email address',
  })
  @IsEmail()
  to: string;

  @ApiProperty({
    example: 'Welcome to Mandaya Awards',
    description: 'Email subject',
  })
  @IsString()
  subject: string;

  @ApiProperty({
    example: 'Thank you for joining our platform!',
    description: 'Email content in plain text',
  })
  @IsString()
  @IsOptional()
  text?: string;

  @ApiProperty({
    example: '<h1>Welcome!</h1><p>Thank you for joining our platform!</p>',
    description: 'Email content in HTML format',
  })
  @IsString()
  @IsOptional()
  html?: string;

  @ApiProperty({
    example: ['user2@example.com', 'user3@example.com'],
    description: 'Additional recipients (CC)',
    required: false,
  })
  @IsOptional()
  @IsArray()
  @IsEmail({}, { each: true })
  cc?: string[];

  @ApiProperty({
    example: ['user4@example.com'],
    description: 'Hidden recipients (BCC)',
    required: false,
  })
  @IsOptional()
  @IsArray()
  @IsEmail({}, { each: true })
  bcc?: string[];
}

export class BulkEmailDto {
  @ApiProperty({
    type: [SendEmailDto],
    description: 'Array of emails to send',
  })
  @IsArray()
  emails: SendEmailDto[];
}

export class WelcomeEmailDto {
  @ApiProperty({
    example: 'user@example.com',
    description: 'Recipient email address',
  })
  @IsEmail()
  to: string;

  @ApiProperty({
    example: 'john_doe',
    description: 'Username of the new user',
  })
  @IsString()
  username: string;

  @ApiProperty({
    example: 'user@example.com',
    description: 'Email address of the new user',
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    example: 'mypassword123',
    description: 'Plain text password for the new user',
  })
  @IsString()
  password: string;

  @ApiProperty({
    example: 'https://myproject.com/login',
    description: 'Login URL for the application',
    required: false,
  })
  @IsOptional()
  @IsString()
  loginUrl?: string;
}
