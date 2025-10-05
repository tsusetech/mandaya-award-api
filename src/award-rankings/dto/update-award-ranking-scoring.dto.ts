import { IsInt, IsOptional, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateAwardRankingScoringDto {
  @ApiProperty({
    description: 'Program relevance score (1-5)',
    example: 4,
    minimum: 1,
    maximum: 5,
    type: 'integer',
    required: false
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  relevansiProgram?: number;

  @ApiProperty({
    description: 'Actual achievement impact score (1-5)',
    example: 5,
    minimum: 1,
    maximum: 5,
    type: 'integer',
    required: false
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  dampakCapaianNyata?: number;

  @ApiProperty({
    description: 'Inclusiveness score (1-5)',
    example: 3,
    minimum: 1,
    maximum: 5,
    type: 'integer',
    required: false
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  inklusivitas?: number;

  @ApiProperty({
    description: 'Sustainability score (1-5)',
    example: 4,
    minimum: 1,
    maximum: 5,
    type: 'integer',
    required: false
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  keberlanjutan?: number;

  @ApiProperty({
    description: 'Innovation and replication potential score (1-5)',
    example: 5,
    minimum: 1,
    maximum: 5,
    type: 'integer',
    required: false
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  inovasiPotensiReplikasi?: number;

  @ApiProperty({
    description: 'Presentation quality score (1-5)',
    example: 4,
    minimum: 1,
    maximum: 5,
    type: 'integer',
    required: false
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  kualitasPresentasi?: number;
}
