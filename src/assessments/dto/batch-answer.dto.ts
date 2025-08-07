import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsOptional, IsNumber, IsPositive } from 'class-validator';
import { AssessmentAnswerDto } from './assessment-answer.dto';

export class BatchAnswerDto {
  @ApiProperty({ type: [AssessmentAnswerDto], description: 'Array of answers to save' })
  @IsArray()
  answers: AssessmentAnswerDto[];

  @ApiProperty({ example: 2, description: 'Current question ID', required: false })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  currentQuestionId?: number;
}
