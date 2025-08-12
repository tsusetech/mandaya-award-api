import { ApiProperty } from '@nestjs/swagger';
import { QuestionResponseDto } from './question-response.dto';

export class ResponseSessionDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 1 })
  userId: number;

  @ApiProperty({ example: 1 })
  groupId: number;

  @ApiProperty({ example: 'in_progress' })
  status: string; // Just use the latest status from StatusProgress

  @ApiProperty({ example: 2, required: false })
  currentQuestionId?: number;

  @ApiProperty({ example: 0 })
  progressPercentage: number;

  @ApiProperty({ example: true })
  autoSaveEnabled: boolean;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  startedAt: Date;

  @ApiProperty({ example: '2024-01-01T00:05:00.000Z', required: false })
  lastAutoSaveAt?: Date;

  @ApiProperty({ example: '2024-01-01T00:05:30.000Z' })
  lastActivityAt: Date;

  @ApiProperty({ example: '2024-01-01T00:30:00.000Z', required: false })
  completedAt?: Date;

  @ApiProperty({ example: '2024-01-01T00:31:00.000Z', required: false })
  submittedAt?: Date;

  // Review-related fields
  @ApiProperty({ example: 1, required: false })
  reviewerId?: number;

  @ApiProperty({ example: 'admin_validation', required: false })
  stage?: string;

  @ApiProperty({ example: 'approve', required: false })
  decision?: string;

  @ApiProperty({ example: 'Overall comments', required: false })
  overallComments?: string;

  @ApiProperty({ example: 85.5, required: false })
  totalScore?: number;

  @ApiProperty({ example: 'Deliberation notes', required: false })
  deliberationNotes?: string;

  @ApiProperty({ example: 'Internal notes', required: false })
  internalNotes?: string;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z', required: false })
  reviewedAt?: Date;

  @ApiProperty({ 
    type: [QuestionResponseDto], 
    required: false,
    description: 'Array of user responses to questions'
  })
  responses?: QuestionResponseDto[];
}