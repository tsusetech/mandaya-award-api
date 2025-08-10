import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsString, IsOptional, IsDateString, IsBoolean, IsArray, IsEnum, ValidateNested, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { AssessmentStatus } from './assessment-session.dto';
import { CombinedStatus } from './combined-status.enum';

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

  @ApiProperty({ enum: AssessmentStatus, example: AssessmentStatus.SUBMITTED })
  @IsString()
  status: AssessmentStatus;

  @ApiProperty({ 
    enum: CombinedStatus, 
    example: CombinedStatus.SUBMITTED,
    description: 'Combined status that represents the overall state of the assessment'
  })
  @IsString()
  combinedStatus: CombinedStatus;

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

  @ApiProperty({ example: 'pending', required: false, nullable: true })
  @IsOptional()
  @IsString()
  reviewStatus?: string | null;

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

  @ApiProperty({ example: 'John Reviewer', required: false, nullable: true })
  @IsOptional()
  @IsString()
  reviewerName?: string | null;

  @ApiProperty({ example: 'Overall comments about the assessment', required: false, nullable: true })
  @IsOptional()
  @IsString()
  reviewComments?: string | null;
}

export class UserAssessmentSessionsQueryDto {
  @ApiProperty({ 
    example: 1, 
    description: 'Page number (starts from 1)',
    required: false,
    default: 1
  })
  @IsOptional()
  page?: number = 1;

  @ApiProperty({ 
    example: 10, 
    description: 'Number of items per page',
    required: false,
    default: 10
  })
  @IsOptional()
  limit?: number = 10;

  @ApiProperty({ 
    example: 'submitted', 
    description: 'Filter by combined status (combines session and review statuses)',
    required: false,
    enum: CombinedStatus
  })
  @IsOptional()
  @IsEnum(CombinedStatus)
  combinedStatus?: CombinedStatus;

  @ApiProperty({ 
    example: 'admin_validation', 
    description: 'Filter by review stage',
    required: false
  })
  @IsOptional()
  @IsString()
  reviewStage?: string;

  @ApiProperty({ 
    example: 1, 
    description: 'Filter by group ID',
    required: false
  })
  @IsOptional()
  @IsNumber()
  groupId?: number;
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
  id: number;

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
