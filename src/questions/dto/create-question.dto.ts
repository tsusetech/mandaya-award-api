import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsBoolean, IsNotEmpty } from 'class-validator';

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
}