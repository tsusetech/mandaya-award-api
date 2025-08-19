import { ApiProperty } from '@nestjs/swagger';
import { ScoreType } from './create-question-category.dto';

export class QuestionCategoryResponseDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'Economic Impact' })
  name: string;

  @ApiProperty({ example: 'Questions related to economic impact assessment' })
  description?: string | null;

  @ApiProperty({ example: 1.5 })
  weight: number;

  @ApiProperty({ example: 0 })
  minValue?: number | null;

  @ApiProperty({ example: 100 })
  maxValue?: number | null;

  @ApiProperty({ example: 'number', enum: ScoreType })
  scoreType: string;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  updatedAt: Date;

  @ApiProperty({ example: null, required: false })
  deletedAt?: Date | null;

  @ApiProperty({ example: null, required: false })
  deletedBy?: number | null;
}
