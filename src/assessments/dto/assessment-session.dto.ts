import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsString, IsBoolean, IsOptional, IsArray, IsDateString } from 'class-validator';
import { AssessmentQuestionDto } from './assessment-question.dto';

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

  @ApiProperty({ example: 'submitted' })
  @IsString()
  status: string;

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

  // Review-related fields
  @ApiProperty({ example: 'admin_validation', required: false })
  @IsOptional()
  @IsString()
  reviewStage?: string | null;

  @ApiProperty({ example: 'approve', required: false })
  @IsOptional()
  @IsString()
  reviewDecision?: string | null;

  @ApiProperty({ example: 85.5, required: false })
  @IsOptional()
  @IsNumber()
  reviewScore?: number | null;

  @ApiProperty({ example: '2024-01-01T00:00:00Z', required: false })
  @IsOptional()
  @IsDateString()
  reviewedAt?: string | null;

  @ApiProperty({ example: 'John Doe', required: false })
  @IsOptional()
  @IsString()
  reviewerName?: string | null;

  @ApiProperty({ example: 'Overall comments', required: false })
  @IsOptional()
  @IsString()
  reviewComments?: string | null;
}

// Add AssessmentSessionDetailDto as an alias
export type AssessmentSessionDetailDto = AssessmentSessionDto;
