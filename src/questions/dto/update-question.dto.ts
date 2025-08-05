import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsBoolean, IsOptional, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { UpdateQuestionOptionDto } from './question-option.dto';

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
    example: 'Masukkan data jumlah penduduk miskin berdasarkan data BPS terbaru', 
    description: 'Additional description or instructions for the question',
    required: false 
  })
  @IsOptional()
  @IsString()
  description?: string;

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