import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class StatusProgressService {
  constructor(private prisma: PrismaService) {}

  async recordStatusChange(
    sessionId: number,
    newStatus: string,
    changedBy?: number,
  ): Promise<void> {
    // Get the current status for this session
    const currentStatus = await this.prisma.statusProgress.findFirst({
      where: { sessionId },
      orderBy: { changedAt: 'desc' },
    });

    const previousStatus = currentStatus?.status || null;

    // Create new status progress record
    await this.prisma.statusProgress.create({
      data: {
        sessionId,
        status: newStatus,
        previousStatus,
        changedBy,
      },
    });
  }

  async getStatusHistory(sessionId: number): Promise<
    Array<{
      id: number;
      sessionId: number;
      status: string;
      previousStatus?: string | null;
      changedBy?: number | null;
      changedAt: Date;
      changedByUser?: {
        name: string | null;
        email: string;
      } | null;
    }>
  > {
    return await this.prisma.statusProgress.findMany({
      where: { sessionId },
      orderBy: { changedAt: 'desc' },
      include: {
        changedByUser: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });
  }

  async getCurrentStatus(sessionId: number): Promise<{
    status: string;
    changedAt: Date;
  } | null> {
    const result = await this.prisma.statusProgress.findFirst({
      where: { sessionId },
      orderBy: { changedAt: 'desc' },
      select: {
        status: true,
        changedAt: true,
      },
    });

    return result;
  }

  async getLatestStatus(sessionId: number): Promise<string | null> {
    const result = await this.getCurrentStatus(sessionId);
    return result?.status || null;
  }

  async updateStatus(
    sessionId: number,
    newStatus: string,
    changedBy?: number,
  ): Promise<void> {
    await this.recordStatusChange(sessionId, newStatus, changedBy);
  }

  // Legacy method for backward compatibility
  async getResponseSessionStatus(sessionId: number): Promise<string | null> {
    return await this.getLatestStatus(sessionId);
  }

  async getSessionsByStatus(status: string): Promise<number[]> {
    const sessions = await this.prisma.statusProgress.findMany({
      where: { status },
      select: { sessionId: true },
      distinct: ['sessionId'],
    });

    return sessions.map((s) => s.sessionId);
  }
}
