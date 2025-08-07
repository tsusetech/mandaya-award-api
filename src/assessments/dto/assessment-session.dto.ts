import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsString, IsBoolean, IsOptional, IsArray, IsDateString } from 'class-validator';
import { AssessmentQuestionDto } from './assessment-question.dto';

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
