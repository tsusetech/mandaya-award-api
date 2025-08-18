import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  IsOptional,
  IsNumber,
  IsPositive,
  Min,
  Max,
} from 'class-validator';
import { AssessmentAnswerDto } from './assessment-answer.dto';

export class BatchAnswerDto {
  @ApiProperty({
    type: [AssessmentAnswerDto],
    description: 'Array of answers to save',
  })
  @IsArray()
  answers: AssessmentAnswerDto[];

  @ApiProperty({
    example: 2,
    description: 'Current question ID',
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  currentQuestionId?: number;

  @ApiProperty({
    example: 50,
    description: 'Calculated progress percentage for the entire batch (0-100)',
    required: false,
    minimum: 0,
    maximum: 100,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  progressPercentage?: number;
}
