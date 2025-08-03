import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsBoolean, IsOptional } from 'class-validator';

export class UpdateQuestionDto {
  @ApiProperty({ 
    example: 'Berapa total anggaran pendidikan pada tahun 2023?', 
    description: 'Question text', 
    required: false 
  })
  @IsString()
  @IsOptional()
  questionText?: string;

  @ApiProperty({ 
    example: 'numeric-open', 
    description: 'Input type (e.g., text-open, numeric-open, checkbox, multiple-choice)', 
    required: false 
  })
  @IsString()
  @IsOptional()
  inputType?: string;

  @ApiProperty({ example: false, description: 'Whether the question is required', required: false })
  @IsBoolean()
  @IsOptional()
  isRequired?: boolean;
}