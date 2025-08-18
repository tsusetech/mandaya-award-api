import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CreateQuestionOptionDto } from './question-option.dto';

export class CreateQuestionDto {
  @ApiProperty({
    example: 'Berapakah jumlah penduduk miskin pada tahun 2022?',
    description: 'Question text',
  })
  @IsString()
  @IsNotEmpty()
  questionText: string;

  @ApiProperty({
    example:
      'Masukkan data jumlah penduduk miskin berdasarkan data BPS terbaru',
    description: 'Additional description or instructions for the question',
    required: false,
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    example: 'numeric-open',
    description:
      'Input type (e.g., text-open, numeric-open, checkbox, multiple-choice)',
  })
  @IsString()
  @IsNotEmpty()
  inputType: string;

  @ApiProperty({
    example: true,
    description: 'Whether the question is required',
  })
  @IsBoolean()
  isRequired: boolean;

  @ApiProperty({
    type: [CreateQuestionOptionDto],
    description: 'Options for checkbox and multiple-choice questions',
    required: false,
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateQuestionOptionDto)
  options?: CreateQuestionOptionDto[];
}
