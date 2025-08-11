import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export type EntityType = 'response_session' | 'review';

@Injectable()
export class StatusProgressService {
  constructor(private prisma: PrismaService) {}

  async recordStatusChange(
    entityType: EntityType,
    entityId: number,
    newStatus: string,
    changedBy?: number,
    metadata?: any
  ): Promise<void> {
    // Get the current latest version for this entity
    const latestVersion = await this.prisma.statusProgress.findFirst({
      where: {
        entityType,
        entityId
      },
      orderBy: {
        version: 'desc'
      }
    });

    const newVersion = (latestVersion?.version || 0) + 1;
    const previousStatus = latestVersion?.status || null;

    // Create new status progress record
    await this.prisma.statusProgress.create({
      data: {
        entityType,
        entityId,
        status: newStatus,
        version: newVersion,
        previousStatus,
        changedBy,
        metadata
      }
    });
  }

  async getStatusHistory(
    entityType: EntityType,
    entityId: number
  ): Promise<Array<{
    id: number;
    entityType: string;
    entityId: number;
    status: string;
    version: number;
    previousStatus?: string | null;
    changedBy?: number | null;
    changedAt: Date;
    metadata?: any;
    changedByUser?: {
      name: string | null;
      email: string;
    } | null;
  }>> {
    return await this.prisma.statusProgress.findMany({
      where: {
        entityType,
        entityId
      },
      orderBy: {
        version: 'desc'
      },
      include: {
        changedByUser: {
          select: {
            name: true,
            email: true
          }
        }
      }
    });
  }

  async getCurrentStatus(
    entityType: EntityType,
    entityId: number
  ): Promise<{
    status: string;
    version: number;
    changedAt: Date;
  } | null> {
    const result = await this.prisma.statusProgress.findFirst({
      where: {
        entityType,
        entityId
      },
      orderBy: {
        version: 'desc'
      },
      select: {
        status: true,
        version: true,
        changedAt: true
      }
    });

    return result;
  }

  async getLatestStatus(
    entityType: EntityType,
    entityId: number
  ): Promise<string | null> {
    const result = await this.getCurrentStatus(entityType, entityId);
    return result?.status || null;
  }

  async updateStatus(
    entityType: EntityType,
    entityId: number,
    newStatus: string,
    changedBy?: number,
    metadata?: any
  ): Promise<void> {
    await this.recordStatusChange(entityType, entityId, newStatus, changedBy, metadata);
  }

  async getResponseSessionStatus(sessionId: number): Promise<string | null> {
    return await this.getLatestStatus('response_session', sessionId);
  }

  async getReviewStatus(reviewId: number): Promise<string | null> {
    return await this.getLatestStatus('review', reviewId);
  }

  async updateResponseSessionStatus(
    sessionId: number,
    newStatus: string,
    changedBy?: number,
    metadata?: any
  ): Promise<void> {
    await this.updateStatus('response_session', sessionId, newStatus, changedBy, metadata);
  }

  async updateReviewStatus(
    reviewId: number,
    newStatus: string,
    changedBy?: number,
    metadata?: any
  ): Promise<void> {
    await this.updateStatus('review', reviewId, newStatus, changedBy, metadata);
  }
}
