import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsString, IsOptional, IsDateString } from 'class-validator';
import { AssessmentStatus } from './assessment-session.dto';

export class UserAssessmentSessionDto {
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
    description: 'Filter by assessment status',
    required: false
  })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiProperty({ 
    example: 'pending', 
    description: 'Filter by review status',
    required: false
  })
  @IsOptional()
  @IsString()
  reviewStatus?: string;

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
