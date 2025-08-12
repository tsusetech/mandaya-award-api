import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsString, IsOptional, IsBoolean } from 'class-validator';

export class ReviewCommentDto {
  @ApiProperty({ example: 1 })
  @IsNumber()
  id: number;

  @ApiProperty({ example: 1 })
  @IsNumber()
  sessionId: number; // Changed from reviewId

  @ApiProperty({ example: 1 })
  @IsNumber()
  questionId: number;

  @ApiProperty({ example: 'This response needs clarification' })
  @IsString()
  comment: string;

  @ApiProperty({ example: false })
  @IsBoolean()
  isCritical: boolean;

  @ApiProperty({ example: 'admin_validation', required: false })
  @IsOptional()
  @IsString()
  stage?: string;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  createdAt: Date;
}
