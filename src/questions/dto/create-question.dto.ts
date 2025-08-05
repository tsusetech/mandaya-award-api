import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsBoolean, IsNotEmpty, IsOptional, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { CreateQuestionOptionDto } from './question-option.dto';

export class CreateQuestionDto {
  @ApiProperty({ 
    example: 'Berapakah jumlah penduduk miskin pada tahun 2022?', 
    description: 'Question text' 
  })
  @IsString()
  @IsNotEmpty()
  questionText: string;

  @ApiProperty({ 
    example: 'numeric-open', 
    description: 'Input type (e.g., text-open, numeric-open, checkbox, multiple-choice)' 
  })
  @IsString()
  @IsNotEmpty()
  inputType: string;

  @ApiProperty({ 
    example: true, 
    description: 'Whether the question is required' 
  })
  @IsBoolean()
  isRequired: boolean;

  @ApiProperty({ 
    type: [CreateQuestionOptionDto], 
    description: 'Options for checkbox and multiple-choice questions',
    required: false 
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateQuestionOptionDto)
  options?: CreateQuestionOptionDto[];
}

export class UpdateQuestionDto {
  @ApiProperty({ 
    example: 'Berapakah jumlah penduduk miskin pada tahun 2022?', 
    description: 'Question text',
    required: false 
  })
  @IsOptional()
  @IsString()
  questionText?: string;

  @ApiProperty({ 
    example: 'numeric-open', 
    description: 'Input type (e.g., text-open, numeric-open, checkbox, multiple-choice)',
    required: false 
  })
  @IsOptional()
  @IsString()
  inputType?: string;

  @ApiProperty({ 
    example: true, 
    description: 'Whether the question is required',
    required: false 
  })
  @IsOptional()
  @IsBoolean()
  isRequired?: boolean;

  @ApiProperty({ 
    type: [UpdateQuestionOptionDto], 
    description: 'Options for checkbox and multiple-choice questions',
    required: false 
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateQuestionOptionDto)
  options?: UpdateQuestionOptionDto[];
}

export class QuestionOptionResponseDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 1 })
  questionId: number;

  @ApiProperty({ example: 'Sangat Setuju' })
  optionText: string;

  @ApiProperty({ example: 'very_agree' })
  optionValue: string;

  @ApiProperty({ example: 1 })
  orderNumber: number;

  @ApiProperty({ example: true, required: false })
  isCorrect?: boolean;

  @ApiProperty({ example: true })
  isActive: boolean;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  updatedAt: Date;
}