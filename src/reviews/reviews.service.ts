import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StatusProgressService } from '../common/services/status-progress.service';
import { CreateReviewDto, ReviewStatus, ReviewDecision } from './dto/create-review.dto';
import { UpdateReviewDto } from './dto/update-review.dto';
import { ReviewResponseDto } from './dto/review-response.dto';
import { ReviewListResponseDto, ReviewListItemDto } from './dto/review-list.dto';

@Injectable()
export class ReviewsService {
  constructor(
    private prisma: PrismaService,
    private statusProgressService: StatusProgressService
  ) {}

  async createReview(reviewerId: number, createReviewDto: CreateReviewDto): Promise<ReviewResponseDto> {
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
      validationChecklist 
    } = createReviewDto;

    // Check if session exists and is submitted
    const session = await this.prisma.responseSession.findUnique({
      where: { id: sessionId },
      include: {
        user: true,
        group: true,
        responses: {
          include: {
            question: true
          }
        }
      }
    });

    if (!session) {
      throw new NotFoundException('Response session not found');
    }

    // Check if session is submitted using StatusProgress
    const sessionStatus = await this.statusProgressService.getResponseSessionStatus(sessionId);
    if (sessionStatus !== 'submitted' && sessionStatus !== 'resubmitted') {
      throw new BadRequestException('Session must be submitted or resubmitted before it can be reviewed');
    }

    // Check if review already exists
    const existingReview = await this.prisma.review.findFirst({
      where: { sessionId }
    });

    if (existingReview) {
      throw new BadRequestException('Review already exists for this session');
    }

    // Determine review status based on decision and stage
    let status: ReviewStatus;
    switch (decision) {
      case ReviewDecision.APPROVE:
        status = ReviewStatus.APPROVED;
        break;
      case ReviewDecision.REJECT:
        status = ReviewStatus.REJECTED;
        break;
      case ReviewDecision.REQUEST_REVISION:
        status = ReviewStatus.NEEDS_REVISION;
        break;
      case ReviewDecision.PASS_TO_JURY:
        status = ReviewStatus.IN_PROGRESS;
        break;
      case ReviewDecision.NEEDS_DELIBERATION:
        status = ReviewStatus.DELIBERATED;
        break;
      default:
        throw new BadRequestException('Invalid review decision');
    }

    // Create review with transaction
    const review = await this.prisma.$transaction(async (prisma) => {
      // Create the main review
      const newReview = await prisma.review.create({
        data: {
          sessionId,
          reviewerId,
          stage,
          decision,
          overallComments,
          totalScore,
          deliberationNotes,
          internalNotes,
          validationChecklist,
          reviewedAt: new Date()
        },
        include: {
          reviewer: true,
          session: {
            include: {
              user: true,
              group: true
            }
          },
          comments: {
            include: {
              question: true
            }
          },
          juryScores: {
            include: {
              question: true
            }
          }
        }
      });

      // Create question comments if provided
      if (questionComments && questionComments.length > 0) {
        await prisma.reviewComment.createMany({
          data: questionComments.map(comment => ({
            reviewId: newReview.id,
            questionId: comment.questionId,
            comment: comment.comment,
            isCritical: comment.isCritical || false,
            stage: comment.stage || stage
          }))
        });
      }

      // Create jury scores if provided
      if (juryScores && juryScores.length > 0) {
        await prisma.juryScore.createMany({
          data: juryScores.map(score => ({
            reviewId: newReview.id,
            questionId: score.questionId,
            score: score.score,
            comments: score.comments
          }))
        });
      }

      // Record review status change in StatusProgress
      await this.statusProgressService.recordStatusChange(
        'review',
        newReview.id,
        status,
        reviewerId,
        { 
          action: 'create_review',
          stage,
          decision,
          sessionId
        }
      );

      return newReview;
    });

    return await this.mapReviewToDto(review);
  }

  async getReview(reviewId: number): Promise<ReviewResponseDto> {
    const review = await this.prisma.review.findUnique({
      where: { id: reviewId },
      include: {
        reviewer: true,
        session: {
          include: {
            user: true,
            group: true
          }
        },
        comments: {
          include: {
            question: true
          }
        },
        juryScores: {
          include: {
            question: true
          }
        }
      }
    });

    if (!review) {
      throw new NotFoundException('Review not found');
    }

    // Get current status from StatusProgress (for DTO mapping)
    const currentStatus = await this.statusProgressService.getCurrentStatus('review', reviewId);

    return await this.mapReviewToDto(review);
  }

  async updateReview(reviewId: number, updateReviewDto: UpdateReviewDto): Promise<ReviewResponseDto> {
    const review = await this.prisma.review.findUnique({
      where: { id: reviewId }
    });

    if (!review) {
      throw new NotFoundException('Review not found');
    }

    // Only allow updates if review is not finalized
    const currentStatus = await this.statusProgressService.getCurrentStatus('review', reviewId);
    if (currentStatus?.status === 'approved' || currentStatus?.status === 'rejected') {
      throw new BadRequestException('Cannot update finalized review');
    }

    const { 
      stage, 
      decision, 
      overallComments, 
      questionComments, 
      juryScores, 
      totalScore, 
      deliberationNotes, 
      internalNotes, 
      validationChecklist 
    } = updateReviewDto;

    // Determine new status based on decision and stage
    let status: ReviewStatus;
    if (decision) {
      switch (decision) {
        case ReviewDecision.APPROVE:
          status = ReviewStatus.APPROVED;
          break;
        case ReviewDecision.REJECT:
          status = ReviewStatus.REJECTED;
          break;
        case ReviewDecision.REQUEST_REVISION:
          status = ReviewStatus.NEEDS_REVISION;
          break;
        case ReviewDecision.PASS_TO_JURY:
          status = ReviewStatus.IN_PROGRESS;
          break;
        case ReviewDecision.NEEDS_DELIBERATION:
          status = ReviewStatus.DELIBERATED;
          break;
        default:
          throw new BadRequestException('Invalid review decision');
      }
    } else {
      status = (currentStatus?.status || 'pending') as ReviewStatus;
    }

    // Update review with transaction - write to both tables
    const updatedReview = await this.prisma.$transaction(async (prisma) => {
      // Update the main review
      const updatedReview = await prisma.review.update({
        where: { id: reviewId },
        data: {
          stage: stage || review.stage,
          decision: decision || review.decision,
          overallComments,
          totalScore,
          deliberationNotes,
          internalNotes,
          validationChecklist,
          reviewedAt: new Date()
        },
        include: {
          reviewer: true,
          session: {
            include: {
              user: true,
              group: true
            }
          },
          comments: {
            include: {
              question: true
            }
          },
          juryScores: {
            include: {
              question: true
            }
          }
        }
      });

      // Update question comments if provided
      if (questionComments && questionComments.length > 0) {
        // Delete existing comments
        await prisma.reviewComment.deleteMany({
          where: { reviewId }
        });

        // Create new comments
        await prisma.reviewComment.createMany({
          data: questionComments.map(comment => ({
            reviewId,
            questionId: comment.questionId,
            comment: comment.comment,
            isCritical: comment.isCritical || false,
            stage: comment.stage || stage || review.stage
          }))
        });
      }

      // Update jury scores if provided
      if (juryScores && juryScores.length > 0) {
        // Delete existing scores
        await prisma.juryScore.deleteMany({
          where: { reviewId }
        });

        // Create new scores
        await prisma.juryScore.createMany({
          data: juryScores.map(score => ({
            reviewId,
            questionId: score.questionId,
            score: score.score,
            comments: score.comments
          }))
        });
      }

      // Update session reviewedAt timestamp
      await prisma.responseSession.update({
        where: { id: review.sessionId },
        data: {
          reviewedAt: new Date()
        }
      });

      // Record status change in StatusProgress if status changed
      if (status !== currentStatus?.status) {
        await this.statusProgressService.recordStatusChange(
          'review',
          reviewId,
          status,
          review.reviewerId,
          { 
            action: 'update_review',
            stage: stage || review.stage,
            decision: decision || review.decision,
            sessionId: review.sessionId
          }
        );
      }

      return updatedReview;
    });

    return this.mapReviewToDto(updatedReview);
  }

  async getReviewsForReviewer(
    reviewerId: number,
    page: number = 1,
    limit: number = 10,
    status?: ReviewStatus
  ): Promise<ReviewListResponseDto> {
    const skip = (page - 1) * limit;

    const where: any = {
      reviewerId
    };

    const [reviews, total] = await Promise.all([
      this.prisma.review.findMany({
        where,
        include: {
          session: {
            include: {
              user: true,
              group: true
            }
          },
          reviewer: true
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      }),
      this.prisma.review.count({ where })
    ]);

    const reviewList = await Promise.all(reviews.map(review => this.mapReviewToListDto(review)));

    return {
      reviews: reviewList,
      total,
      page,
      limit
    };
  }

  async getPendingReviews(
    page: number = 1,
    limit: number = 10
  ): Promise<ReviewListResponseDto> {
    const skip = (page - 1) * limit;

    // Get all submitted sessions
    const [sessions, total] = await Promise.all([
      this.prisma.responseSession.findMany({
        where: {
          // We'll filter by status using StatusProgress after fetching
        },
        include: {
          user: true,
          group: true
        },
        orderBy: { submittedAt: 'desc' },
        skip,
        take: limit
      }),
      this.prisma.responseSession.count({
        where: {
          // We'll filter by status using StatusProgress after fetching
        }
      })
    ]);

    // Filter sessions that are submitted and don't have reviews
    const pendingSessions: any[] = [];
    for (const session of sessions) {
      const sessionStatus = await this.statusProgressService.getResponseSessionStatus(session.id);
      const hasReview = await this.prisma.review.findFirst({
        where: { sessionId: session.id }
      });
      
      if (sessionStatus === 'submitted' && !hasReview) {
        pendingSessions.push(session);
      }
    }

    const reviewList = pendingSessions.map(session => this.mapSessionToListDto(session));

    return {
      reviews: reviewList,
      total: pendingSessions.length,
      page,
      limit
    };
  }

  async getReviewStats(): Promise<{
    pending: number;
    approved: number;
    rejected: number;
    needsRevision: number;
    total: number;
  }> {
    // Get all submitted sessions
    const submittedSessions = await this.prisma.responseSession.findMany({
      where: {
        // We'll filter by status using StatusProgress
      }
    });

    let pending = 0;
    let approved = 0;
    let rejected = 0;
    let needsRevision = 0;
    let total = 0;

    for (const session of submittedSessions) {
      const sessionStatus = await this.statusProgressService.getResponseSessionStatus(session.id);
      
      if (sessionStatus === 'submitted') {
        total++;
        
        const review = await this.prisma.review.findFirst({
          where: { sessionId: session.id }
        });
        
        if (!review) {
          pending++;
        } else {
          const reviewStatus = await this.statusProgressService.getReviewStatus(review.id);
          switch (reviewStatus) {
            case 'approved':
              approved++;
              break;
            case 'rejected':
              rejected++;
              break;
            case 'needs_revision':
              needsRevision++;
              break;
            default:
              pending++;
          }
        }
      }
    }

    return {
      pending,
      approved,
      rejected,
      needsRevision,
      total
    };
  }

  private async mapReviewToDto(review: any): Promise<ReviewResponseDto> {
    // Get current status from StatusProgress
    const currentStatus = await this.statusProgressService.getReviewStatus(review.id);
    
    return {
      id: review.id,
      sessionId: review.sessionId,
      reviewerId: review.reviewerId,
      reviewerName: review.reviewer.name,
      stage: review.stage,
      status: currentStatus || 'pending',
      decision: review.decision,
      overallComments: review.overallComments,
      totalScore: review.totalScore,
      deliberationNotes: review.deliberationNotes,
      internalNotes: review.internalNotes,
      validationChecklist: review.validationChecklist,
      questionComments: review.comments.map(comment => ({
        id: comment.id,
        questionId: comment.questionId,
        comment: comment.comment,
        isCritical: comment.isCritical,
        stage: comment.stage,
        createdAt: comment.createdAt
      })),
      juryScores: review.juryScores.map(score => ({
        id: score.id,
        questionId: score.questionId,
        score: score.score,
        comments: score.comments,
        createdAt: score.createdAt
      })),
      reviewedAt: review.reviewedAt,
      createdAt: review.createdAt,
      updatedAt: review.updatedAt
    };
  }

  private async mapReviewToListDto(review: any): Promise<ReviewListItemDto> {
    // Get current status from StatusProgress
    const currentStatus = await this.statusProgressService.getReviewStatus(review.id);
    
    return {
      id: review.id,
      sessionId: review.sessionId,
      userId: review.session.userId,
      userName: review.session.user.name,
      groupId: review.session.groupId,
      groupName: review.session.group.groupName,
      status: currentStatus || 'pending',
      submittedAt: review.session.submittedAt,
      reviewerId: review.reviewerId,
      reviewerName: review.reviewer.name,
      reviewedAt: review.reviewedAt,
      decision: review.decision
    };
  }

  private mapSessionToListDto(session: any): ReviewListItemDto {
    return {
      id: undefined, // No review ID yet
      sessionId: session.id,
      userId: session.userId,
      userName: session.user.name,
      groupId: session.groupId,
      groupName: session.group.groupName,
      status: 'pending',
      submittedAt: session.submittedAt,
      reviewerId: undefined,
      reviewerName: undefined,
      reviewedAt: undefined,
      decision: undefined
    };
  }
}
