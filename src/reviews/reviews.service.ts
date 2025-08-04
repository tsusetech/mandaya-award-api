import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateReviewDto, ReviewStatus, ReviewDecision } from './dto/create-review.dto';
import { UpdateReviewDto } from './dto/update-review.dto';
import { ReviewResponseDto } from './dto/review-response.dto';
import { ReviewListResponseDto, ReviewListItemDto } from './dto/review-list.dto';

@Injectable()
export class ReviewsService {
  constructor(private prisma: PrismaService) {}

  async createReview(reviewerId: number, createReviewDto: CreateReviewDto): Promise<ReviewResponseDto> {
    const { sessionId, decision, overallComments, questionComments, internalNotes } = createReviewDto;

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

    // Determine review status based on decision
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
          status,
          decision,
          overallComments,
          internalNotes,
          reviewedAt: new Date()
        }
      });

      // Create question comments if provided
      if (questionComments && questionComments.length > 0) {
        await prisma.reviewComment.createMany({
          data: questionComments.map(comment => ({
            reviewId: newReview.id,
            questionId: comment.questionId,
            comment: comment.comment,
            isCritical: comment.isCritical || false
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

    const { decision, overallComments, questionComments, internalNotes } = updateReviewDto;

    // Determine new status based on decision
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
        default:
          throw new BadRequestException('Invalid review decision');
      }
    }

    // Update review with transaction
    const updatedReview = await this.prisma.$transaction(async (prisma) => {
      // Update main review
      const updated = await prisma.review.update({
        where: { id: reviewId },
        data: {
          status: status || review.status,
          decision: decision || review.decision,
          overallComments,
          internalNotes,
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
          }
        }
      });

      // Update question comments if provided
      if (questionComments) {
        // Delete existing comments
        await prisma.reviewComment.deleteMany({
          where: { reviewId }
        });

        // Create new comments
        if (questionComments.length > 0) {
          await prisma.reviewComment.createMany({
            data: questionComments.map(comment => ({
              reviewId,
              questionId: comment.questionId,
              comment: comment.comment,
              isCritical: comment.isCritical || false
            }))
          });
        }
      }

      // Update session status
      await prisma.responseSession.update({
        where: { id: review.sessionId },
        data: {
          reviewStatus: status || review.status,
          reviewedAt: new Date()
        }
      });

      return updated;
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
      status: review.status,
      decision: review.decision,
      overallComments: review.overallComments,
      internalNotes: review.internalNotes,
      questionComments: review.comments.map(comment => ({
        id: comment.id,
        questionId: comment.questionId,
        comment: comment.comment,
        isCritical: comment.isCritical,
        createdAt: comment.createdAt
      })),
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
