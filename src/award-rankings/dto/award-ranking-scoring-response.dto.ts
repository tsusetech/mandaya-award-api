import { ApiProperty } from '@nestjs/swagger';

export class AwardRankingScoringResponseDto {
  @ApiProperty({ example: 1, description: 'Scoring ID' })
  id: number;

  @ApiProperty({ example: 1, description: 'Award ranking ID' })
  awardRankingId: number;

  @ApiProperty({ example: 123, description: 'Jury member ID' })
  juryId: number;

  @ApiProperty({ example: 'jury@example.com', description: 'Jury member email' })
  juryEmail: string;

  @ApiProperty({ example: 'Jury Member 1', description: 'Jury member name' })
  juryName: string;

  @ApiProperty({ example: 4, description: 'Program relevance score (1-5)', minimum: 1, maximum: 5 })
  relevansiProgram: number;

  @ApiProperty({ example: 5, description: 'Actual achievement impact score (1-5)', minimum: 1, maximum: 5 })
  dampakCapaianNyata: number;

  @ApiProperty({ example: 3, description: 'Inclusiveness score (1-5)', minimum: 1, maximum: 5 })
  inklusivitas: number;

  @ApiProperty({ example: 4, description: 'Sustainability score (1-5)', minimum: 1, maximum: 5 })
  keberlanjutan: number;

  @ApiProperty({ example: 5, description: 'Innovation and replication potential score (1-5)', minimum: 1, maximum: 5 })
  inovasiPotensiReplikasi: number;

  @ApiProperty({ example: 4, description: 'Presentation quality score (1-5)', minimum: 1, maximum: 5 })
  kualitasPresentasi: number;

  @ApiProperty({ example: '2024-01-15T10:30:00.000Z', description: 'Creation timestamp' })
  createdAt: Date;

  @ApiProperty({ example: '2024-01-15T11:45:00.000Z', description: 'Last update timestamp' })
  updatedAt: Date;
}
