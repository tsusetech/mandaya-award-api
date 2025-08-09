import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsString, IsBoolean, IsOptional, IsDateString } from 'class-validator';

export class ReviewCommentDto {
  @ApiProperty({ example: 1 })
  @IsNumber()
  id: number;

  @ApiProperty({ example: 'This answer needs more detail' })
  @IsString()
  comment: string;

  @ApiProperty({ example: true })
  @IsBoolean()
  isCritical: boolean;

  @ApiProperty({ example: 'admin_validation', required: false })
  @IsOptional()
  @IsString()
  stage?: string;

  @ApiProperty({ example: '2024-01-01T00:00:00Z' })
  @IsDateString()
  createdAt: string;

  @ApiProperty({ example: 'John Reviewer', required: false })
  @IsOptional()
  @IsString()
  reviewerName?: string;
}
