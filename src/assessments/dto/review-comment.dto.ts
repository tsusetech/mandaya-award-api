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

  // Revision tracking fields
  @ApiProperty({ example: false, description: 'Whether the comment has been addressed' })
  @IsBoolean()
  isResolved: boolean;

  @ApiProperty({ example: '2024-01-01T00:00:00Z', required: false, description: 'When the comment was resolved' })
  @IsOptional()
  @IsDateString()
  resolvedAt?: string;

  @ApiProperty({ example: 'John User', required: false, description: 'Name of user who resolved the comment' })
  @IsOptional()
  @IsString()
  resolvedByUserName?: string;

  @ApiProperty({ example: 'Updated the answer with more details', required: false, description: 'Notes about how the revision was made' })
  @IsOptional()
  @IsString()
  revisionNotes?: string;
}

export class ResolveReviewCommentDto {
  @ApiProperty({ example: true, description: 'Whether to mark the comment as resolved' })
  @IsBoolean()
  isResolved: boolean;

  @ApiProperty({ example: 'Updated the answer with more details', required: false, description: 'Notes about how the revision was made' })
  @IsOptional()
  @IsString()
  revisionNotes?: string;
}
