import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, IsBoolean, IsOptional, IsNotEmpty } from 'class-validator';

export class CreateQuestionOptionDto {
  @ApiProperty({ 
    example: 1, 
    description: 'The ID of the question this option belongs to' 
  })
  @IsNumber()
  @IsNotEmpty()
  questionId: number;

  @ApiProperty({ 
    example: 'Sangat Setuju', 
    description: 'The display text for the option' 
  })
  @IsString()
  @IsNotEmpty()
  optionText: string;

  @ApiProperty({ 
    example: 'very_agree', 
    description: 'The value that will be stored when this option is selected' 
  })
  @IsString()
  @IsNotEmpty()
  optionValue: string;

  @ApiProperty({ 
    example: 1, 
    description: 'Order number for maintaining the sequence of options' 
  })
  @IsNumber()
  orderNumber: number;

  @ApiProperty({ 
    example: true, 
    description: 'For multiple-choice questions, indicates if this is the correct answer',
    required: false 
  })
  @IsOptional()
  @IsBoolean()
  isCorrect?: boolean;
}

export class UpdateQuestionOptionDto {
  @ApiProperty({ 
    example: 'Sangat Setuju', 
    description: 'The display text for the option',
    required: false 
  })
  @IsOptional()
  @IsString()
  optionText?: string;

  @ApiProperty({ 
    example: 'very_agree', 
    description: 'The value that will be stored when this option is selected',
    required: false 
  })
  @IsOptional()
  @IsString()
  optionValue?: string;

  @ApiProperty({ 
    example: 1, 
    description: 'Order number for maintaining the sequence of options',
    required: false 
  })
  @IsOptional()
  @IsNumber()
  orderNumber?: number;

  @ApiProperty({ 
    example: true, 
    description: 'For multiple-choice questions, indicates if this is the correct answer',
    required: false 
  })
  @IsOptional()
  @IsBoolean()
  isCorrect?: boolean;

  @ApiProperty({ 
    example: true, 
    description: 'Whether the option is active',
    required: false 
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
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