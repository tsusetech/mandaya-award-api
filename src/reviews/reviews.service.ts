import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StatusProgressService } from '../common/services/status-progress.service';
import { CreateReviewDto, ReviewStatus } from './dto/create-review.dto';
import { UpdateReviewDto } from './dto/update-review.dto';
import { ReviewResponseDto } from './dto/review-response.dto';
import { ReviewListResponseDto } from './dto/review-list.dto';

@Injectable()
export class ReviewsService {
  constructor(
    private prisma: PrismaService,
    private statusProgressService: StatusProgressService,
  ) {}

  async createReview(
    reviewerId: number,
    createReviewDto: CreateReviewDto,
  ): Promise<ReviewResponseDto> {
    const {
      sessionId,
      stage,
      decision,
      overallComments,
      questionComments,
      juryScores,
      totalScore,
      deliberationNotes,
      internalNotes,
      validationChecklist,
    } = createReviewDto;

    // Check if session exists and is submitted
    const session = await this.prisma.responseSession.findUnique({
      where: { id: sessionId },
      include: {
        user: {
          select: {
            name: true,
          },
        },
      },
    });

    if (!session) {
      throw new NotFoundException('Assessment session not found');
    }

    // Check if session is submitted using StatusProgress
    const sessionStatus =
      await this.statusProgressService.getLatestStatus(sessionId);
    if (sessionStatus !== 'submitted' && sessionStatus !== 'resubmitted') {
      throw new BadRequestException(
        'Session must be submitted or resubmitted before it can be reviewed',
      );
    }

    // Check if review already exists (now checking session review fields)
    if (session.reviewerId || session.stage || session.decision) {
      throw new BadRequestException(
        'Review already exists for this session. Use update endpoint to modify your review.',
      );
    }

    // Determine review status based on decision and stage
    let status: string;
    switch (decision) {
      case 'approve':
        status = 'approved';
        break;
      case 'reject':
        status = 'rejected';
        break;
      case 'request_revision':
        status = 'needs_revision';
        break;
      case 'pass_to_jury':
        status = 'in_progress';
        break;
      case 'needs_deliberation':
        status = 'deliberated';
        break;
      default:
        throw new BadRequestException('Invalid review decision');
    }

    // Create review with transaction
    const updatedSession = await this.prisma.$transaction(async (prisma) => {
      // Update session with review data
      const updatedSession = await prisma.responseSession.update({
        where: { id: sessionId },
        data: {
          reviewerId,
          stage,
          decision,
          overallComments,
          totalScore,
          deliberationNotes,
          internalNotes,
          validationChecklist,
          reviewedAt: new Date(),
        },
        include: {
          user: {
            select: {
              name: true,
            },
          },
          reviewer: {
            select: {
              name: true,
            },
          },
        },
      });

      // Record review status in StatusProgress
      await this.statusProgressService.recordStatusChange(
        sessionId,
        status,
        reviewerId,
      );

      // Create question comments if provided
      if (questionComments && questionComments.length > 0) {
        await prisma.reviewComment.createMany({
          data: questionComments.map((comment) => ({
            sessionId, // Changed from reviewId to sessionId
            questionId: comment.questionId,
            comment: comment.comment,
            isCritical: comment.isCritical || false,
            stage: comment.stage || stage,
          })),
        });
      }

      // Create jury scores if provided
      if (juryScores && juryScores.length > 0) {
        await prisma.juryScore.createMany({
          data: juryScores.map((score) => ({
            sessionId, // Changed from reviewId to sessionId
            questionId: score.questionId,
            score: score.score,
            comments: score.comments,
          })),
        });
      }

      return updatedSession;
    });

    return {
      id: updatedSession.id,
      sessionId: updatedSession.id,
      reviewerId: updatedSession.reviewerId!,
      reviewerName: updatedSession.reviewer?.name || 'Unknown Reviewer',
      stage: updatedSession.stage!,
      status: 'reviewed',
      decision: updatedSession.decision!,
      overallComments: updatedSession.overallComments || undefined,
      totalScore: updatedSession.totalScore
        ? Number(updatedSession.totalScore)
        : undefined,
      deliberationNotes: updatedSession.deliberationNotes || undefined,
      internalNotes: updatedSession.internalNotes || undefined,
      validationChecklist: Array.isArray(updatedSession.validationChecklist)
        ? (updatedSession.validationChecklist as string[])
        : undefined,
      reviewedAt: updatedSession.reviewedAt || new Date(),
      questionComments: [], // Will be populated separately if needed
      juryScores: [], // Will be populated separately if needed
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  async updateReview(
    reviewerId: number,
    sessionId: number,
    updateReviewDto: UpdateReviewDto,
  ): Promise<ReviewResponseDto> {
    const {
      stage,
      decision,
      overallComments,
      questionComments,
      juryScores,
      totalScore,
      deliberationNotes,
      internalNotes,
      validationChecklist,
    } = updateReviewDto;

    // Check if session exists and has a review
    const session = await this.prisma.responseSession.findUnique({
      where: { id: sessionId },
      include: {
        user: {
          select: {
            name: true,
          },
        },
        reviewer: {
          select: {
            name: true,
          },
        },
      },
    });

    if (!session) {
      throw new NotFoundException('Assessment session not found');
    }

    if (!session.reviewerId || !session.stage || !session.decision) {
      throw new BadRequestException(
        'No review exists for this session. Use create endpoint to create a new review.',
      );
    }

    // Determine review status based on decision and stage
    let status: string;
    switch (decision) {
      case 'approve':
        status = 'approved';
        break;
      case 'reject':
        status = 'rejected';
        break;
      case 'request_revision':
        status = 'needs_revision';
        break;
      case 'pass_to_jury':
        status = 'in_progress';
        break;
      case 'needs_deliberation':
        status = 'deliberated';
        break;
      default:
        throw new BadRequestException('Invalid review decision');
    }

    // Update review with transaction
    const updatedSession = await this.prisma.$transaction(async (prisma) => {
      // Update session with review data
      const updatedSession = await prisma.responseSession.update({
        where: { id: sessionId },
        data: {
          reviewerId,
          stage,
          decision,
          overallComments,
          totalScore,
          deliberationNotes,
          internalNotes,
          validationChecklist,
          reviewedAt: new Date(),
        },
        include: {
          user: {
            select: {
              name: true,
            },
          },
          reviewer: {
            select: {
              name: true,
            },
          },
        },
      });

      // Record review status in StatusProgress
      await this.statusProgressService.recordStatusChange(
        sessionId,
        status,
        reviewerId,
      );

      // Delete existing comments and scores
      await prisma.reviewComment.deleteMany({
        where: { sessionId }, // Changed from reviewId to sessionId
      });

      await prisma.juryScore.deleteMany({
        where: { sessionId }, // Changed from reviewId to sessionId
      });

      // Create new question comments if provided
      if (questionComments && questionComments.length > 0) {
        await prisma.reviewComment.createMany({
          data: questionComments.map((comment) => ({
            sessionId, // Changed from reviewId to sessionId
            questionId: comment.questionId,
            comment: comment.comment,
            isCritical: comment.isCritical || false,
            stage: comment.stage || stage,
          })),
        });
      }

      // Create new jury scores if provided
      if (juryScores && juryScores.length > 0) {
        await prisma.juryScore.createMany({
          data: juryScores.map((score) => ({
            sessionId, // Changed from reviewId to sessionId
            questionId: score.questionId,
            score: score.score,
            comments: score.comments,
          })),
        });
      }

      return updatedSession;
    });

    return {
      id: updatedSession.id,
      sessionId: updatedSession.id,
      reviewerId: updatedSession.reviewerId!,
      reviewerName: updatedSession.reviewer?.name || 'Unknown Reviewer',
      stage: updatedSession.stage!,
      status: 'reviewed',
      decision: updatedSession.decision!,
      overallComments: updatedSession.overallComments || undefined,
      totalScore: updatedSession.totalScore
        ? Number(updatedSession.totalScore)
        : undefined,
      deliberationNotes: updatedSession.deliberationNotes || undefined,
      internalNotes: updatedSession.internalNotes || undefined,
      validationChecklist: Array.isArray(updatedSession.validationChecklist)
        ? (updatedSession.validationChecklist as string[])
        : undefined,
      reviewedAt: updatedSession.reviewedAt || new Date(),
      questionComments: [], // Will be populated separately if needed
      juryScores: [], // Will be populated separately if needed
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  async getReview(sessionId: number): Promise<ReviewResponseDto> {
    const session = await this.prisma.responseSession.findUnique({
      where: { id: sessionId },
      include: {
        user: {
          select: {
            name: true,
          },
        },
        reviewer: {
          select: {
            name: true,
          },
        },
      },
    });

    if (!session) {
      throw new NotFoundException('Assessment session not found');
    }

    if (!session.reviewerId || !session.stage || !session.decision) {
      throw new NotFoundException('No review found for this session');
    }

    // Get review comments for this session
    const reviewComments = await this.prisma.reviewComment.findMany({
      where: { sessionId },
      include: {
        question: true,
      },
    });

    // Get jury scores for this session
    const juryScores = await this.prisma.juryScore.findMany({
      where: { sessionId },
      include: {
        question: true,
      },
    });

    return {
      id: session.id,
      sessionId: session.id,
      reviewerId: session.reviewerId,
      reviewerName: session.reviewer?.name || 'Unknown Reviewer',
      stage: session.stage,
      status: 'reviewed', // Default status for reviewed sessions
      decision: session.decision,
      overallComments: session.overallComments || undefined,
      totalScore: session.totalScore ? Number(session.totalScore) : undefined,
      deliberationNotes: session.deliberationNotes || undefined,
      internalNotes: session.internalNotes || undefined,
      validationChecklist: Array.isArray(session.validationChecklist)
        ? (session.validationChecklist as string[])
        : undefined,
      reviewedAt: session.reviewedAt || new Date(),
      questionComments: reviewComments.map((comment) => ({
        id: comment.id,
        questionId: comment.questionId,
        questionText: comment.question.questionText,
        comment: comment.comment,
        isCritical: comment.isCritical,
        stage: comment.stage || undefined,
        createdAt: comment.createdAt,
      })),
      juryScores: juryScores.map((score) => ({
        id: score.id,
        questionId: score.questionId,
        questionText: score.question.questionText,
        score: Number(score.score),
        comments: score.comments || undefined,
        createdAt: score.createdAt,
      })),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  async getReviews(
    paginationQuery?: any,
    filters?: any,
  ): Promise<ReviewListResponseDto> {
    const { page = 1, limit = 10 } = paginationQuery || {};
    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {
      reviewerId: { not: null },
      stage: { not: null },
      decision: { not: null },
    };

    if (filters?.status) {
      // Get sessions with specific status from StatusProgress
      const sessionsWithStatus =
        await this.statusProgressService.getSessionsByStatus(filters.status);
      where.id = { in: sessionsWithStatus };
    }

    if (filters?.reviewerId) {
      where.reviewerId = filters.reviewerId;
    }

    if (filters?.stage) {
      where.stage = filters.stage;
    }

    if (filters?.decision) {
      where.decision = filters.decision;
    }

    // Get total count
    const total = await this.prisma.responseSession.count({ where });

    // Get sessions with review data
    const sessions = await this.prisma.responseSession.findMany({
      where,
      include: {
        user: {
          select: {
            name: true,
            email: true,
          },
        },
        reviewer: {
          select: {
            name: true,
          },
        },
        group: {
          select: {
            groupName: true,
          },
        },
      },
      skip,
      take: limit,
      orderBy: {
        reviewedAt: 'desc',
      },
    });

    // Map to DTO
    const data = await Promise.all(
      sessions.map(async (session) => {
        const currentStatus = await this.statusProgressService.getLatestStatus(
          session.id,
        );

        return {
          id: session.id,
          sessionId: session.id,
          userId: session.userId,
          reviewerId: session.reviewerId!,
          reviewerName: session.reviewer?.name || 'Unknown Reviewer',
          stage: session.stage!,
          decision: session.decision!,
          status: currentStatus || 'pending',
          reviewedAt: session.reviewedAt || new Date(),
          userName: session.user.name || 'Unknown User',
          userEmail: session.user.email,
          groupId: session.groupId,
          groupName: session.group.groupName,
          submittedAt: session.submittedAt || new Date(),
        };
      }),
    );

    const totalPages = Math.ceil(total / limit);
    const hasNext = page < totalPages;
    const hasPrev = page > 1;

    return {
      reviews: data,
      total,
      page,
      limit,
    };
  }

  async deleteReview(
    sessionId: number,
  ): Promise<{ success: boolean; message: string }> {
    const session = await this.prisma.responseSession.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      throw new NotFoundException('Assessment session not found');
    }

    if (!session.reviewerId || !session.stage || !session.decision) {
      throw new NotFoundException('No review found for this session');
    }

    await this.prisma.$transaction(async (prisma) => {
      // Delete review comments
      await prisma.reviewComment.deleteMany({
        where: { sessionId },
      });

      // Delete jury scores
      await prisma.juryScore.deleteMany({
        where: { sessionId },
      });

      // Clear review data from session
      await prisma.responseSession.update({
        where: { id: sessionId },
        data: {
          reviewerId: null,
          stage: null,
          decision: null,
          overallComments: null,
          totalScore: null,
          deliberationNotes: null,
          internalNotes: null,
          validationChecklist: undefined,
          reviewedAt: null,
        },
      });

      // Record status change back to submitted
      await this.statusProgressService.recordStatusChange(
        sessionId,
        'submitted',
        undefined,
      );
    });

    return {
      success: true,
      message: 'Review deleted successfully',
    };
  }

  async hasReview(sessionId: number): Promise<boolean> {
    const session = await this.prisma.responseSession.findUnique({
      where: { id: sessionId },
      select: {
        reviewerId: true,
        stage: true,
        decision: true,
      },
    });

    return !!(session?.reviewerId && session?.stage && session?.decision);
  }

  async getReviewStatus(sessionId: number): Promise<string | null> {
    const session = await this.prisma.responseSession.findUnique({
      where: { id: sessionId },
      select: {
        reviewerId: true,
        stage: true,
        decision: true,
      },
    });

    if (!session?.reviewerId || !session?.stage || !session?.decision) {
      return null;
    }

    // Get current status from StatusProgress
    return await this.statusProgressService.getLatestStatus(sessionId);
  }
}
