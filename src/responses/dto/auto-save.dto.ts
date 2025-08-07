import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsBoolean, IsOptional, IsPositive, IsEnum } from 'class-validator';
import { QuestionInputType } from '../../assessments/dto/assessment-question.dto';

export class AutoSaveDto {
  @ApiProperty({ example: 1, description: 'Question ID' })
  @IsNumber()
  @IsPositive()
  questionId: number;

  @ApiProperty({ 
    example: 'Soekarno', 
    description: 'Response value (can be string, number, boolean, or array)' 
  })
  value: any;

  @ApiProperty({ 
    enum: QuestionInputType, 
    example: QuestionInputType.NUMERIC_OPEN,
    description: 'Type of input for this question' 
  })
  @IsEnum(QuestionInputType)
  inputType: QuestionInputType;

  @ApiProperty({ example: true, description: 'Whether this is a draft save' })
  @IsBoolean()
  isDraft: boolean;

  @ApiProperty({ example: false, description: 'Whether this response is complete', required: false })
  @IsOptional()
  @IsBoolean()
  isComplete?: boolean;

  @ApiProperty({ example: false, description: 'Whether this question is skipped', required: false })
  @IsOptional()
  @IsBoolean()
  isSkipped?: boolean;

  @ApiProperty({ example: 30, description: 'Time spent on question in seconds', required: false })
  @IsOptional()
  @IsNumber()
  timeSpent?: number;
}

export class BatchAutoSaveDto {
  @ApiProperty({ type: [AutoSaveDto], description: 'Array of responses to save' })
  responses: AutoSaveDto[];

  @ApiProperty({ example: 2, description: 'Current question ID', required: false })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  currentQuestionId?: number;
}