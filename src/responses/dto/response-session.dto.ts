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
  status: string;

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

  @ApiProperty({ 
    type: [QuestionResponseDto], 
    required: false,
    description: 'Array of user responses to questions'
  })
  responses?: QuestionResponseDto[];
}