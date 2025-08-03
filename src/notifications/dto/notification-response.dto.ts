import { ApiProperty } from '@nestjs/swagger';

export class NotificationResponseDto {
  @ApiProperty({ example: 'email_12345' })
  id: string;

  @ApiProperty({ example: 'email' })
  type: string;

  @ApiProperty({ example: 'user@example.com' })
  recipient: string;

  @ApiProperty({ example: 'Welcome to Mandaya Awards' })
  subject: string;

  @ApiProperty({ example: 'sent' })
  status: string;

  @ApiProperty({ example: '2024-01-15T10:30:00Z' })
  sentAt: string;

  @ApiProperty({ example: 'Email sent successfully' })
  message: string;

  @ApiProperty({ example: '<20151025002517.117282.79817@sandbox-123.mailgun.org>' })
  mailgunId?: string;
}

export class BulkEmailResponseDto {
  @ApiProperty({ example: 'Bulk email operation completed' })
  message: string;

  @ApiProperty({ example: 5 })
  totalSent: number;

  @ApiProperty({ example: 0 })
  failed: number;

  @ApiProperty({ 
    type: [NotificationResponseDto],
    description: 'Details of each email sent'
  })
  results: NotificationResponseDto[];
} 