import { IsInt, IsOptional, Min, Max } from 'class-validator';

export class UpdateAwardRankingDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  relevansiProgram?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  dampakCapaianNyata?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  inklusivitas?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  keberlanjutan?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  inovasiPotensiReplikasi?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  kualitasPresentasi?: number;
}
