import { ApiProperty } from '@nestjs/swagger';

export class PasswordResponseDto {
  @ApiProperty({
    example: 'Password changed successfully',
    description: 'Success message for password operations',
  })
  message: string;

  @ApiProperty({
    example: true,
    description: 'Indicates if the operation was successful',
  })
  success: boolean;

  @ApiProperty({
    example: '2024-01-15T10:30:00.000Z',
    description: 'Timestamp of the operation',
  })
  timestamp: string;
}
