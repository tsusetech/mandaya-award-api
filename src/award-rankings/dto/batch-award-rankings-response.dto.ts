import { ApiProperty } from '@nestjs/swagger';
import { AwardRankingResponseDto } from './award-ranking-response.dto';

export class BatchAwardRankingsResponseDto {
  @ApiProperty({ example: 40, description: 'Number of successfully created rankings' })
  success: number;

  @ApiProperty({ example: 2, description: 'Number of failed rankings' })
  failed: number;

  @ApiProperty({
    example: {
      success: [
        {
          id: 1,
          sessionId: 155,
          userId: 456,
          userEmail: 'participant@example.com',
          userName: 'John Doe',
          groupId: 1,
          groupName: 'Poverty Reduction Program',
          juryCount: 0,
          averageScores: {
            relevansiProgram: 0,
            dampakCapaianNyata: 0,
            inklusivitas: 0,
            keberlanjutan: 0,
            inovasiPotensiReplikasi: 0,
            kualitasPresentasi: 0,
            overall: 0
          },
          scoringDetails: [],
          createdAt: '2024-01-15T10:30:00.000Z',
          updatedAt: '2024-01-15T10:30:00.000Z'
        }
      ],
      failed: [
        {
          sessionId: 160,
          error: 'Award ranking already exists for session 160'
        }
      ]
    },
    description: 'Detailed results of batch creation'
  })
  results: {
    success: AwardRankingResponseDto[];
    failed: {
      sessionId: number;
      error: string;
    }[];
  };
}
