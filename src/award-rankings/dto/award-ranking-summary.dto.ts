import { AwardRankingScoringResponseDto } from './award-ranking-scoring-response.dto';

export class AwardRankingSummaryDto {
  sessionId: number;
  userId: number;
  userEmail: string;
  userName: string;
  groupId: number;
  groupName: string;
  juryCount: number;
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
  juryRankings: AwardRankingScoringResponseDto[];
}
