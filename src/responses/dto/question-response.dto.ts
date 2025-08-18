import { ApiProperty } from '@nestjs/swagger';

export class QuestionResponseDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 1 })
  sessionId: number;

  @ApiProperty({ example: 1 })
  questionId: number;

  @ApiProperty({ example: 1 })
  groupQuestionId: number;

  @ApiProperty({ example: 'Soekarno', required: false })
  textValue?: string;

  @ApiProperty({ example: 25.5, required: false })
  numericValue?: number;

  @ApiProperty({ example: true, required: false })
  booleanValue?: boolean;

  @ApiProperty({ example: ['option1', 'option2'], required: false })
  arrayValue?: any;

  @ApiProperty({ example: true })
  isDraft: boolean;

  @ApiProperty({ example: false })
  isComplete: boolean;

  @ApiProperty({ example: false })
  isSkipped: boolean;

  @ApiProperty({ example: 3 })
  autoSaveVersion: number;

  @ApiProperty({ example: 120 })
  timeSpentSeconds: number;

  @ApiProperty({ example: '2024-01-01T00:05:00.000Z' })
  lastModifiedAt: Date;

  @ApiProperty({ example: '2024-01-01T00:02:00.000Z', required: false })
  firstAnsweredAt?: Date;

  @ApiProperty({ example: '2024-01-01T00:10:00.000Z', required: false })
  finalizedAt?: Date;

  @ApiProperty({ required: false })
  validationErrors?: any;

  @ApiProperty({ required: false })
  metadata?: any;
}
