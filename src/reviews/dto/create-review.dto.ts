import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsString, IsOptional, IsEnum, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export enum ReviewStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  NEEDS_REVISION = 'needs_revision'
}

export enum ReviewDecision {
  APPROVE = 'approve',
  REJECT = 'reject',
  REQUEST_REVISION = 'request_revision'
}

export class ReviewCommentDto {
  @ApiProperty({ description: 'Question ID for the comment' })
  @IsNumber()
  questionId: number;

  @ApiProperty({ description: 'Comment text' })
  @IsString()
  comment: string;

  @ApiProperty({ description: 'Whether this is a critical issue', default: false })
  @IsOptional()
  isCritical?: boolean;
}

export class CreateReviewDto {
  @ApiProperty({ description: 'Response session ID to review' })
  @IsNumber()
  sessionId: number;

  @ApiProperty({ description: 'Review decision', enum: ReviewDecision })
  @IsEnum(ReviewDecision)
  decision: ReviewDecision;

  @ApiProperty({ description: 'Overall review comments' })
  @IsString()
  @IsOptional()
  overallComments?: string;

  @ApiProperty({ description: 'Specific comments for questions', type: [ReviewCommentDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReviewCommentDto)
  @IsOptional()
  questionComments?: ReviewCommentDto[];

  @ApiProperty({ description: 'Internal notes (not visible to user)' })
  @IsString()
  @IsOptional()
  internalNotes?: string;
}
