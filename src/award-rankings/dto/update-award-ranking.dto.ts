import { IsInt, IsOptional, Min, Max } from 'class-validator';

export class UpdateAwardRankingDto {
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  relevansiProgram?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  dampakCapaianNyata?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  inklusivitas?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  keberlanjutan?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  inovasiPotensiReplikasi?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  kualitasPresentasi?: number;
}
