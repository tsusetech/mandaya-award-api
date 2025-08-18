import { ApiProperty } from '@nestjs/swagger';

export class ProgressSummaryDto {
  @ApiProperty({ example: 10 })
  totalQuestions: number;

  @ApiProperty({ example: 7 })
  answeredQuestions: number;

  @ApiProperty({ example: 1 })
  skippedQuestions: number;

  @ApiProperty({ example: 75 })
  progressPercentage: number;

  @ApiProperty({
    example: 300,
    description: 'Estimated time remaining in seconds',
    required: false,
  })
  estimatedTimeRemaining?: number;
}
