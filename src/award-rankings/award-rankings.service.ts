import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAwardRankingDto } from './dto/create-award-ranking.dto';
import { CreateBatchAwardRankingsDto } from './dto/create-batch-award-rankings.dto';
import { CreateAwardRankingScoringDto } from './dto/create-award-ranking-scoring.dto';
import { UpdateAwardRankingScoringDto } from './dto/update-award-ranking-scoring.dto';
import { AwardRankingResponseDto } from './dto/award-ranking-response.dto';
import { AwardRankingScoringResponseDto } from './dto/award-ranking-scoring-response.dto';
import { AwardRankingSummaryDto } from './dto/award-ranking-summary.dto';
import { BatchAwardRankingsResponseDto } from './dto/batch-award-rankings-response.dto';

@Injectable()
export class AwardRankingsService {
  constructor(private prisma: PrismaService) {}

  private mapToAwardRankingResponse(ranking: any): AwardRankingResponseDto {
    const juryCount = ranking.scoringDetails.length;
    
    // Calculate average scores
    const totalScores = ranking.scoringDetails.reduce(
      (acc: any, scoring: any) => ({
        relevansiProgram: acc.relevansiProgram + scoring.relevansiProgram,
        dampakCapaianNyata: acc.dampakCapaianNyata + scoring.dampakCapaianNyata,
        inklusivitas: acc.inklusivitas + scoring.inklusivitas,
        keberlanjutan: acc.keberlanjutan + scoring.keberlanjutan,
        inovasiPotensiReplikasi: acc.inovasiPotensiReplikasi + scoring.inovasiPotensiReplikasi,
        kualitasPresentasi: acc.kualitasPresentasi + scoring.kualitasPresentasi,
      }),
      {
        relevansiProgram: 0,
        dampakCapaianNyata: 0,
        inklusivitas: 0,
        keberlanjutan: 0,
        inovasiPotensiReplikasi: 0,
        kualitasPresentasi: 0,
      }
    );

    const averageScores = juryCount > 0 ? {
      relevansiProgram: Math.round((totalScores.relevansiProgram / juryCount) * 100) / 100,
      dampakCapaianNyata: Math.round((totalScores.dampakCapaianNyata / juryCount) * 100) / 100,
      inklusivitas: Math.round((totalScores.inklusivitas / juryCount) * 100) / 100,
      keberlanjutan: Math.round((totalScores.keberlanjutan / juryCount) * 100) / 100,
      inovasiPotensiReplikasi: Math.round((totalScores.inovasiPotensiReplikasi / juryCount) * 100) / 100,
      kualitasPresentasi: Math.round((totalScores.kualitasPresentasi / juryCount) * 100) / 100,
    } : {
      relevansiProgram: 0,
      dampakCapaianNyata: 0,
      inklusivitas: 0,
      keberlanjutan: 0,
      inovasiPotensiReplikasi: 0,
      kualitasPresentasi: 0,
    };

    const overall = Math.round(
      ((averageScores.relevansiProgram + averageScores.dampakCapaianNyata + 
        averageScores.inklusivitas + averageScores.keberlanjutan + 
        averageScores.inovasiPotensiReplikasi + averageScores.kualitasPresentasi) / 6) * 100
    ) / 100;

    const scoringDetails = ranking.scoringDetails.map((scoring: any) => ({
      id: scoring.id,
      awardRankingId: scoring.awardRankingId,
      juryId: scoring.juryId,
      juryEmail: scoring.jury.email,
      juryName: scoring.jury.name || '',
      relevansiProgram: scoring.relevansiProgram,
      dampakCapaianNyata: scoring.dampakCapaianNyata,
      inklusivitas: scoring.inklusivitas,
      keberlanjutan: scoring.keberlanjutan,
      inovasiPotensiReplikasi: scoring.inovasiPotensiReplikasi,
      kualitasPresentasi: scoring.kualitasPresentasi,
      createdAt: scoring.createdAt,
      updatedAt: scoring.updatedAt,
    }));

    return {
      id: ranking.id,
      sessionId: ranking.sessionId,
      userId: ranking.session.userId,
      userEmail: ranking.session.user.email,
      userName: ranking.session.user.name || '',
      groupId: ranking.session.groupId,
      groupName: ranking.session.group.groupName,
      juryCount,
      averageScores: {
        ...averageScores,
        overall,
      },
      scoringDetails,
      createdAt: ranking.createdAt,
      updatedAt: ranking.updatedAt,
    };
  }

  async findAll(): Promise<AwardRankingResponseDto[]> {
    const awardRankings = await this.prisma.awardRanking.findMany({
      include: {
        session: {
          include: {
            user: true,
            group: true,
          },
        },
        scoringDetails: {
          include: {
            jury: true,
          },
        },
      },
    });

    return awardRankings.map((ranking) => this.mapToAwardRankingResponse(ranking));
  }

  async findOne(id: number): Promise<AwardRankingResponseDto> {
    const awardRanking = await this.prisma.awardRanking.findUnique({
      where: { id },
      include: {
        session: {
          include: {
            user: true,
            group: true,
          },
        },
        scoringDetails: {
          include: {
            jury: true,
          },
        },
      },
    });

    if (!awardRanking) {
      throw new NotFoundException(`Award ranking with ID ${id} not found`);
    }

    return this.mapToAwardRankingResponse(awardRanking);
  }

  async create(createAwardRankingDto: CreateAwardRankingDto): Promise<AwardRankingResponseDto> {
    // Check if ranking already exists for this session
    const existingRanking = await this.prisma.awardRanking.findUnique({
      where: { sessionId: createAwardRankingDto.sessionId },
    });

    if (existingRanking) {
      throw new ConflictException(`Award ranking already exists for session ${createAwardRankingDto.sessionId}`);
    }

    const awardRanking = await this.prisma.awardRanking.create({
      data: {
        sessionId: createAwardRankingDto.sessionId,
      },
      include: {
        session: {
          include: {
            user: true,
            group: true,
          },
        },
        scoringDetails: {
          include: {
            jury: true,
          },
        },
      },
    });

    return this.mapToAwardRankingResponse(awardRanking);
  }

  async createBatch(createBatchDto: CreateBatchAwardRankingsDto): Promise<BatchAwardRankingsResponseDto> {
    const results = {
      success: [] as AwardRankingResponseDto[],
      failed: [] as { sessionId: number; error: string }[],
    };

    // Process each ranking individually
    for (const rankingDto of createBatchDto.rankings) {
      try {
        // Check if ranking already exists for this session
        const existingRanking = await this.prisma.awardRanking.findUnique({
          where: { sessionId: rankingDto.sessionId },
        });

        if (existingRanking) {
          results.failed.push({
            sessionId: rankingDto.sessionId,
            error: `Award ranking already exists for session ${rankingDto.sessionId}`,
          });
          continue;
        }

        const awardRanking = await this.prisma.awardRanking.create({
          data: {
            sessionId: rankingDto.sessionId,
          },
          include: {
            session: {
              include: {
                user: true,
                group: true,
              },
            },
            scoringDetails: {
              include: {
                jury: true,
              },
            },
          },
        });

        results.success.push(this.mapToAwardRankingResponse(awardRanking));
      } catch (error) {
        results.failed.push({
          sessionId: rankingDto.sessionId,
          error: error.message || 'Unknown error occurred',
        });
      }
    }

    return {
      success: results.success.length,
      failed: results.failed.length,
      results,
    };
  }

  async addJuryScoring(createScoringDto: CreateAwardRankingScoringDto): Promise<AwardRankingScoringResponseDto> {
    // Check if this jury has already scored this ranking
    const existingScoring = await this.prisma.awardRankingScoring.findUnique({
      where: {
        awardRankingId_juryId: {
          awardRankingId: createScoringDto.awardRankingId,
          juryId: createScoringDto.juryId,
        },
      },
    });

    if (existingScoring) {
      throw new ConflictException(`Jury ${createScoringDto.juryId} has already scored ranking ${createScoringDto.awardRankingId}`);
    }

    const scoring = await this.prisma.awardRankingScoring.create({
      data: createScoringDto,
      include: {
        jury: true,
      },
    });

    return {
      id: scoring.id,
      awardRankingId: scoring.awardRankingId,
      juryId: scoring.juryId,
      juryEmail: scoring.jury.email,
      juryName: scoring.jury.name || '',
      relevansiProgram: scoring.relevansiProgram,
      dampakCapaianNyata: scoring.dampakCapaianNyata,
      inklusivitas: scoring.inklusivitas,
      keberlanjutan: scoring.keberlanjutan,
      inovasiPotensiReplikasi: scoring.inovasiPotensiReplikasi,
      kualitasPresentasi: scoring.kualitasPresentasi,
      createdAt: scoring.createdAt,
      updatedAt: scoring.updatedAt,
    };
  }

  async updateJuryScoring(id: number, updateScoringDto: UpdateAwardRankingScoringDto): Promise<AwardRankingScoringResponseDto> {
    const existingScoring = await this.prisma.awardRankingScoring.findUnique({
      where: { id },
    });

    if (!existingScoring) {
      throw new NotFoundException(`Award ranking scoring with ID ${id} not found`);
    }

    const updatedScoring = await this.prisma.awardRankingScoring.update({
      where: { id },
      data: updateScoringDto,
      include: {
        jury: true,
      },
    });

    return {
      id: updatedScoring.id,
      awardRankingId: updatedScoring.awardRankingId,
      juryId: updatedScoring.juryId,
      juryEmail: updatedScoring.jury.email,
      juryName: updatedScoring.jury.name || '',
      relevansiProgram: updatedScoring.relevansiProgram,
      dampakCapaianNyata: updatedScoring.dampakCapaianNyata,
      inklusivitas: updatedScoring.inklusivitas,
      keberlanjutan: updatedScoring.keberlanjutan,
      inovasiPotensiReplikasi: updatedScoring.inovasiPotensiReplikasi,
      kualitasPresentasi: updatedScoring.kualitasPresentasi,
      createdAt: updatedScoring.createdAt,
      updatedAt: updatedScoring.updatedAt,
    };
  }

  async findBySession(sessionId: number): Promise<AwardRankingSummaryDto> {
    const ranking = await this.prisma.awardRanking.findUnique({
      where: { sessionId },
      include: {
        session: {
          include: {
            user: true,
            group: true,
          },
        },
        scoringDetails: {
          include: {
            jury: true,
          },
        },
      },
    });

    if (!ranking) {
      throw new NotFoundException(`No award ranking found for session ${sessionId}`);
    }

    const response = this.mapToAwardRankingResponse(ranking);
    
    return {
      sessionId: response.sessionId,
      userId: response.userId,
      userEmail: response.userEmail,
      userName: response.userName,
      groupId: response.groupId,
      groupName: response.groupName,
      juryCount: response.juryCount,
      averageScores: response.averageScores,
      juryRankings: response.scoringDetails,
    };
  }
}