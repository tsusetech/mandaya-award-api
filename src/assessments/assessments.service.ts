import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StatusProgressService } from '../common/services/status-progress.service';
import { PaginationQueryDto } from './dto/pagination.dto';
import { AssessmentAnswerDto } from './dto/assessment-answer.dto';
import { AssessmentQuestionDto } from './dto/assessment-question.dto';
import { AssessmentSessionDto } from './dto/assessment-session.dto';
import { ReviewCommentDto } from './dto/review-comment.dto';
import { AssessmentSessionDetailDto } from './dto/assessment-session.dto';
import { UserAssessmentSessionDto } from './dto/user-assessment-sessions.dto';
import { 
  CreateAssessmentReviewDto,
  AssessmentReviewResponseDto,
  BatchAssessmentReviewDto, 
  BatchAssessmentReviewResponseDto,
  ReviewStage,
  ReviewDecision
} from './dto/user-assessment-sessions.dto';

@Injectable()
export class AssessmentsService {
  constructor(
    private prisma: PrismaService,
    private statusProgressService: StatusProgressService
  ) {}

  async getAssessmentQuestions(
    userId: number, 
    groupId: number, 
    paginationQuery?: PaginationQueryDto
  ): Promise<AssessmentSessionDto> {
    // Check if user has access to this group
    const userGroup = await this.prisma.userGroup.findUnique({
      where: { userId_groupId: { userId, groupId } }
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
                      orderBy: { orderNumber: 'asc' }
                    }
                  }
                }
              },
              orderBy: { orderNumber: 'asc' }
            }
          }
        },
        responses: {
          include: {
            question: true,
            groupQuestion: true
          }
        },
        reviewer: {
          select: {
            name: true
          }
        }
      }
    });

    if (!session) {
      // Create new session
      session = await this.prisma.responseSession.create({
        data: {
          userId,
          groupId,
          progressPercentage: 0,
          autoSaveEnabled: true
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
                        orderBy: { orderNumber: 'asc' }
                      }
                    }
                  }
                },
                orderBy: { orderNumber: 'asc' }
              }
            }
          },
          responses: {
            include: {
              question: true,
              groupQuestion: true
            }
          },
          reviewer: {
            select: {
              name: true
            }
          }
        }
      });
    }

    // Get review comments for this session
    const reviewComments = await this.prisma.reviewComment.findMany({
      where: { sessionId: session.id },
      include: {
        question: true
      }
    });

    // Get the latest status from StatusProgress
    const latestStatus = await this.statusProgressService.getLatestStatus(session.id) || 'draft';

    // Group review comments by question ID for easy lookup
    const reviewCommentsByQuestion = reviewComments.reduce((acc, comment) => {
      if (!acc[comment.questionId]) {
        acc[comment.questionId] = [];
      }
      acc[comment.questionId].push({
        id: comment.id,
        comment: comment.comment,
        isCritical: comment.isCritical,
        stage: comment.stage || undefined,
        createdAt: comment.createdAt.toISOString(),
        reviewerName: session.reviewer?.name || undefined
      });
      return acc;
    }, {} as Record<number, ReviewCommentDto[]>);

    // Map questions WITH responses (if they exist) and review comments
    const questions: AssessmentQuestionDto[] = session.group.groupQuestions.map(gq => {
      const response = session.responses.find(r => r.questionId === gq.question.id);
      const questionReviewComments = reviewCommentsByQuestion[gq.question.id] || [];

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
        options: gq.question.options.map(opt => ({
          id: opt.id,
          optionText: opt.optionText,
          optionValue: opt.optionValue,
          orderNumber: opt.orderNumber,
          isMultipleChoice: opt.isMultipleChoice || false,
          isCheckBox: opt.isCheckBox || false
        })),
        response: response ? this.mapResponseToValue(response) : undefined,
        isAnswered: response ? response.isComplete : false,
        isSkipped: response ? response.isSkipped : false,
        reviewComments: questionReviewComments
      };
    });

    // Calculate progress based on REQUIRED questions only
    const requiredQuestions = session.group.groupQuestions.filter(gq => gq.question.isRequired);
    const totalRequiredQuestions = requiredQuestions.length;
    const answeredRequiredQuestions = session.responses.filter(r => 
      r.isComplete && requiredQuestions.some(gq => gq.questionId === r.questionId)
    ).length;
    const skippedRequiredQuestions = session.responses.filter(r => 
      r.isSkipped && requiredQuestions.some(gq => gq.questionId === r.questionId)
    ).length;
    const progressPercentage = totalRequiredQuestions > 0 
      ? Math.round(((answeredRequiredQuestions + skippedRequiredQuestions) / totalRequiredQuestions) * 100) 
      : 0;

    // Update progress if changed
    if (session.progressPercentage !== progressPercentage) {
      await this.prisma.responseSession.update({
        where: { id: session.id },
        data: { progressPercentage }
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
      reviewComments: session.overallComments || undefined
    };
  }

  private async updateSessionProgress(sessionId: number): Promise<void> {
    // Get all questions for this session's group
    const session = await this.prisma.responseSession.findUnique({
      where: { id: sessionId },
      include: {
        responses: true
      }
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    const allGroupQuestions = await this.prisma.groupQuestion.findMany({
      where: { groupId: session.groupId },
      include: {
        question: true
      }
    });

    // Calculate progress based on REQUIRED questions only
    const requiredQuestions = allGroupQuestions.filter(gq => gq.question.isRequired);
    const totalRequiredQuestions = requiredQuestions.length;
    const answeredRequiredQuestions = session.responses.filter(r => 
      r.isComplete && requiredQuestions.some(gq => gq.questionId === r.questionId)
    ).length;
    const skippedRequiredQuestions = session.responses.filter(r => 
      r.isSkipped && requiredQuestions.some(gq => gq.questionId === r.questionId)
    ).length;
    const progressPercentage = totalRequiredQuestions > 0 
      ? Math.round(((answeredRequiredQuestions + skippedRequiredQuestions) / totalRequiredQuestions) * 100) 
      : 0;

    // Update progress if changed
    if (session.progressPercentage !== progressPercentage) {
      await this.prisma.responseSession.update({
        where: { id: sessionId },
        data: { progressPercentage }
      });
    }
  }

  async submitAnswer(sessionId: number, answerDto: AssessmentAnswerDto): Promise<{ success: boolean; message: string }> {
    const session = await this.prisma.responseSession.findUnique({
      where: { id: sessionId },
      include: {
        responses: {
          where: { questionId: answerDto.questionId }
        }
      }
    });

    if (!session) {
      throw new NotFoundException('Assessment session not found');
    }

    // Get the groupQuestionId for this question
    const groupQuestion = await this.prisma.groupQuestion.findFirst({
      where: {
        groupId: session.groupId,
        questionId: answerDto.questionId
      }
    });

    if (!groupQuestion) {
      throw new BadRequestException('Question not found in this group');
    }

    // Map value based on question type
    const mappedValue = this.mapValueByQuestionType(answerDto.value, answerDto.inputType || 'text-open');

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
          lastModifiedAt: new Date()
        }
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
          lastModifiedAt: new Date()
        }
      });
    }

    // Update progress percentage - use frontend value if provided, otherwise calculate
    if (answerDto.progressPercentage !== undefined) {
      // Use frontend-calculated progress percentage
      await this.prisma.responseSession.update({
        where: { id: sessionId },
        data: { 
          progressPercentage: answerDto.progressPercentage,
          lastActivityAt: new Date()
        }
      });
    } else {
      // Calculate progress on backend
      await this.updateSessionProgress(sessionId);
      
      // Update session activity
      await this.prisma.responseSession.update({
        where: { id: sessionId },
        data: {
          lastActivityAt: new Date()
        }
      });
    }

    return {
      success: true,
      message: 'Answer saved successfully'
    };
  }

  async submitBatchAnswers(sessionId: number, batchDto: any): Promise<{ success: boolean; savedCount: number; message: string }> {
    const session = await this.prisma.responseSession.findUnique({
      where: { id: sessionId }
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
          console.error(`Failed to save answer for question ${answer.questionId}:`, error);
        }
      }
    }

    // Update current question if provided
    if (batchDto.currentQuestionId) {
      await this.prisma.responseSession.update({
        where: { id: sessionId },
        data: { currentQuestionId: batchDto.currentQuestionId }
      });
    }

    // Update progress percentage - use frontend value if provided, otherwise calculate
    if (batchDto.progressPercentage !== undefined) {
      // Use frontend-calculated progress percentage for the entire batch
      await this.prisma.responseSession.update({
        where: { id: sessionId },
        data: { progressPercentage: batchDto.progressPercentage }
      });
    } else {
      // Calculate progress on backend after batch operations
      await this.updateSessionProgress(sessionId);
    }

    return {
      success: true,
      savedCount,
      message: `${savedCount} answers saved successfully`
    };
  }

  async submitAssessment(sessionId: number): Promise<{ success: boolean; message: string }> {
    return await this.prisma.$transaction(async (tx) => {
      const session = await tx.responseSession.findUnique({
        where: { id: sessionId },
        include: {
          user: true,
          group: {
            include: {
              groupQuestions: {
                include: {
                  question: true
                },
                orderBy: [
                  { groupId: 'asc' },
                  { orderNumber: 'asc' },
                ],
              }
            }
          },
          responses: true
        }
      });

      if (!session) {
        throw new NotFoundException('Session not found');
      }

      // Check if all required questions are answered or skipped
      const requiredQuestions = session.group.groupQuestions.filter(gq => gq.question.isRequired);
      const totalRequiredQuestions = requiredQuestions.length;
      const answeredRequiredQuestions = session.responses.filter(r => 
        r.isComplete && requiredQuestions.some(gq => gq.questionId === r.questionId)
      ).length;
      const skippedRequiredQuestions = session.responses.filter(r => 
        r.isSkipped && requiredQuestions.some(gq => gq.questionId === r.questionId)
      ).length;

      if (answeredRequiredQuestions + skippedRequiredQuestions < totalRequiredQuestions) {
        throw new BadRequestException('Cannot submit session: not all required questions are answered or skipped');
      }

      // Mark all draft responses as complete
      await tx.questionResponse.updateMany({
        where: {
          sessionId,
          isDraft: true
        },
        data: {
          isDraft: false,
          isComplete: true,
          finalizedAt: new Date()
        }
      });

      // Mark session as submitted
      await tx.responseSession.update({
        where: { id: sessionId },
        data: {
          submittedAt: new Date(),
          lastActivityAt: new Date()
        }
      });

      // Record status change in StatusProgress
      await this.statusProgressService.recordStatusChange(
        sessionId,
        'submitted',
        session.userId
      );

      return {
        success: true,
        message: 'Session submitted successfully'
      };
    });
  }

  async getAssessmentSections(userId: number, groupId: number): Promise<{
    sections: Array<{ sectionTitle: string; subsections: string[] }>;
  }> {
    // Check if user has access to this group
    const userGroup = await this.prisma.userGroup.findUnique({
      where: { userId_groupId: { userId, groupId } }
    });

    if (!userGroup) {
      throw new BadRequestException('User is not assigned to this group');
    }

    // Get all group questions with their sections and subsections
    const groupQuestions = await this.prisma.groupQuestion.findMany({
      where: { groupId },
      select: {
        sectionTitle: true,
        subsection: true
      },
      distinct: ['sectionTitle', 'subsection']
    });

    // Group by section title
    const sectionsMap = new Map<string, Set<string>>();

    groupQuestions.forEach(gq => {
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
    const sections = Array.from(sectionsMap.entries()).map(([sectionTitle, subsectionsSet]) => ({
      sectionTitle,
      subsections: Array.from(subsectionsSet).sort()
    }));

    return { sections };
  }

  async getUserAssessmentSessions(
    userId: number,
    paginationQuery?: PaginationQueryDto,
    finalStatus?: string
  ): Promise<{ data: UserAssessmentSessionDto[]; total: number; page: number; limit: number; totalPages: number; hasNext: boolean; hasPrev: boolean }> {
    const { page = 1, limit = 10 } = paginationQuery || {};
    const skip = (page - 1) * limit;

    // Get total count
    const total = await this.prisma.responseSession.count({
      where: {
        userId,
        deletedAt: null
      }
    });

    // Get sessions with review data
    const sessions = await this.prisma.responseSession.findMany({
      where: {
        userId,
        deletedAt: null
      },
      include: {
        user: {
          select: {
            email: true,
            name: true
          }
        },
        group: {
          select: {
            groupName: true
          }
        },
        reviewer: {
          select: {
            name: true
          }
        }
      },
      skip,
      take: limit,
      orderBy: {
        lastActivityAt: 'desc'
      }
    });

    // Get status for each session and filter by finalStatus if provided
    let filteredSessions = await Promise.all(
      sessions.map(async (session) => {
        const latestStatus = await this.statusProgressService.getLatestStatus(session.id) || 'draft';
        
        return {
          session,
          status: latestStatus,
          matches: !finalStatus || latestStatus === finalStatus
        };
      })
    );

    // Filter by final status if provided
    if (finalStatus) {
      filteredSessions = filteredSessions.filter(item => item.matches);
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
        reviewComments: session.overallComments || null
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
      hasPrev
    };
  }

  async getAssessmentSessionDetail(sessionId: number): Promise<AssessmentSessionDetailDto> {
    const session = await this.prisma.responseSession.findUnique({
      where: { id: sessionId },
      include: {
        user: {
          select: {
            email: true,
            name: true
          }
        },
        group: {
          select: {
            groupName: true
          }
        },
        responses: {
          include: {
            question: {
              include: {
                options: {
                  where: { isActive: true },
                  orderBy: { orderNumber: 'asc' }
                }
              }
            },
            groupQuestion: true
          }
        },
        reviewer: {
          select: {
            name: true
          }
        }
      }
    });

    if (!session) {
      throw new NotFoundException('Assessment session not found');
    }

    // Get the latest status from StatusProgress
    const latestStatus = await this.statusProgressService.getLatestStatus(sessionId) || 'draft';

    // Get review comments for this session
    const reviewComments = await this.prisma.reviewComment.findMany({
      where: { sessionId: session.id },
      include: {
        question: true
      }
    });

    // Group review comments by question ID for easy lookup
    const reviewCommentsByQuestion = reviewComments.reduce((acc, comment) => {
      if (!acc[comment.questionId]) {
        acc[comment.questionId] = [];
      }
      acc[comment.questionId].push({
        id: comment.id,
        comment: comment.comment,
        isCritical: comment.isCritical,
        stage: comment.stage || undefined,
        createdAt: comment.createdAt.toISOString(),
        reviewerName: session.reviewer?.name || undefined
      });
      return acc;
    }, {} as Record<number, ReviewCommentDto[]>);

    // Get group questions for this group
    const groupQuestions = await this.prisma.groupQuestion.findMany({
      where: { groupId: session.groupId },
      include: {
        question: {
          include: {
            options: {
              where: { isActive: true },
              orderBy: { orderNumber: 'asc' }
            }
          }
        }
      },
      orderBy: [
        { orderNumber: 'asc' }
      ]
    });

    // Map questions WITH responses (if they exist) and review comments
    const questions: AssessmentQuestionDto[] = groupQuestions.map(gq => {
      const response = session.responses.find(r => r.questionId === gq.question.id);
      const questionReviewComments = reviewCommentsByQuestion[gq.question.id] || [];

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
        options: gq.question.options.map(opt => ({
          id: opt.id,
          optionText: opt.optionText,
          optionValue: opt.optionValue,
          orderNumber: opt.orderNumber,
          isMultipleChoice: opt.isMultipleChoice || false,
          isCheckBox: opt.isCheckBox || false
        })),
        response: response ? this.mapResponseToValue(response) : undefined,
        isAnswered: response ? response.isComplete : false,
        isSkipped: response ? response.isSkipped : false,
        reviewComments: questionReviewComments
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
      reviewComments: session.overallComments || null
    };
  }

  async createAssessmentReview(
    reviewerId: number, 
    sessionId: number, 
    createReviewDto: CreateAssessmentReviewDto
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
      validationChecklist 
    } = createReviewDto;

    // Check if session exists and is submitted
    const session = await this.prisma.responseSession.findUnique({
      where: { id: sessionId },
      include: {
        user: {
          select: {
            name: true
          }
        }
      }
    });

    if (!session) {
      throw new NotFoundException('Assessment session not found');
    }

    // Check if session is submitted using StatusProgress
    const sessionStatus = await this.statusProgressService.getResponseSessionStatus(sessionId);
    if (sessionStatus !== 'submitted' && sessionStatus !== 'resubmitted') {
      throw new BadRequestException('Session must be submitted or resubmitted before it can be reviewed');
    }

    // Check if review already exists (now checking session review fields)
    if (session.reviewerId || session.stage || session.decision) {
      throw new BadRequestException('Review already exists for this session. Use update endpoint to modify your review.');
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
      case ReviewDecision.REQUEST_REVISION:
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
          reviewedAt: new Date()
        },
        include: {
          user: {
            select: {
              name: true
            }
          },
          reviewer: {
            select: {
              name: true
            }
          }
        }
      });

      // Record review status in StatusProgress
      await this.statusProgressService.recordStatusChange(
        sessionId,
        status,
        reviewerId
      );

      // Create question comments if provided
      if (questionComments && questionComments.length > 0) {
        await prisma.reviewComment.createMany({
          data: questionComments.map(comment => ({
            sessionId, // Changed from reviewId to sessionId
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
            sessionId, // Changed from reviewId to sessionId
            questionId: score.questionId,
            score: score.score,
            comments: score.comments
          }))
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
      totalScore: updatedSession.totalScore ? Number(updatedSession.totalScore) : undefined,
      deliberationNotes: updatedSession.deliberationNotes || undefined,
      internalNotes: updatedSession.internalNotes || undefined,
      validationChecklist: Array.isArray(updatedSession.validationChecklist) ? (updatedSession.validationChecklist as string[]) : undefined,
      reviewedAt: updatedSession.reviewedAt?.toISOString() || new Date().toISOString(),
      message: 'Assessment review created successfully',
      isNewReview: true,
      totalCommentsAdded: 0,
      totalScoresAdded: 0
    };
  }

  async createBatchAssessmentReview(
    reviewerId: number,
    sessionId: number,
    batchReviewDto: BatchAssessmentReviewDto,
    updateExisting: boolean = false
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
      validationChecklist 
    } = batchReviewDto;

    // Check if session exists and is submitted
    const session = await this.prisma.responseSession.findUnique({
      where: { id: sessionId },
      include: {
        user: {
          select: {
            name: true
          }
        }
      }
    });

    if (!session) {
      throw new NotFoundException('Assessment session not found');
    }

    // Check if session is submitted using StatusProgress
    const sessionStatus = await this.statusProgressService.getResponseSessionStatus(sessionId);
    if (sessionStatus !== 'submitted' && sessionStatus !== 'resubmitted') {
      throw new BadRequestException('Session must be submitted or resubmitted before it can be reviewed');
    }

    // Check if review already exists (now checking session review fields)
    if (session.reviewerId || session.stage || session.decision) {
      if (!updateExisting) {
        throw new BadRequestException('Review already exists for this session. Use update endpoint to modify your review.');
      }
    }

    let updatedSession;
    let isNewReview = false;
    let totalCommentsAdded = 0;
    let totalScoresAdded = 0;

    if (session.reviewerId && updateExisting) {
      // Update existing review
      updatedSession = await this.updateExistingReview(
        sessionId,
        reviewerId,
        batchReviewDto
      );
    } else {
      // Create new review
      updatedSession = await this.createNewReview(
        sessionId,
        reviewerId,
        batchReviewDto
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
      totalScore: updatedSession.totalScore ? Number(updatedSession.totalScore) : undefined,
      reviewedAt: updatedSession.reviewedAt?.toISOString() || new Date().toISOString(),
      reviewerName: updatedSession.reviewer?.name || 'Unknown Reviewer',
      message: isNewReview ? 'Assessment review created successfully' : 'Assessment review updated successfully',
      isNewReview,
      totalCommentsAdded,
      totalScoresAdded
    };
  }

  private async createNewReview(
    sessionId: number,
    reviewerId: number,
    batchReviewDto: BatchAssessmentReviewDto
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
      validationChecklist 
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
          reviewedAt: new Date()
        },
        include: {
          reviewer: {
            select: {
              name: true
            }
          }
        }
      });

      // Record review status in StatusProgress
      await this.statusProgressService.recordStatusChange(
        sessionId,
        status,
        reviewerId
      );

      // Create question comments if provided
      if (questionComments && questionComments.length > 0) {
        await prisma.reviewComment.createMany({
          data: questionComments.map(comment => ({
            sessionId, // Changed from reviewId to sessionId
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
            sessionId, // Changed from reviewId to sessionId
            questionId: score.questionId,
            score: score.score,
            comments: score.comments
          }))
        });
      }

      return updatedSession;
    });
  }

  private async updateExistingReview(
    sessionId: number,
    reviewerId: number,
    batchReviewDto: BatchAssessmentReviewDto
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
      validationChecklist 
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
          reviewedAt: new Date()
        },
        include: {
          reviewer: {
            select: {
              name: true
            }
          }
        }
      });

      // Record review status in StatusProgress
      await this.statusProgressService.recordStatusChange(
        sessionId,
        status,
        reviewerId
      );

      // Delete existing comments and scores
      await prisma.reviewComment.deleteMany({
        where: { sessionId } // Changed from reviewId to sessionId
      });

      await prisma.juryScore.deleteMany({
        where: { sessionId } // Changed from reviewId to sessionId
      });

      // Create new question comments if provided
      if (questionComments && questionComments.length > 0) {
        await prisma.reviewComment.createMany({
          data: questionComments.map(comment => ({
            sessionId, // Changed from reviewId to sessionId
            questionId: comment.questionId,
            comment: comment.comment,
            isCritical: comment.isCritical || false,
            stage: comment.stage || stage
          }))
        });
      }

      // Create new jury scores if provided
      if (juryScores && juryScores.length > 0) {
        await prisma.juryScore.createMany({
          data: juryScores.map(score => ({
            sessionId, // Changed from reviewId to sessionId
            questionId: score.questionId,
            score: score.score,
            comments: score.comments
          }))
        });
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
      case ReviewDecision.REQUEST_REVISION:
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
    // For numeric-open type, reconstruct the complex object
    if (response.arrayValue !== null && typeof response.arrayValue === 'object') {
      // Check if this looks like a numeric-open response
      if (response.arrayValue.answer !== undefined || response.arrayValue.url !== undefined) {
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
}

