import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsBoolean, IsOptional, IsPositive, IsString, IsEnum } from 'class-validator';
import { QuestionInputType } from './assessment-question.dto';

export class AssessmentAnswerDto {
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
    example: QuestionInputType.TEXT_OPEN,
    description: 'Question input type',
    required: false
  })
  @IsOptional()
  @IsEnum(QuestionInputType)
  inputType?: QuestionInputType;

  @ApiProperty({ example: false, description: 'Whether this is a draft save' })
  @IsBoolean()
  isDraft: boolean;

  @ApiProperty({ example: true, description: 'Whether this response is complete', required: false })
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
