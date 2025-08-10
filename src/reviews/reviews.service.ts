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

    if (session.status !== 'submitted') {
      throw new BadRequestException('Session must be submitted before it can be reviewed');
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
          status,
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

      // Update session status based on review decision
      await prisma.responseSession.update({
        where: { id: sessionId },
        data: {
          reviewStatus: status,
          reviewedAt: new Date()
        }
      });

      // Record review status change
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

    return this.mapReviewToDto(review);
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

    return this.mapReviewToDto(review);
  }

  async updateReview(reviewId: number, updateReviewDto: UpdateReviewDto): Promise<ReviewResponseDto> {
    const review = await this.prisma.review.findUnique({
      where: { id: reviewId }
    });

    if (!review) {
      throw new NotFoundException('Review not found');
    }

    // Only allow updates if review is not finalized
    if (review.status === ReviewStatus.APPROVED || review.status === ReviewStatus.REJECTED) {
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
      status = review.status as ReviewStatus;
    }

    // Update review with transaction
    const updatedReview = await this.prisma.$transaction(async (prisma) => {
      // Update the main review
      const updatedReview = await prisma.review.update({
        where: { id: reviewId },
        data: {
          stage: stage || review.stage,
          status,
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

      // Update session review status
      await prisma.responseSession.update({
        where: { id: review.sessionId },
        data: {
          reviewStatus: status,
          reviewedAt: new Date()
        }
      });

      // Record status change if status changed
      if (status !== review.status) {
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

    if (status) {
      where.status = status;
    }

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

    const reviewList = reviews.map(review => this.mapReviewToListDto(review));

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

    const [sessions, total] = await Promise.all([
      this.prisma.responseSession.findMany({
        where: {
          status: 'submitted',
          reviewStatus: null
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
          status: 'submitted',
          reviewStatus: null
        }
      })
    ]);

    const reviewList = sessions.map(session => this.mapSessionToListDto(session));

    return {
      reviews: reviewList,
      total,
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
    const [pending, approved, rejected, needsRevision, total] = await Promise.all([
      this.prisma.responseSession.count({
        where: {
          status: 'submitted',
          reviewStatus: null
        }
      }),
      this.prisma.responseSession.count({
        where: {
          status: 'submitted',
          reviewStatus: ReviewStatus.APPROVED
        }
      }),
      this.prisma.responseSession.count({
        where: {
          status: 'submitted',
          reviewStatus: ReviewStatus.REJECTED
        }
      }),
      this.prisma.responseSession.count({
        where: {
          status: 'submitted',
          reviewStatus: ReviewStatus.NEEDS_REVISION
        }
      }),
      this.prisma.responseSession.count({
        where: {
          status: 'submitted'
        }
      })
    ]);

    return {
      pending,
      approved,
      rejected,
      needsRevision,
      total
    };
  }

  private mapReviewToDto(review: any): ReviewResponseDto {
    return {
      id: review.id,
      sessionId: review.sessionId,
      reviewerId: review.reviewerId,
      reviewerName: review.reviewer.name,
      stage: review.stage,
      status: review.status,
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

  private mapReviewToListDto(review: any): ReviewListItemDto {
    return {
      id: review.id,
      sessionId: review.sessionId,
      userId: review.session.userId,
      userName: review.session.user.name,
      groupId: review.session.groupId,
      groupName: review.session.group.groupName,
      status: review.status,
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
