import { IsString, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateCategoryDto {
  @ApiProperty({ 
    example: 'Technology', 
    description: 'Category name (must be unique)' 
  })
  @IsString()
  name: string;

  @ApiProperty({ 
    example: 'Technology related questions and assessments', 
    description: 'Category description',
    required: false
  })
  @IsOptional()
  @IsString()
  description?: string;
}
