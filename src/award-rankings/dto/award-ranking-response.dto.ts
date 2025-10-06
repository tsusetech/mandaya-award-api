import { ApiProperty } from '@nestjs/swagger';
import { AwardRankingScoringResponseDto } from './award-ranking-scoring-response.dto';

export class AwardRankingResponseDto {
  @ApiProperty({ example: 1, description: 'Award ranking ID' })
  id: number;

  @ApiProperty({ example: 155, description: 'Session ID' })
  sessionId: number;

  @ApiProperty({ example: 456, description: 'User ID' })
  userId: number;

  @ApiProperty({ example: 'participant@example.com', description: 'User email' })
  userEmail: string;

  @ApiProperty({ example: 'John Doe', description: 'User name' })
  userName: string;

  @ApiProperty({ example: 1, description: 'Group ID' })
  groupId: number;

  @ApiProperty({ example: 'Poverty Reduction Program', description: 'Group name' })
  groupName: string;

  @ApiProperty({ example: 3, description: 'Number of juries who scored this ranking' })
  juryCount: number;

  @ApiProperty({
    example: {
      relevansiProgram: 4.33,
      dampakCapaianNyata: 4.67,
      inklusivitas: 3.67,
      keberlanjutan: 4.33,
      inovasiPotensiReplikasi: 4.67,
      kualitasPresentasi: 4.33,
      socialEnvironmentEngagement: 4.0,
      biokulturalEngagement: 3.5,
      overall: 4.33
    },
    description: 'Average scores across all juries'
  })
  averageScores: {
    relevansiProgram: number;
    dampakCapaianNyata: number;
    inklusivitas: number;
    keberlanjutan: number;
    inovasiPotensiReplikasi: number;
    kualitasPresentasi: number;
    socialEnvironmentEngagement: number;
    biokulturalEngagement: number;
    overall: number;
  };

  @ApiProperty({ type: [AwardRankingScoringResponseDto], description: 'Individual jury scoring details' })
  scoringDetails: AwardRankingScoringResponseDto[];

  @ApiProperty({ example: '2024-01-15T10:30:00.000Z', description: 'Creation timestamp' })
  createdAt: Date;

  @ApiProperty({ example: '2024-01-15T11:45:00.000Z', description: 'Last update timestamp' })
  updatedAt: Date;
}
