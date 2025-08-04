import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsString, IsOptional, IsEnum, IsArray, ValidateNested, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export enum ReviewStage {
  ADMIN_VALIDATION = 'admin_validation',      // Admin memvalidasi isian
  JURY_SCORING = 'jury_scoring',              // Penilaian Oleh Juri 0-10
  JURY_DELIBERATION = 'jury_deliberation',    // Juri Mempertimbangkan
  FINAL_DECISION = 'final_decision'           // Keputusan Akhir
}

export enum ReviewStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  NEEDS_REVISION = 'needs_revision',
  SCORED = 'scored',
  DELIBERATED = 'deliberated'
}

export enum ReviewDecision {
  APPROVE = 'approve',
  REJECT = 'reject',
  REQUEST_REVISION = 'request_revision',
  PASS_TO_JURY = 'pass_to_jury',
  NEEDS_DELIBERATION = 'needs_deliberation'
}

export class JuryScoreDto {
  @ApiProperty({ description: 'Question ID for the score' })
  @IsNumber()
  questionId: number;

  @ApiProperty({ description: 'Jury score (0-10)', minimum: 0, maximum: 10 })
  @IsNumber()
  @Min(0)
  @Max(10)
  score: number;

  @ApiProperty({ description: 'Comments for the score' })
  @IsString()
  @IsOptional()
  comments?: string;
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

  @ApiProperty({ description: 'Review stage when comment was made', enum: ReviewStage })
  @IsEnum(ReviewStage)
  @IsOptional()
  stage?: ReviewStage;
}

export class CreateReviewDto {
  @ApiProperty({ description: 'Response session ID to review' })
  @IsNumber()
  sessionId: number;

  @ApiProperty({ description: 'Current review stage', enum: ReviewStage })
  @IsEnum(ReviewStage)
  stage: ReviewStage;

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

  @ApiProperty({ description: 'Jury scores for questions', type: [JuryScoreDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => JuryScoreDto)
  @IsOptional()
  juryScores?: JuryScoreDto[];

  @ApiProperty({ description: 'Total jury score (0-100)' })
  @IsNumber()
  @Min(0)
  @Max(100)
  @IsOptional()
  totalScore?: number;

  @ApiProperty({ description: 'Deliberation notes from jury' })
  @IsString()
  @IsOptional()
  deliberationNotes?: string;

  @ApiProperty({ description: 'Internal notes (not visible to user)' })
  @IsString()
  @IsOptional()
  internalNotes?: string;

  @ApiProperty({ description: 'Validation checklist items', type: [String] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  validationChecklist?: string[];
}
