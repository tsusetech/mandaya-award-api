import { ApiProperty } from '@nestjs/swagger';
import {
  IsNumber,
  IsString,
  IsOptional,
  IsDateString,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class JuryRankingItemDto {
  @ApiProperty({ example: 1 })
  @IsNumber()
  id: number;

  @ApiProperty({ example: 1 })
  @IsNumber()
  sessionId: number;

  @ApiProperty({ example: 'PT Telkom Indonesia' })
  @IsString()
  groupName: string;

  @ApiProperty({ example: 'Direktur Utama PT Telkom • dirut@telkom.co.id' })
  @IsString()
  participantInfo: string;

  @ApiProperty({ example: 93.7 })
  @IsNumber()
  score: number;

  @ApiProperty({ example: '2025-08-21T00:00:00Z' })
  @IsDateString()
  submittedAt: string;

  @ApiProperty({ example: '2025-08-24T00:00:00Z' })
  @IsDateString()
  lastReviewedAt: string;

  @ApiProperty({ example: 1 })
  @IsNumber()
  rank: number;

  @ApiProperty({ example: 'gold' })
  @IsString()
  trophyType: string;
}

export class JuryRankingCategoryDto {
  @ApiProperty({ example: 'BUMN/Swasta' })
  @IsString()
  categoryName: string;

  @ApiProperty({ example: 'Mitra Nonpemerintah' })
  @IsString()
  subCategory: string;

  @ApiProperty({ type: [JuryRankingItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => JuryRankingItemDto)
  rankings: JuryRankingItemDto[];
}

export class JuryRankingsResponseDto {
  @ApiProperty({ example: 9 })
  @IsNumber()
  totalNominations: number;

  @ApiProperty({ type: [JuryRankingCategoryDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => JuryRankingCategoryDto)
  categories: JuryRankingCategoryDto[];
}

export class JuryRankingsQueryDto {
  @ApiProperty({
    required: false,
    description: 'Search by group name, participant, category, or nomination',
    example: 'Telkom',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiProperty({
    required: false,
    description: 'Filter by category',
    example: 'All Categories',
  })
  @IsOptional()
  @IsString()
  category?: string;
}
