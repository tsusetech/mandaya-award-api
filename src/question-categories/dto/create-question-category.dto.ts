import { IsString, IsOptional, IsNumber, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

export enum ScoreType {
  NUMBER = 'number',
  PERCENTAGE = 'percentage',
  CURRENCY = 'currency',
  RATING = 'rating',
  BOOLEAN = 'boolean',
}

export class CreateQuestionCategoryDto {
  @ApiProperty({
    example: 'Economic Impact',
    description: 'Question category name (must be unique)',
  })
  @IsString()
  name: string;

  @ApiProperty({
    example: 'Questions related to economic impact assessment',
    description: 'Question category description',
    required: false,
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    example: 1.5,
    description: 'Weight/score multiplier for this category',
    default: 1.0,
  })
  @IsOptional()
  @Transform(({ value }) => parseFloat(value))
  @IsNumber()
  weight?: number;

  @ApiProperty({
    example: 0,
    description: 'Minimum acceptable value for this category',
    required: false,
  })
  @IsOptional()
  @Transform(({ value }) => parseFloat(value))
  @IsNumber()
  minValue?: number;

  @ApiProperty({
    example: 100,
    description: 'Maximum acceptable value for this category',
    required: false,
  })
  @IsOptional()
  @Transform(({ value }) => parseFloat(value))
  @IsNumber()
  maxValue?: number;

  @ApiProperty({
    example: 'number',
    description: 'Type of scoring for this category',
    enum: ScoreType,
    default: 'number',
  })
  @IsOptional()
  @IsEnum(ScoreType)
  scoreType?: ScoreType;
}
