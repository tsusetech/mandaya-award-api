import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsBoolean, IsOptional, IsPositive } from 'class-validator';

export class AutoSaveDto {
  @ApiProperty({ example: 1, description: 'Question ID' })
  @IsNumber()
  @IsPositive()
  questionId: number;

  @ApiProperty({
    example: 'Soekarno',
    description: 'Response value (can be string, number, boolean, or array)',
  })
  value: any;

  @ApiProperty({ example: true, description: 'Whether this is a draft save' })
  @IsBoolean()
  isDraft: boolean;

  @ApiProperty({
    example: false,
    description: 'Whether this response is complete',
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  isComplete?: boolean;

  @ApiProperty({
    example: 30,
    description: 'Time spent on question in seconds',
    required: false,
  })
  @IsOptional()
  @IsNumber()
  timeSpent?: number;
}

export class BatchAutoSaveDto {
  @ApiProperty({
    type: [AutoSaveDto],
    description: 'Array of responses to save',
  })
  responses: AutoSaveDto[];

  @ApiProperty({
    example: 2,
    description: 'Current question ID',
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  currentQuestionId?: number;
}

export class AutoSaveResultDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ example: 3 })
  autoSaveVersion: number;

  @ApiProperty({ example: '2024-01-01T00:05:00.000Z' })
  lastSaved: Date;

  @ApiProperty({
    example: false,
    description: 'Whether the response is complete',
  })
  isComplete: boolean;
}

export class BatchAutoSaveResultDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ example: 5 })
  savedCount: number;

  @ApiProperty({ example: '2024-01-01T00:05:00.000Z' })
  lastSaved: Date;
}

export class ProgressResultDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ example: 85 })
  progressPercentage: number;

  @ApiProperty({ type: Object, required: false })
  nextQuestion?: any;
}
