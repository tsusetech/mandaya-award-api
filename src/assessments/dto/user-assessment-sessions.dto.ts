import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsString, IsOptional, IsDateString, IsBoolean, IsArray, IsEnum, ValidateNested, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { AssessmentQuestionDto } from './assessment-question.dto';

export class UserAssessmentSessionDto {
  @ApiProperty({ example: 1 })
  @IsNumber()
  id: number;

  @ApiProperty({ 
    example: 1, 
    description: 'Session ID to use for getting detailed information via /assessments/session/{sessionId}/detail'
  })
  @IsNumber()
  sessionId: number;

  @ApiProperty({ example: 1 })
  @IsNumber()
  userId: number;

  @ApiProperty({ example: 'john.doe@example.com' })
  @IsString()
  userEmail: string;

  @ApiProperty({ example: 'John Doe' })
  @IsString()
  userName: string;

  @ApiProperty({ example: 1 })
  @IsNumber()
  groupId: number;

  @ApiProperty({ example: 'Award Assessment 2024' })
  @IsString()
  groupName: string;

  @ApiProperty({ example: 'submitted' })
  @IsString()
  status: string;

  @ApiProperty({ example: 75 })
  @IsNumber()
  progressPercentage: number;

  @ApiProperty({ example: '2024-01-01T00:00:00Z' })
  @IsDateString()
  startedAt: string;

  @ApiProperty({ example: '2024-01-01T00:00:00Z' })
  @IsDateString()
  lastActivityAt: string;

  @ApiProperty({ example: '2024-01-01T00:00:00Z', required: false, nullable: true })
  @IsOptional()
  @IsDateString()
  completedAt?: string | null;

  @ApiProperty({ example: '2024-01-01T00:00:00Z', required: false, nullable: true })
  @IsOptional()
  @IsDateString()
  submittedAt?: string | null;

  // Review-related fields
  @ApiProperty({ example: 'admin_validation', required: false, nullable: true })
  @IsOptional()
  @IsString()
  reviewStage?: string | null;

  @ApiProperty({ example: 'approve', required: false, nullable: true })
  @IsOptional()
  @IsString()
  reviewDecision?: string | null;

  @ApiProperty({ example: 85.5, required: false, nullable: true })
  @IsOptional()
  @IsNumber()
  reviewScore?: number | null;

  @ApiProperty({ example: '2024-01-01T00:00:00Z', required: false, nullable: true })
  @IsOptional()
  @IsDateString()
  reviewedAt?: string | null;

  @ApiProperty({ example: 'John Doe', required: false, nullable: true })
  @IsOptional()
  @IsString()
  reviewerName?: string | null;

  @ApiProperty({ example: 'Overall comments', required: false, nullable: true })
  @IsOptional()
  @IsString()
  reviewComments?: string | null;
}

export class UserAssessmentSessionsQueryDto {
  @ApiProperty({ example: 1, required: false })
  @IsOptional()
  @IsNumber()
  page?: number;

  @ApiProperty({ example: 10, required: false })
  @IsOptional()
  @IsNumber()
  limit?: number;

  @ApiProperty({ 
    example: 'submitted', 
    required: false,
    description: 'Filter by status'
  })
  @IsOptional()
  @IsString()
  finalStatus?: string;
}

export enum ReviewStage {
  ADMIN_VALIDATION = 'admin_validation',
  JURY_SCORING = 'jury_scoring',
  JURY_DELIBERATION = 'jury_deliberation',
  FINAL_DECISION = 'final_decision'
}

export enum ReviewDecision {
  APPROVE = 'approve',
  REJECT = 'reject',
  REQUEST_REVISION = 'request_revision',
  PASS_TO_JURY = 'pass_to_jury',
  NEEDS_DELIBERATION = 'needs_deliberation'
}

export class AssessmentReviewCommentDto {
  @ApiProperty({ description: 'Question ID for the comment' })
  @IsNumber()
  questionId: number;

  @ApiProperty({ description: 'Comment text' })
  @IsString()
  comment: string;

  @ApiProperty({ description: 'Whether this is a critical issue', default: false })
  @IsOptional()
  @IsBoolean()
  isCritical?: boolean;

  @ApiProperty({ description: 'Review stage when comment was made', enum: ReviewStage })
  @IsEnum(ReviewStage)
  @IsOptional()
  stage?: ReviewStage;
}

export class AssessmentJuryScoreDto {
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

export class CreateAssessmentReviewDto {
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

  @ApiProperty({ description: 'Specific comments for questions', type: [AssessmentReviewCommentDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AssessmentReviewCommentDto)
  @IsOptional()
  questionComments?: AssessmentReviewCommentDto[];

  @ApiProperty({ description: 'Jury scores for questions', type: [AssessmentJuryScoreDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AssessmentJuryScoreDto)
  @IsOptional()
  juryScores?: AssessmentJuryScoreDto[];

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

export class AssessmentReviewResponseDto {
  @ApiProperty({ example: 1 })
  @IsNumber()
  reviewId: number;

  @ApiProperty({ example: 1 })
  @IsNumber()
  sessionId: number;

  @ApiProperty({ example: 1 })
  @IsNumber()
  reviewerId: number;

  @ApiProperty({ example: 'admin_validation' })
  @IsString()
  stage: string;

  @ApiProperty({ example: 'approve' })
  @IsString()
  decision: string;

  @ApiProperty({ example: 'Overall comments', required: false })
  @IsOptional()
  @IsString()
  overallComments?: string;

  @ApiProperty({ example: 85.5, required: false })
  @IsOptional()
  @IsNumber()
  totalScore?: number;

  @ApiProperty({ example: 'Deliberation notes', required: false })
  @IsOptional()
  @IsString()
  deliberationNotes?: string;

  @ApiProperty({ example: 'Internal notes', required: false })
  @IsOptional()
  @IsString()
  internalNotes?: string;

  @ApiProperty({ example: '2024-01-01T00:00:00Z' })
  @IsDateString()
  reviewedAt: string;

  @ApiProperty({ example: 'John Doe' })
  @IsString()
  reviewerName: string;

  @ApiProperty({ example: 'Assessment review created successfully' })
  @IsString()
  message: string;

  @ApiProperty({ example: true })
  @IsBoolean()
  isNewReview: boolean;

  @ApiProperty({ example: 5 })
  @IsNumber()
  totalCommentsAdded: number;

  @ApiProperty({ example: 3 })
  @IsNumber()
  totalScoresAdded: number;
}

export class BatchAssessmentReviewDto {
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

  @ApiProperty({ description: 'Specific comments for questions', type: [AssessmentReviewCommentDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AssessmentReviewCommentDto)
  @IsOptional()
  questionComments?: AssessmentReviewCommentDto[];

  @ApiProperty({ description: 'Jury scores for questions', type: [AssessmentJuryScoreDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AssessmentJuryScoreDto)
  @IsOptional()
  juryScores?: AssessmentJuryScoreDto[];

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

  @ApiProperty({ 
    description: 'Whether to update existing review or create new one',
    default: false 
  })
  @IsOptional()
  @IsBoolean()
  updateExisting?: boolean;
}

export class BatchAssessmentReviewResponseDto {
  @ApiProperty({ example: 1 })
  @IsNumber()
  reviewId: number;

  @ApiProperty({ example: 1 })
  @IsNumber()
  sessionId: number;

  @ApiProperty({ example: 1 })
  @IsNumber()
  reviewerId: number;

  @ApiProperty({ example: 'admin_validation' })
  @IsString()
  stage: string;

  @ApiProperty({ example: 'approve' })
  @IsString()
  decision: string;

  @ApiProperty({ example: 'Overall assessment is well-structured', required: false })
  @IsOptional()
  @IsString()
  overallComments?: string;

  @ApiProperty({ example: 85.5, required: false })
  @IsOptional()
  @IsNumber()
  totalScore?: number;

  @ApiProperty({ example: '2024-01-01T00:00:00Z' })
  @IsDateString()
  reviewedAt: string;

  @ApiProperty({ example: 'John Reviewer' })
  @IsString()
  reviewerName: string;

  @ApiProperty({ example: 'Assessment review created successfully' })
  @IsString()
  message: string;

  @ApiProperty({ example: true })
  @IsBoolean()
  isNewReview: boolean;

  @ApiProperty({ example: 5 })
  @IsNumber()
  totalCommentsAdded: number;

  @ApiProperty({ example: 3 })
  @IsNumber()
  totalScoresAdded: number;
}
