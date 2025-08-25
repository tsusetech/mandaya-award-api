import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StatusProgressService } from '../common/services/status-progress.service';
import { PaginationQueryDto } from './dto/pagination.dto';
import { AssessmentAnswerDto, SubmitAssessmentDto } from './dto/assessment-answer.dto';
import { AssessmentQuestionDto } from './dto/assessment-question.dto';
import { AssessmentSessionDto } from './dto/assessment-session.dto';
import {
  ReviewCommentDto,
  ResolveReviewCommentDto,
} from './dto/review-comment.dto';
import { AssessmentSessionDetailDto } from './dto/assessment-session.dto';
import { UserAssessmentSessionDto } from './dto/user-assessment-sessions.dto';
import {
  CreateAssessmentReviewDto,
  AssessmentReviewResponseDto,
  BatchAssessmentReviewDto,
  BatchAssessmentReviewResponseDto,
  ReviewStage,
  ReviewDecision,
  JuryReviewDto,
} from './dto/user-assessment-sessions.dto';

@Injectable()
export class AssessmentsService {
  constructor(
    private prisma: PrismaService,
    private statusProgressService: StatusProgressService,
  ) {}

  async getAssessmentQuestions(
    userId: number,
    groupId: number,
    paginationQuery?: PaginationQueryDto,
  ): Promise<AssessmentSessionDto> {
    // Check if user has access to this group
    const userGroup = await this.prisma.userGroup.findUnique({
      where: { userId_groupId: { userId, groupId } },
    });

    if (!userGroup) {
      throw new BadRequestException('User is not assigned to this group');
    }

    // Get or create session with responses
    let session = await this.prisma.responseSession.findUnique({
      where: { userId_groupId: { userId, groupId } },
      include: {
        group: {
          include: {
            groupQuestions: {
              include: {
                question: {
                  include: {
                    options: {
                      where: { isActive: true },
                      orderBy: { orderNumber: 'asc' },
                    },
                  },
                },
                category: true,
              },
              orderBy: { orderNumber: 'asc' },
            },
          },
        },
        responses: {
          include: {
            question: true,
            groupQuestion: true,
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
      // Create new session
      session = await this.prisma.responseSession.create({
        data: {
          userId,
          groupId,
          progressPercentage: 0,
          autoSaveEnabled: true,
        },
        include: {
          group: {
            include: {
              groupQuestions: {
                include: {
                  question: {
                    include: {
                      options: {
                        where: { isActive: true },
                        orderBy: { orderNumber: 'asc' },
                      },
                    },
                  },
                  category: true,
                },
                orderBy: { orderNumber: 'asc' },
              },
            },
          },
          responses: {
            include: {
              question: true,
              groupQuestion: true,
            },
          },
          reviewer: {
            select: {
              name: true,
            },
          },
        },
      });
    }

    // Get review comments for this session
    const reviewComments = await this.prisma.reviewComment.findMany({
      where: { sessionId: session.id },
      include: {
        question: true,
        resolvedByUser: {
          select: {
            name: true,
          },
        },
      },
    });

    // Get the latest status from StatusProgress
    const latestStatus =
      (await this.statusProgressService.getLatestStatus(session.id)) || 'draft';

    // Group review comments by question ID for easy lookup
    const reviewCommentsByQuestion = reviewComments.reduce(
      (acc, comment) => {
        if (!acc[comment.questionId]) {
          acc[comment.questionId] = [];
        }
        acc[comment.questionId].push({
          id: comment.id,
          comment: comment.comment,
          isCritical: comment.isCritical,
          stage: comment.stage || undefined,
          createdAt: comment.createdAt.toISOString(),
          reviewerName: session.reviewer?.name || undefined,
          isResolved: comment.isResolved,
          resolvedAt: comment.resolvedAt?.toISOString(),
          resolvedByUserName: comment.resolvedByUser?.name || undefined,
          revisionNotes: comment.revisionNotes || undefined,
        });
        return acc;
      },
      {} as Record<number, ReviewCommentDto[]>,
    );

    // Map questions WITH responses (if they exist) and review comments
    const questions: AssessmentQuestionDto[] = session.group.groupQuestions.map(
      (gq) => {
        const response = session.responses.find(
          (r) => r.questionId === gq.question.id,
        );
        const questionReviewComments =
          reviewCommentsByQuestion[gq.question.id] || [];

        return {
          id: gq.question.id,
          questionText: gq.question.questionText,
          description: gq.question.description || undefined,
          inputType: gq.question.inputType as any, // Type assertion to fix inputType error
          isRequired: gq.question.isRequired,
          orderNumber: gq.orderNumber,
          sectionTitle: gq.sectionTitle || undefined,
          subsection: gq.subsection || undefined,
          isGrouped: gq.isGrouped,
          category: gq.category
            ? {
                id: gq.category.id,
                name: gq.category.name,
                description: gq.category.description || undefined,
                weight: gq.category.weight
                  ? Number(gq.category.weight)
                  : undefined,
                minValue: gq.category.minValue
                  ? Number(gq.category.minValue)
                  : undefined,
                maxValue: gq.category.maxValue
                  ? Number(gq.category.maxValue)
                  : undefined,
                scoreType: gq.category.scoreType,
              }
            : undefined,
          options: gq.question.options.map((opt) => ({
            id: opt.id,
            optionText: opt.optionText,
            optionValue: opt.optionValue,
            orderNumber: opt.orderNumber,
            isMultipleChoice: opt.isMultipleChoice || false,
            isCheckBox: opt.isCheckBox || false,
          })),
          response: response ? this.mapResponseToValue(response) : undefined,
          isAnswered: response ? response.isComplete : false,
          isSkipped: response ? response.isSkipped : false,
          reviewComments: questionReviewComments,
        };
      },
    );

    // Calculate progress based on REQUIRED questions only
    const requiredQuestions = session.group.groupQuestions.filter(
      (gq) => gq.question.isRequired,
    );
    const totalRequiredQuestions = requiredQuestions.length;
    const answeredRequiredQuestions = session.responses.filter(
      (r) =>
        r.isComplete &&
        requiredQuestions.some((gq) => gq.questionId === r.questionId),
    ).length;
    const skippedRequiredQuestions = session.responses.filter(
      (r) =>
        r.isSkipped &&
        requiredQuestions.some((gq) => gq.questionId === r.questionId),
    ).length;
    const progressPercentage =
      totalRequiredQuestions > 0
        ? Math.round(
            ((answeredRequiredQuestions + skippedRequiredQuestions) /
              totalRequiredQuestions) *
              100,
          )
        : 0;

    // Update progress if changed
    if (session.progressPercentage !== progressPercentage) {
      await this.prisma.responseSession.update({
        where: { id: session.id },
        data: { progressPercentage },
      });
    }

    return {
      id: session.id,
      userId: session.userId,
      groupId: session.groupId,
      groupName: session.group.groupName,
      status: latestStatus,
      progressPercentage,
      autoSaveEnabled: session.autoSaveEnabled,
      currentQuestionId: session.currentQuestionId || undefined,
      questions,
      startedAt: session.startedAt.toISOString(),
      lastAutoSaveAt: session.lastAutoSaveAt?.toISOString(),
      lastActivityAt: session.lastActivityAt.toISOString(),
      completedAt: session.completedAt?.toISOString(),
      submittedAt: session.submittedAt?.toISOString(),
      // Review-related fields
      reviewStage: session.stage || undefined,
      reviewDecision: session.decision || undefined,
      reviewScore: session.totalScore ? Number(session.totalScore) : undefined,
      reviewedAt: session.reviewedAt?.toISOString(),
      reviewerName: session.reviewer?.name || undefined,
      reviewComments: session.overallComments || undefined,
    };
  }

  private async updateSessionProgress(sessionId: number): Promise<void> {
    // Get all questions for this session's group
    const session = await this.prisma.responseSession.findUnique({
      where: { id: sessionId },
      include: {
        responses: true,
      },
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    const allGroupQuestions = await this.prisma.groupQuestion.findMany({
      where: { groupId: session.groupId },
      include: {
        question: true,
      },
    });

    // Calculate progress based on REQUIRED questions only
    const requiredQuestions = allGroupQuestions.filter(
      (gq) => gq.question.isRequired,
    );
    const totalRequiredQuestions = requiredQuestions.length;
    const answeredRequiredQuestions = session.responses.filter(
      (r) =>
        r.isComplete &&
        requiredQuestions.some((gq) => gq.questionId === r.questionId),
    ).length;
    const skippedRequiredQuestions = session.responses.filter(
      (r) =>
        r.isSkipped &&
        requiredQuestions.some((gq) => gq.questionId === r.questionId),
    ).length;
    const progressPercentage =
      totalRequiredQuestions > 0
        ? Math.round(
            ((answeredRequiredQuestions + skippedRequiredQuestions) /
              totalRequiredQuestions) *
              100,
          )
        : 0;

    // Update progress if changed
    if (session.progressPercentage !== progressPercentage) {
      await this.prisma.responseSession.update({
        where: { id: sessionId },
        data: { progressPercentage },
      });
    }
  }

  async submitAnswer(
    sessionId: number,
    answerDto: AssessmentAnswerDto,
  ): Promise<{ success: boolean; message: string }> {
    const session = await this.prisma.responseSession.findUnique({
      where: { id: sessionId },
      include: {
        responses: {
          where: { questionId: answerDto.questionId },
        },
      },
    });

    if (!session) {
      throw new NotFoundException('Assessment session not found');
    }

    // Get the groupQuestionId for this question
    const groupQuestion = await this.prisma.groupQuestion.findFirst({
      where: {
        groupId: session.groupId,
        questionId: answerDto.questionId,
      },
    });

    if (!groupQuestion) {
      throw new BadRequestException('Question not found in this group');
    }

    // Map value based on question type
    const mappedValue = this.mapValueByQuestionType(
      answerDto.value,
      answerDto.inputType || 'text-open',
    );

    // Check if response already exists
    const existingResponse = session.responses[0];

    if (existingResponse) {
      // Update existing response
      await this.prisma.questionResponse.update({
        where: { id: existingResponse.id },
        data: {
          ...mappedValue,
          isDraft: answerDto.isDraft,
          isComplete: answerDto.isComplete ?? !answerDto.isDraft,
          isSkipped: answerDto.isSkipped ?? false,
          timeSpentSeconds: answerDto.timeSpent || 0,
          lastModifiedAt: new Date(),
        },
      });
    } else {
      // Create new response
      await this.prisma.questionResponse.create({
        data: {
          sessionId,
          questionId: answerDto.questionId,
          groupQuestionId: groupQuestion.id,
          ...mappedValue,
          isDraft: answerDto.isDraft,
          isComplete: answerDto.isComplete ?? !answerDto.isDraft,
          isSkipped: answerDto.isSkipped ?? false,
          timeSpentSeconds: answerDto.timeSpent || 0,
          lastModifiedAt: new Date(),
        },
      });
    }

    // Update progress percentage - use frontend value if provided, otherwise calculate
    if (answerDto.progressPercentage !== undefined) {
      // Use frontend-calculated progress percentage
      await this.prisma.responseSession.update({
        where: { id: sessionId },
        data: {
          progressPercentage: answerDto.progressPercentage,
          lastActivityAt: new Date(),
        },
      });
    } else {
      // Calculate progress on backend
      await this.updateSessionProgress(sessionId);

      // Update session activity
      await this.prisma.responseSession.update({
        where: { id: sessionId },
        data: {
          lastActivityAt: new Date(),
        },
      });
    }

    return {
      success: true,
      message: 'Answer saved successfully',
    };
  }

  async submitBatchAnswers(
    sessionId: number,
    batchDto: any,
  ): Promise<{ success: boolean; savedCount: number; message: string }> {
    const session = await this.prisma.responseSession.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      throw new NotFoundException('Assessment session not found');
    }

    let savedCount = 0;

    // Handle the batch data based on what's provided
    if (batchDto.answers) {
      for (const answer of batchDto.answers) {
        try {
          await this.submitAnswer(sessionId, answer);
          savedCount++;
        } catch (error) {
          console.error(
            `Failed to save answer for question ${answer.questionId}:`,
            error,
          );
        }
      }
    }

    // Update current question if provided
    if (batchDto.currentQuestionId) {
      await this.prisma.responseSession.update({
        where: { id: sessionId },
        data: { currentQuestionId: batchDto.currentQuestionId },
      });
    }

    // Update progress percentage - use frontend value if provided, otherwise calculate
    if (batchDto.progressPercentage !== undefined) {
      // Use frontend-calculated progress percentage for the entire batch
      await this.prisma.responseSession.update({
        where: { id: sessionId },
        data: { progressPercentage: batchDto.progressPercentage },
      });
    } else {
      // Calculate progress on backend after batch operations
      await this.updateSessionProgress(sessionId);
    }

    return {
      success: true,
      savedCount,
      message: `${savedCount} answers saved successfully`,
    };
  }

  async submitAssessment(
    sessionId: number,
    submitDto?: SubmitAssessmentDto,
  ): Promise<{ success: boolean; message: string }> {
    return await this.prisma.$transaction(async (tx) => {
      const session = await tx.responseSession.findUnique({
        where: { id: sessionId },
        include: {
          user: true,
          group: {
            include: {
              groupQuestions: {
                include: {
                  question: true,
                },
                orderBy: [{ groupId: 'asc' }, { orderNumber: 'asc' }],
              },
            },
          },
          responses: true,
        },
      });

      if (!session) {
        throw new NotFoundException('Session not found');
      }

      // Check if all required questions are answered or skipped
      const requiredQuestions = session.group.groupQuestions.filter(
        (gq) => gq.question.isRequired,
      );
      const totalRequiredQuestions = requiredQuestions.length;
      const answeredRequiredQuestions = session.responses.filter(
        (r) =>
          r.isComplete &&
          requiredQuestions.some((gq) => gq.questionId === r.questionId),
      ).length;
      const skippedRequiredQuestions = session.responses.filter(
        (r) =>
          r.isSkipped &&
          requiredQuestions.some((gq) => gq.questionId === r.questionId),
      ).length;

      if (
        answeredRequiredQuestions + skippedRequiredQuestions <
        totalRequiredQuestions
      ) {
        throw new BadRequestException(
          'Cannot submit session: not all required questions are answered or skipped',
        );
      }

      // Mark all draft responses as complete
      await tx.questionResponse.updateMany({
        where: {
          sessionId,
          isDraft: true,
        },
        data: {
          isDraft: false,
          isComplete: true,
          finalizedAt: new Date(),
        },
      });

      // Mark session as submitted
      await tx.responseSession.update({
        where: { id: sessionId },
        data: {
          submittedAt: new Date(),
          lastActivityAt: new Date(),
        },
      });

      // Check if this is a resubmission by looking at the previous status or the flag from frontend
      const previousStatus = await this.statusProgressService.getLatestStatus(sessionId);
      const isResubmission = submitDto?.isResubmission || previousStatus === 'needs_revision';
      
      // Record status change in StatusProgress
      await this.statusProgressService.recordStatusChange(
        sessionId,
        isResubmission ? 'resubmitted' : 'submitted',
        session.userId,
      );

      // If this is a resubmission, automatically resolve all review comments
      if (isResubmission) {
        await tx.reviewComment.updateMany({
          where: {
            sessionId: sessionId,
            isResolved: false,
          },
          data: {
            isResolved: true,
            resolvedAt: new Date(),
            resolvedBy: session.userId,
            revisionNotes: 'Automatically resolved on resubmission',
          },
        });
      }

      return {
        success: true,
        message: isResubmission ? 'Session resubmitted successfully' : 'Session submitted successfully',
      };
    });
  }

  async getAssessmentSections(
    userId: number,
    groupId: number,
  ): Promise<{
    sections: Array<{ sectionTitle: string; subsections: string[] }>;
  }> {
    // Check if user has access to this group
    const userGroup = await this.prisma.userGroup.findUnique({
      where: { userId_groupId: { userId, groupId } },
    });

    if (!userGroup) {
      throw new BadRequestException('User is not assigned to this group');
    }

    // Get all group questions with their sections and subsections
    const groupQuestions = await this.prisma.groupQuestion.findMany({
      where: { groupId },
      select: {
        sectionTitle: true,
        subsection: true,
      },
      distinct: ['sectionTitle', 'subsection'],
    });

    // Group by section title
    const sectionsMap = new Map<string, Set<string>>();

    groupQuestions.forEach((gq) => {
      if (gq.sectionTitle) {
        if (!sectionsMap.has(gq.sectionTitle)) {
          sectionsMap.set(gq.sectionTitle, new Set());
        }
        if (gq.subsection) {
          sectionsMap.get(gq.sectionTitle)!.add(gq.subsection);
        }
      }
    });

    // Convert to array format
    const sections = Array.from(sectionsMap.entries()).map(
      ([sectionTitle, subsectionsSet]) => ({
        sectionTitle,
        subsections: Array.from(subsectionsSet).sort(),
      }),
    );

    return { sections };
  }

  async getUserAssessmentSessions(
    userId: number,
    paginationQuery?: PaginationQueryDto,
    finalStatus?: string,
  ): Promise<{
    data: UserAssessmentSessionDto[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  }> {
    const { page = 1, limit = 10 } = paginationQuery || {};
    const skip = (page - 1) * limit;

    // Get total count
    const total = await this.prisma.responseSession.count({
      where: {
        userId,
        deletedAt: null,
      },
    });

    // Get sessions with review data
    const sessions = await this.prisma.responseSession.findMany({
      where: {
        userId,
        deletedAt: null,
      },
      include: {
        user: {
          select: {
            email: true,
            name: true,
          },
        },
        group: {
          select: {
            groupName: true,
          },
        },
        reviewer: {
          select: {
            name: true,
          },
        },
      },
      skip,
      take: limit,
      orderBy: {
        lastActivityAt: 'desc',
      },
    });

    // Get status for each session and filter by finalStatus if provided
    let filteredSessions = await Promise.all(
      sessions.map(async (session) => {
        const latestStatus =
          (await this.statusProgressService.getLatestStatus(session.id)) ||
          'draft';

        return {
          session,
          status: latestStatus,
          matches: !finalStatus || latestStatus === finalStatus,
        };
      }),
    );

    // Filter by final status if provided
    if (finalStatus) {
      filteredSessions = filteredSessions.filter((item) => item.matches);
    }

    // Map to DTO
    const data: UserAssessmentSessionDto[] = filteredSessions.map((item) => {
      const session = item.session;

      return {
        id: session.id,
        sessionId: session.id,
        userId: session.userId,
        userEmail: session.user.email,
        userName: session.user.name || 'Unknown User',
        groupId: session.groupId,
        groupName: session.group.groupName,
        status: item.status,
        progressPercentage: session.progressPercentage,
        startedAt: session.startedAt.toISOString(),
        lastActivityAt: session.lastActivityAt.toISOString(),
        completedAt: session.completedAt?.toISOString(),
        submittedAt: session.submittedAt?.toISOString(),
        // Review-related fields
        reviewStage: session.stage || null,
        reviewDecision: session.decision || null,
        reviewScore: session.totalScore ? Number(session.totalScore) : null,
        reviewedAt: session.reviewedAt?.toISOString() || null,
        reviewerName: session.reviewer?.name || null,
        reviewComments: session.overallComments || null,
      };
    });

    const totalPages = Math.ceil(total / limit);
    const hasNext = page < totalPages;
    const hasPrev = page > 1;

    return {
      data,
      total: filteredSessions.length,
      page,
      limit,
      totalPages,
      hasNext,
      hasPrev,
    };
  }

  async getAllAssessmentSessions(
    paginationQuery?: PaginationQueryDto,
    finalStatus?: string,
  ): Promise<{
    data: UserAssessmentSessionDto[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  }> {
    const { page = 1, limit = 10 } = paginationQuery || {};
    const skip = (page - 1) * limit;

    // Get total count
    const total = await this.prisma.responseSession.count({
      where: {
        deletedAt: null,
      },
    });

    // Get sessions with review data
    const sessions = await this.prisma.responseSession.findMany({
      where: {
        deletedAt: null,
      },
      include: {
        user: {
          select: {
            email: true,
            name: true,
          },
        },
        group: {
          select: {
            groupName: true,
          },
        },
        reviewer: {
          select: {
            name: true,
          },
        },
      },
      skip,
      take: limit,
      orderBy: {
        lastActivityAt: 'desc',
      },
    });

    // Get status for each session and filter by finalStatus if provided
    let filteredSessions = await Promise.all(
      sessions.map(async (session) => {
        const latestStatus =
          (await this.statusProgressService.getLatestStatus(session.id)) ||
          'draft';

        return {
          session,
          status: latestStatus,
          matches: !finalStatus || latestStatus === finalStatus,
        };
      }),
    );

    // Filter by final status if provided
    if (finalStatus) {
      filteredSessions = filteredSessions.filter((item) => item.matches);
    }

    // Map to DTO
    const data: UserAssessmentSessionDto[] = filteredSessions.map((item) => {
      const session = item.session;

      return {
        id: session.id,
        sessionId: session.id,
        userId: session.userId,
        userEmail: session.user.email,
        userName: session.user.name || 'Unknown User',
        groupId: session.groupId,
        groupName: session.group.groupName,
        status: item.status,
        progressPercentage: session.progressPercentage,
        startedAt: session.startedAt.toISOString(),
        lastActivityAt: session.lastActivityAt.toISOString(),
        completedAt: session.completedAt?.toISOString(),
        submittedAt: session.submittedAt?.toISOString(),
        // Review-related fields
        reviewStage: session.stage || null,
        reviewDecision: session.decision || null,
        reviewScore: session.totalScore ? Number(session.totalScore) : null,
        reviewedAt: session.reviewedAt?.toISOString() || null,
        reviewerName: session.reviewer?.name || null,
        reviewComments: session.overallComments || null,
      };
    });

    const totalPages = Math.ceil(total / limit);
    const hasNext = page < totalPages;
    const hasPrev = page > 1;

    return {
      data,
      total: filteredSessions.length,
      page,
      limit,
      totalPages,
      hasNext,
      hasPrev,
    };
  }

  async getAssessmentSessionDetail(
    sessionId: number,
  ): Promise<AssessmentSessionDetailDto> {
    const session = await this.prisma.responseSession.findUnique({
      where: { id: sessionId },
      include: {
        user: {
          select: {
            email: true,
            name: true,
          },
        },
        group: {
          select: {
            groupName: true,
          },
        },
        responses: {
          include: {
            question: {
              include: {
                options: {
                  where: { isActive: true },
                  orderBy: { orderNumber: 'asc' },
                },
              },
            },
            groupQuestion: true,
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

    // Get the latest status from StatusProgress
    const latestStatus =
      (await this.statusProgressService.getLatestStatus(sessionId)) || 'draft';

    // Get review comments for this session
    const reviewComments = await this.prisma.reviewComment.findMany({
      where: { sessionId: session.id },
      include: {
        question: true,
        resolvedByUser: {
          select: {
            name: true,
          },
        },
      },
    });

    // Group review comments by question ID for easy lookup
    const reviewCommentsByQuestion = reviewComments.reduce(
      (acc, comment) => {
        if (!acc[comment.questionId]) {
          acc[comment.questionId] = [];
        }
        acc[comment.questionId].push({
          id: comment.id,
          comment: comment.comment,
          isCritical: comment.isCritical,
          stage: comment.stage || undefined,
          createdAt: comment.createdAt.toISOString(),
          reviewerName: session.reviewer?.name || undefined,
          isResolved: comment.isResolved,
          resolvedAt: comment.resolvedAt?.toISOString(),
          resolvedByUserName: comment.resolvedByUser?.name || undefined,
          revisionNotes: comment.revisionNotes || undefined,
        });
        return acc;
      },
      {} as Record<number, ReviewCommentDto[]>,
    );

    // Get group questions for this group
    const groupQuestions = await this.prisma.groupQuestion.findMany({
      where: { groupId: session.groupId },
      include: {
        question: {
          include: {
            options: {
              where: { isActive: true },
              orderBy: { orderNumber: 'asc' },
            },
          },
        },
        category: true,
      },
      orderBy: [{ orderNumber: 'asc' }],
    });

    // Map questions WITH responses (if they exist) and review comments
    const questions: AssessmentQuestionDto[] = groupQuestions.map((gq) => {
      const response = session.responses.find(
        (r) => r.questionId === gq.question.id,
      );
      const questionReviewComments =
        reviewCommentsByQuestion[gq.question.id] || [];

      return {
        id: gq.question.id,
        questionText: gq.question.questionText,
        description: gq.question.description || undefined,
        inputType: gq.question.inputType,
        isRequired: gq.question.isRequired,
        orderNumber: gq.orderNumber,
        sectionTitle: gq.sectionTitle || undefined,
        subsection: gq.subsection || undefined,
        isGrouped: gq.isGrouped,
        category: gq.category
          ? {
              id: gq.category.id,
              name: gq.category.name,
              description: gq.category.description || undefined,
              weight: gq.category.weight
                ? Number(gq.category.weight)
                : undefined,
              minValue: gq.category.minValue
                ? Number(gq.category.minValue)
                : undefined,
              maxValue: gq.category.maxValue
                ? Number(gq.category.maxValue)
                : undefined,
              scoreType: gq.category.scoreType,
            }
          : undefined,
        options: gq.question.options.map((opt) => ({
          id: opt.id,
          optionText: opt.optionText,
          optionValue: opt.optionValue,
          orderNumber: opt.orderNumber,
          isMultipleChoice: opt.isMultipleChoice || false,
          isCheckBox: opt.isCheckBox || false,
        })),
        response: response ? this.mapResponseToValue(response) : undefined,
        isAnswered: response ? response.isComplete : false,
        isSkipped: response ? response.isSkipped : false,
        reviewComments: questionReviewComments,
      };
    });

    return {
      id: session.id,
      userId: session.userId,
      groupId: session.groupId,
      groupName: session.group.groupName,
      status: latestStatus,
      progressPercentage: session.progressPercentage,
      autoSaveEnabled: session.autoSaveEnabled,
      currentQuestionId: session.currentQuestionId || undefined,
      questions,
      startedAt: session.startedAt.toISOString(),
      lastAutoSaveAt: session.lastAutoSaveAt?.toISOString(),
      lastActivityAt: session.lastActivityAt.toISOString(),
      completedAt: session.completedAt?.toISOString(),
      submittedAt: session.submittedAt?.toISOString(),
      // Review-related fields
      reviewStage: session.stage || null,
      reviewDecision: session.decision || null,
      reviewScore: session.totalScore ? Number(session.totalScore) : null,
      reviewedAt: session.reviewedAt?.toISOString() || null,
      reviewerName: session.reviewer?.name || null,
      reviewComments: session.overallComments || null,
    };
  }

  async createAssessmentReview(
    reviewerId: number,
    sessionId: number,
    createReviewDto: CreateAssessmentReviewDto,
  ): Promise<AssessmentReviewResponseDto> {
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
      await this.statusProgressService.getResponseSessionStatus(sessionId);
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
      case ReviewDecision.APPROVE:
        status = 'approved';
        break;
      case ReviewDecision.REJECT:
        status = 'rejected';
        break;
      case ReviewDecision.NEEDS_REVISION:
        status = 'needs_revision';
        break;
      case ReviewDecision.PASS_TO_JURY:
        status = 'in_progress';
        break;
      case ReviewDecision.NEEDS_DELIBERATION:
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
      reviewId: updatedSession.id,
      sessionId: updatedSession.id,
      reviewerId: updatedSession.reviewerId!,
      reviewerName: updatedSession.reviewer?.name || 'Unknown Reviewer',
      stage: updatedSession.stage!,
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
      reviewedAt:
        updatedSession.reviewedAt?.toISOString() || new Date().toISOString(),
      message: 'Assessment review created successfully',
      isNewReview: true,
      totalCommentsAdded: 0,
      totalScoresAdded: 0,
    };
  }

  async createBatchAssessmentReview(
    reviewerId: number,
    sessionId: number,
    batchReviewDto: BatchAssessmentReviewDto,
    updateExisting: boolean = false,
  ): Promise<BatchAssessmentReviewResponseDto> {
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
    } = batchReviewDto;

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
      await this.statusProgressService.getResponseSessionStatus(sessionId);
    if (sessionStatus !== 'submitted' && sessionStatus !== 'resubmitted') {
      throw new BadRequestException(
        'Session must be submitted or resubmitted before it can be reviewed',
      );
    }

    // Check if review already exists and handle accordingly
    const hasExistingReview =
      session.reviewerId || session.stage || session.decision;

    let updatedSession;
    let isNewReview = false;
    let totalCommentsAdded = 0;
    let totalScoresAdded = 0;

    if (hasExistingReview && updateExisting) {
      // Update existing review
      updatedSession = await this.updateExistingReview(
        sessionId,
        reviewerId,
        batchReviewDto,
      );
    } else {
      // Create new review (allows multiple reviews even if one already exists)
      updatedSession = await this.createNewReview(
        sessionId,
        reviewerId,
        batchReviewDto,
      );
      isNewReview = true;
    }

    // Count added comments and scores
    if (questionComments) {
      totalCommentsAdded = questionComments.length;
    }
    if (juryScores) {
      totalScoresAdded = juryScores.length;
    }

    return {
      reviewId: updatedSession.id,
      sessionId: updatedSession.id,
      reviewerId: updatedSession.reviewerId!,
      stage: updatedSession.stage!,
      decision: updatedSession.decision!,
      overallComments: updatedSession.overallComments || undefined,
      totalScore: updatedSession.totalScore
        ? Number(updatedSession.totalScore)
        : undefined,
      reviewedAt:
        updatedSession.reviewedAt?.toISOString() || new Date().toISOString(),
      reviewerName: updatedSession.reviewer?.name || 'Unknown Reviewer',
      message: isNewReview
        ? 'Assessment review created successfully'
        : 'Assessment review updated successfully',
      isNewReview,
      totalCommentsAdded,
      totalScoresAdded,
    };
  }

  private async createNewReview(
    sessionId: number,
    reviewerId: number,
    batchReviewDto: BatchAssessmentReviewDto,
  ) {
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
    } = batchReviewDto;

    // Determine review status based on decision and stage
    const status = this.determineReviewStatus(decision);

    return await this.prisma.$transaction(async (prisma) => {
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

      // Create jury scores if provided (will update existing scores due to unique constraint)
      if (juryScores && juryScores.length > 0) {
        for (const score of juryScores) {
          await prisma.juryScore.upsert({
            where: {
              sessionId_questionId: {
                sessionId,
                questionId: score.questionId,
              },
            },
            update: {
              score: score.score,
              comments: score.comments,
            },
            create: {
              sessionId,
              questionId: score.questionId,
              score: score.score,
              comments: score.comments,
            },
          });
        }
      }

      return updatedSession;
    });
  }

  private async updateExistingReview(
    sessionId: number,
    reviewerId: number,
    batchReviewDto: BatchAssessmentReviewDto,
  ) {
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
    } = batchReviewDto;

    // Determine review status based on decision and stage
    const status = this.determineReviewStatus(decision);

    return await this.prisma.$transaction(async (prisma) => {
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

      // Delete existing comments (but keep scores for upsert)
      await prisma.reviewComment.deleteMany({
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

      // Create new jury scores if provided (will update existing scores due to unique constraint)
      if (juryScores && juryScores.length > 0) {
        for (const score of juryScores) {
          await prisma.juryScore.upsert({
            where: {
              sessionId_questionId: {
                sessionId,
                questionId: score.questionId,
              },
            },
            update: {
              score: score.score,
              comments: score.comments,
            },
            create: {
              sessionId,
              questionId: score.questionId,
              score: score.score,
              comments: score.comments,
            },
          });
        }
      }

      return updatedSession;
    });
  }

  private determineReviewStatus(decision: ReviewDecision): string {
    switch (decision) {
      case ReviewDecision.APPROVE:
        return 'approved';
      case ReviewDecision.REJECT:
        return 'rejected';
      case ReviewDecision.NEEDS_REVISION:
        return 'needs_revision';
      case ReviewDecision.PASS_TO_JURY:
        return 'in_progress';
      case ReviewDecision.NEEDS_DELIBERATION:
        return 'deliberated';
      default:
        throw new BadRequestException('Invalid review decision');
    }
  }

  private mapValueByQuestionType(value: any, inputType: string) {
    switch (inputType) {
      case 'text-open':
        // Handle complex text values with additional data
        if (typeof value === 'object' && value !== null) {
          const result: any = {};

          // Extract the main answer text
          if (value.answer !== undefined) {
            result.textValue = value.answer.toString();
          }

          // Store the entire object in arrayValue for backup
          result.arrayValue = value;

          return result;
        }
        // Handle simple string values
        return { textValue: value?.toString() || null };
      case 'numeric':
        return { numericValue: value ? parseFloat(value) : null };
      case 'numeric-open':
        // Handle complex numeric values with additional data
        if (typeof value === 'object' && value !== null) {
          const result: any = {};

          // Extract numeric value
          if (value.answer !== undefined) {
            result.numericValue = parseFloat(value.answer) || null;
          }

          // Extract URL or other text data
          if (value.url !== undefined) {
            result.textValue = value.url.toString();
          }

          // Store the entire object in arrayValue for backup
          result.arrayValue = value;

          return result;
        }
        // Fallback for simple numeric values
        return { numericValue: value ? parseFloat(value) : null };
      case 'checkbox':
        // Handle complex checkbox values (arrays with objects)
        if (Array.isArray(value)) {
          return { arrayValue: value };
        }
        // Handle simple boolean values
        return { booleanValue: Boolean(value) };
      case 'multiple-choice':
      case 'file-upload':
        return { arrayValue: Array.isArray(value) ? value : [value] };
      default:
        return { textValue: value?.toString() || null };
    }
  }

  private mapResponseToValue(response: any): any {
    // For text-open type with complex objects, reconstruct the object
    if (
      response.arrayValue !== null &&
      typeof response.arrayValue === 'object'
    ) {
      // Check if this looks like a text-open response with answer and url
      if (
        response.arrayValue.answer !== undefined &&
        response.arrayValue.url !== undefined
      ) {
        return response.arrayValue;
      }
      // Check if this looks like a numeric-open response
      if (
        response.arrayValue.answer !== undefined ||
        response.arrayValue.url !== undefined
      ) {
        return response.arrayValue;
      }
    }

    // For checkbox type with array values, return the array
    if (response.arrayValue !== null && Array.isArray(response.arrayValue)) {
      return response.arrayValue;
    }

    // For other types, return the first non-null value
    if (response.textValue !== null) return response.textValue;
    if (response.numericValue !== null) return response.numericValue;
    if (response.booleanValue !== null) return response.booleanValue;
    if (response.arrayValue !== null) return response.arrayValue;
    return null;
  }

  // Removed getAssessmentReviews method - use reviews service instead

  async resolveReviewComment(
    sessionId: number,
    commentId: number,
    userId: number,
    resolveDto: ResolveReviewCommentDto,
  ): Promise<{ success: boolean; message: string }> {
    // Check if session exists
    const session = await this.prisma.responseSession.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      throw new NotFoundException('Assessment session not found');
    }

    // Check if comment exists and belongs to this session
    const comment = await this.prisma.reviewComment.findFirst({
      where: {
        id: commentId,
        sessionId: sessionId,
      },
    });

    if (!comment) {
      throw new NotFoundException('Review comment not found');
    }

    // Update the comment
    await this.prisma.reviewComment.update({
      where: { id: commentId },
      data: {
        isResolved: resolveDto.isResolved,
        resolvedAt: resolveDto.isResolved ? new Date() : null,
        resolvedBy: resolveDto.isResolved ? userId : null,
        revisionNotes: resolveDto.revisionNotes || null,
      },
    });

    return {
      success: true,
      message: resolveDto.isResolved
        ? 'Comment marked as resolved'
        : 'Comment marked as unresolved',
    };
  }

  async resolveAllReviewComments(
    sessionId: number,
    userId: number,
    resolveDto: ResolveReviewCommentDto,
  ): Promise<{ success: boolean; message: string; resolvedCount: number }> {
    // Check if session exists
    const session = await this.prisma.responseSession.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      throw new NotFoundException('Assessment session not found');
    }

    // Get all unresolved comments for this session
    const unresolvedComments = await this.prisma.reviewComment.findMany({
      where: {
        sessionId: sessionId,
        isResolved: false,
      },
    });

    if (unresolvedComments.length === 0) {
      return {
        success: true,
        message: 'No unresolved comments found',
        resolvedCount: 0,
      };
    }

    // Update all unresolved comments
    await this.prisma.reviewComment.updateMany({
      where: {
        sessionId: sessionId,
        isResolved: false,
      },
      data: {
        isResolved: resolveDto.isResolved,
        resolvedAt: resolveDto.isResolved ? new Date() : null,
        resolvedBy: resolveDto.isResolved ? userId : null,
        revisionNotes: resolveDto.revisionNotes || null,
      },
    });

    return {
      success: true,
      message: resolveDto.isResolved
        ? `${unresolvedComments.length} comments marked as resolved`
        : `${unresolvedComments.length} comments marked as unresolved`,
      resolvedCount: unresolvedComments.length,
    };
  }

  async getJuryDashboard(
    userId: number,
    options: {
      search?: string;
      page?: number;
      limit?: number;
    },
  ) {
    const { search, page = 1, limit = 10 } = options;
    const skip = (page - 1) * limit;

    // Build search conditions
    const searchConditions = search
      ? {
          OR: [
            {
              group: {
                groupName: {
                  contains: search,
                  mode: 'insensitive' as const,
                },
              },
            },
            {
              user: {
                name: {
                  contains: search,
                  mode: 'insensitive' as const,
                },
              },
            },
            {
              user: {
                email: {
                  contains: search,
                  mode: 'insensitive' as const,
                },
              },
            },
          ],
        }
      : {};

    // Get all sessions for jury review (submitted and passed to jury)
    const allSessions = await this.prisma.responseSession.findMany({
      where: {
        deletedAt: null,
        ...searchConditions,
      },
      include: {
        user: {
          select: {
            email: true,
            name: true,
          },
        },
        group: {
          select: {
            groupName: true,
          },
        },
        reviewer: {
          select: {
            name: true,
          },
        },
      },
      orderBy: {
        lastActivityAt: 'desc',
      },
    });

    // Get status for each session and categorize them
    const sessionsWithStatus = await Promise.all(
      allSessions.map(async (session) => {
        const latestStatus =
          (await this.statusProgressService.getLatestStatus(session.id)) ||
          'draft';

        return {
          session,
          status: latestStatus,
        };
      }),
    );

    // Calculate statistics based on both status and decision
    const statistics = {
      totalAssigned: sessionsWithStatus.filter(s => {
        // Only include sessions that have been approved by admin (decision: approve) or are in jury stages
        return s.session.decision === 'approve' ||
               ['passed_to_jury', 'jury_scoring', 'jury_deliberation', 'final_decision', 'completed'].includes(s.status);
      }).length,
      reviewed: sessionsWithStatus.filter(s => 
        ['completed', 'final_decision'].includes(s.status)
      ).length,
      inProgress: sessionsWithStatus.filter(s => 
        ['jury_scoring', 'jury_deliberation', 'under_review'].includes(s.status)
      ).length,
      pending: sessionsWithStatus.filter(s => {
        // Sessions with 'approve' decision are pending for jury review
        return s.session.decision === 'approve';
      }).length,
    };

    // Filter sessions for recent reviews (only approved and jury stages)
    const reviewableSessions = sessionsWithStatus.filter(s =>
      s.session.decision === 'approve' ||
      ['passed_to_jury', 'jury_scoring', 'jury_deliberation', 'final_decision', 'completed'].includes(s.status)
    );

    // Apply pagination to recent reviews
    const paginatedSessions = reviewableSessions.slice(skip, skip + limit);

    // Map to DTO format
    const recentReviews = paginatedSessions.map((item) => {
      const session = item.session;
      return {
        id: session.id,
        sessionId: session.id,
        groupName: session.group.groupName,
        userName: session.user.name || 'Unknown User',
        userEmail: session.user.email,
        submittedAt: session.submittedAt?.toISOString() || session.lastActivityAt.toISOString(),
        status: item.status,
        progressPercentage: session.progressPercentage,
      };
    });

    const totalPages = Math.ceil(reviewableSessions.length / limit);
    const hasNext = page < totalPages;
    const hasPrev = page > 1;

    return {
      statistics,
      recentReviews,
      pagination: {
        total: reviewableSessions.length,
        page,
        limit,
        totalPages,
        hasNext,
        hasPrev,
      },
    };
  }

  async getJuryReviews(
    userId: number,
    options: {
      search?: string;
      filter?: 'all' | 'pending' | 'in_progress' | 'completed';
      page?: number;
      limit?: number;
    },
  ) {
    const { search, filter = 'all', page = 1, limit = 10 } = options;
    const skip = (page - 1) * limit;

    // Build search conditions
    const searchConditions = search
      ? {
          OR: [
            {
              group: {
                groupName: {
                  contains: search,
                  mode: 'insensitive' as const,
                },
              },
            },
            {
              user: {
                name: {
                  contains: search,
                  mode: 'insensitive' as const,
                },
              },
            },
            {
              user: {
                email: {
                  contains: search,
                  mode: 'insensitive' as const,
                },
              },
            },
          ],
        }
      : {};

    // Get all sessions for jury review
    const allSessions = await this.prisma.responseSession.findMany({
      where: {
        deletedAt: null,
        ...searchConditions,
      },
      include: {
        user: {
          select: {
            email: true,
            name: true,
          },
        },
        group: {
          select: {
            groupName: true,
          },
        },
        reviewer: {
          select: {
            name: true,
          },
        },
      },
      orderBy: {
        lastActivityAt: 'desc',
      },
    });

    // Get status for each session and categorize them
    const sessionsWithStatus = await Promise.all(
      allSessions.map(async (session) => {
        const latestStatus =
          (await this.statusProgressService.getLatestStatus(session.id)) ||
          'draft';

        return {
          session,
          status: latestStatus,
        };
      }),
    );

    // Filter sessions based on the selected filter
    let filteredSessions = sessionsWithStatus.filter((s) => {
      // Base filtering: only include sessions that are approved by admin or in jury stages
      const isJuryEligible = s.session.decision === 'approve' ||
        ['passed_to_jury', 'jury_scoring', 'jury_deliberation', 'final_decision', 'completed'].includes(s.status);
      
      if (!isJuryEligible) {
        return false;
      }
      
      // Apply specific filter
      switch (filter) {
        case 'pending':
          // Only sessions with 'approve' decision
          return s.session.decision === 'approve';
        case 'in_progress':
          return ['jury_scoring', 'jury_deliberation', 'under_review'].includes(s.status);
        case 'completed':
          return ['completed', 'final_decision'].includes(s.status);
        case 'all':
        default:
          return true;
      }
    });

    // Calculate filter counts for the UI tabs
    const filterCounts = {
      all: sessionsWithStatus.filter(s => 
        s.session.decision === 'approve' ||
        ['passed_to_jury', 'jury_scoring', 'jury_deliberation', 'final_decision', 'completed'].includes(s.status)
      ).length,
      pending: sessionsWithStatus.filter(s => 
        s.session.decision === 'approve'
      ).length,
      inProgress: sessionsWithStatus.filter(s => 
        ['jury_scoring', 'jury_deliberation', 'under_review'].includes(s.status)
      ).length,
      completed: sessionsWithStatus.filter(s => 
        ['completed', 'final_decision'].includes(s.status)
      ).length,
    };

    // Apply pagination
    const paginatedSessions = filteredSessions.slice(skip, skip + limit);

    // Map to DTO format
    const submissions = paginatedSessions.map((item) => {
      const session = item.session;
      return {
        id: session.id,
        sessionId: session.id,
        groupName: session.group.groupName,
        userName: session.user.name || 'Unknown User',
        userEmail: session.user.email,
        submittedAt: session.submittedAt?.toISOString() || session.lastActivityAt.toISOString(),
        status: item.status,
        progressPercentage: session.progressPercentage,
        decision: session.decision || null,
        stage: session.stage || null,
      };
    });

    const totalPages = Math.ceil(filteredSessions.length / limit);
    const hasNext = page < totalPages;
    const hasPrev = page > 1;

    return {
      submissions,
      pagination: {
        total: filteredSessions.length,
        page,
        limit,
        totalPages,
        hasNext,
        hasPrev,
      },
      filters: filterCounts,
    };
  }

  async submitJuryReview(
    juryId: number,
    sessionId: number,
    juryReviewDto: JuryReviewDto,
  ): Promise<{ sessionId: number; totalScoresAdded: number; message: string }> {
    const {
      juryScores,
    } = juryReviewDto;

    // Check if session exists
    const session = await this.prisma.responseSession.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      throw new NotFoundException('Assessment session not found');
    }

    let totalScoresAdded = 0;

    // Only insert jury scores if provided
    if (juryScores && juryScores.length > 0) {
      // Use upsert to handle both insert and update cases
      const scorePromises = juryScores.map(async (score) => {
        return this.prisma.juryScore.upsert({
          where: {
            sessionId_questionId: {
              sessionId,
              questionId: score.questionId,
            },
          },
          update: {
            score: score.score,
            comments: score.comments,
          },
          create: {
            sessionId,
            questionId: score.questionId,
            score: score.score,
            comments: score.comments,
          },
        });
      });

      await Promise.all(scorePromises);
      totalScoresAdded = juryScores.length;
    }

    return {
      sessionId,
      totalScoresAdded,
      message: 'Jury scores saved successfully',
    };
  }
}
