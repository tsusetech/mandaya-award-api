import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateAwardRankingDto } from './dto/update-award-ranking.dto';
import { AwardRankingResponseDto } from './dto/award-ranking-response.dto';

@Injectable()
export class AwardRankingsService {
  constructor(private prisma: PrismaService) {}

  async findAll(): Promise<AwardRankingResponseDto[]> {
    const awardRankings = await this.prisma.awardRanking.findMany({
      include: {
        session: {
          include: {
            user: true,
            group: true,
          },
        },
      },
    });

    return awardRankings.map((ranking) => ({
      id: ranking.id,
      sessionId: ranking.sessionId,
      userId: ranking.session.userId,
      userEmail: ranking.session.user.email,
      userName: ranking.session.user.name || '',
      groupId: ranking.session.groupId,
      groupName: ranking.session.group.groupName,
      relevansiProgram: ranking.relevansiProgram,
      dampakCapaianNyata: ranking.dampakCapaianNyata,
      inklusivitas: ranking.inklusivitas,
      keberlanjutan: ranking.keberlanjutan,
      inovasiPotensiReplikasi: ranking.inovasiPotensiReplikasi,
      kualitasPresentasi: ranking.kualitasPresentasi,
    }));
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
      },
    });

    if (!awardRanking) {
      throw new NotFoundException(`Award ranking with ID ${id} not found`);
    }

    return {
      id: awardRanking.id,
      sessionId: awardRanking.sessionId,
      userId: awardRanking.session.userId,
      userEmail: awardRanking.session.user.email,
      userName: awardRanking.session.user.name || '',
      groupId: awardRanking.session.groupId,
      groupName: awardRanking.session.group.groupName,
      relevansiProgram: awardRanking.relevansiProgram,
      dampakCapaianNyata: awardRanking.dampakCapaianNyata,
      inklusivitas: awardRanking.inklusivitas,
      keberlanjutan: awardRanking.keberlanjutan,
      inovasiPotensiReplikasi: awardRanking.inovasiPotensiReplikasi,
      kualitasPresentasi: awardRanking.kualitasPresentasi,
    };
  }

  async update(id: number, updateAwardRankingDto: UpdateAwardRankingDto): Promise<AwardRankingResponseDto> {
    const existingRanking = await this.prisma.awardRanking.findUnique({
      where: { id },
    });

    if (!existingRanking) {
      throw new NotFoundException(`Award ranking with ID ${id} not found`);
    }

    const updatedRanking = await this.prisma.awardRanking.update({
      where: { id },
      data: updateAwardRankingDto,
      include: {
        session: {
          include: {
            user: true,
            group: true,
          },
        },
      },
    });

    return {
      id: updatedRanking.id,
      sessionId: updatedRanking.sessionId,
      userId: updatedRanking.session.userId,
      userEmail: updatedRanking.session.user.email,
      userName: updatedRanking.session.user.name || '',
      groupId: updatedRanking.session.groupId,
      groupName: updatedRanking.session.group.groupName,
      relevansiProgram: updatedRanking.relevansiProgram,
      dampakCapaianNyata: updatedRanking.dampakCapaianNyata,
      inklusivitas: updatedRanking.inklusivitas,
      keberlanjutan: updatedRanking.keberlanjutan,
      inovasiPotensiReplikasi: updatedRanking.inovasiPotensiReplikasi,
      kualitasPresentasi: updatedRanking.kualitasPresentasi,
    };
  }
}
