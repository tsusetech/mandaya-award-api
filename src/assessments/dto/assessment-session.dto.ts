import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsString, IsBoolean, IsOptional, IsArray, IsDateString, IsEnum } from 'class-validator';
import { AssessmentQuestionDto } from './assessment-question.dto';
import { CombinedStatus } from './combined-status.enum';

export enum AssessmentStatus {
  DRAFT = 'draft',
  IN_PROGRESS = 'in_progress',
  PAUSED = 'paused',
  COMPLETED = 'completed',
  SUBMITTED = 'submitted'
}

export class AssessmentSessionDto {
  @ApiProperty({ example: 1 })
  @IsNumber()
  id: number;

  @ApiProperty({ example: 1 })
  @IsNumber()
  userId: number;

  @ApiProperty({ example: 1 })
  @IsNumber()
  groupId: number;

  @ApiProperty({ example: 'Award Assessment 2024' })
  @IsString()
  groupName: string;

  @ApiProperty({ enum: AssessmentStatus, example: AssessmentStatus.IN_PROGRESS })
  @IsString()
  status: AssessmentStatus;

  @ApiProperty({ 
    enum: CombinedStatus, 
    example: CombinedStatus.IN_PROGRESS,
    description: 'Combined status that represents the overall state of the assessment'
  })
  @IsEnum(CombinedStatus)
  combinedStatus: CombinedStatus;

  @ApiProperty({ example: 75 })
  @IsNumber()
  progressPercentage: number;

  @ApiProperty({ example: true })
  @IsBoolean()
  autoSaveEnabled: boolean;

  @ApiProperty({ example: 1 })
  @IsOptional()
  @IsNumber()
  currentQuestionId?: number;

  @ApiProperty({ type: [AssessmentQuestionDto] })
  @IsArray()
  questions: AssessmentQuestionDto[];

  @ApiProperty({ example: '2024-01-01T00:00:00Z' })
  @IsDateString()
  startedAt: string;

  @ApiProperty({ example: '2024-01-01T00:00:00Z', required: false })
  @IsOptional()
  @IsDateString()
  lastAutoSaveAt?: string;

  @ApiProperty({ example: '2024-01-01T00:00:00Z' })
  @IsDateString()
  lastActivityAt: string;

  @ApiProperty({ example: '2024-01-01T00:00:00Z', required: false })
  @IsOptional()
  @IsDateString()
  completedAt?: string;

  @ApiProperty({ example: '2024-01-01T00:00:00Z', required: false })
  @IsOptional()
  @IsDateString()
  submittedAt?: string;
}

export class AssessmentSessionDetailDto {
  @ApiProperty({ example: 1 })
  @IsNumber()
  id: number;

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

  @ApiProperty({ example: 75 })
  @IsNumber()
  progressPercentage: number;

  @ApiProperty({ example: true })
  @IsBoolean()
  autoSaveEnabled: boolean;

  @ApiProperty({ example: 1, required: false })
  @IsOptional()
  @IsNumber()
  currentQuestionId?: number;

  @ApiProperty({ type: [AssessmentQuestionDto] })
  @IsArray()
  questions: AssessmentQuestionDto[];

  @ApiProperty({ example: '2024-01-01T00:00:00Z' })
  @IsDateString()
  startedAt: string;

  @ApiProperty({ example: '2024-01-01T00:00:00Z', required: false })
  @IsOptional()
  @IsDateString()
  lastAutoSaveAt?: string;

  @ApiProperty({ example: '2024-01-01T00:00:00Z' })
  @IsDateString()
  lastActivityAt: string;

  @ApiProperty({ example: '2024-01-01T00:00:00Z', required: false })
  @IsOptional()
  @IsDateString()
  completedAt?: string;

  @ApiProperty({ example: '2024-01-01T00:00:00Z', required: false })
  @IsOptional()
  @IsDateString()
  submittedAt?: string;

  // Review-related fields
  @ApiProperty({ example: 'pending', required: false, nullable: true })
  @IsOptional()
  @IsString()
  reviewStatus?: string | null;

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
