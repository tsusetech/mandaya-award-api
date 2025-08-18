import { ApiProperty } from '@nestjs/swagger';
import {
  IsNumber,
  IsString,
  IsBoolean,
  IsOptional,
  IsArray,
  IsEnum,
  IsDecimal,
} from 'class-validator';
import { ReviewCommentDto } from './review-comment.dto';

export enum QuestionInputType {
  TEXT_OPEN = 'text-open',
  NUMERIC_OPEN = 'numeric-open',
  CHECKBOX = 'checkbox',
  MULTIPLE_CHOICE = 'multiple-choice',
  FILE_UPLOAD = 'file-upload',
}

export class QuestionCategoryDto {
  @ApiProperty({ example: 1 })
  @IsNumber()
  id: number;

  @ApiProperty({ example: 'Economic Impact' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'Questions related to economic impact assessment' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 1.5 })
  @IsOptional()
  weight?: number;

  @ApiProperty({ example: 0 })
  @IsOptional()
  minValue?: number;

  @ApiProperty({ example: 100 })
  @IsOptional()
  maxValue?: number;

  @ApiProperty({ example: 'number' })
  @IsString()
  scoreType: string;
}

export class QuestionOptionDto {
  @ApiProperty({ example: 1 })
  @IsNumber()
  id: number;

  @ApiProperty({ example: 'Option 1' })
  @IsString()
  optionText: string;

  @ApiProperty({ example: 'option1' })
  @IsString()
  optionValue: string;

  @ApiProperty({ example: 1 })
  @IsNumber()
  orderNumber: number;

  @ApiProperty({ example: false })
  @IsBoolean()
  isMultipleChoice?: boolean;

  @ApiProperty({ example: false })
  @IsBoolean()
  isCheckBox?: boolean;
}

export class AssessmentQuestionDto {
  @ApiProperty({ example: 1 })
  @IsNumber()
  id: number;

  @ApiProperty({ example: 'What is your organization name?' })
  @IsString()
  questionText: string;

  @ApiProperty({ example: 'Please provide the full legal name' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 'text-open' })
  @IsString()
  inputType: string;

  @ApiProperty({ example: true })
  @IsBoolean()
  isRequired: boolean;

  @ApiProperty({ example: 1 })
  @IsNumber()
  orderNumber: number;

  @ApiProperty({ example: 'Personal Information' })
  @IsOptional()
  @IsString()
  sectionTitle?: string;

  @ApiProperty({ example: 'Basic Info' })
  @IsOptional()
  @IsString()
  subsection?: string;

  @ApiProperty({ example: false })
  @IsBoolean()
  isGrouped: boolean;

  @ApiProperty({ type: QuestionCategoryDto, required: false })
  @IsOptional()
  category?: QuestionCategoryDto;

  @ApiProperty({ type: [QuestionOptionDto], required: false })
  @IsOptional()
  @IsArray()
  options?: QuestionOptionDto[];

  // Response data (if user has already answered)
  @ApiProperty({ required: false })
  @IsOptional()
  response?: any;

  @ApiProperty({ example: false })
  @IsOptional()
  @IsBoolean()
  isAnswered?: boolean;

  @ApiProperty({ example: false })
  @IsOptional()
  @IsBoolean()
  isSkipped?: boolean;

  // Review comments for this question
  @ApiProperty({ type: [ReviewCommentDto], required: false })
  @IsOptional()
  @IsArray()
  reviewComments?: ReviewCommentDto[];
}
