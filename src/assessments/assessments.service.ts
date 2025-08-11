import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StatusProgressService } from '../common/services/status-progress.service';
import { AssessmentSessionDto } from './dto/assessment-session.dto';
import { AssessmentQuestionDto } from './dto/assessment-question.dto';
import { AssessmentAnswerDto } from './dto/assessment-answer.dto';
import { BatchAnswerDto } from './dto/batch-answer.dto';
import { PaginationQueryDto, PaginatedResponseDto } from './dto/pagination.dto';
import { QuestionInputType } from './dto/assessment-question.dto';
import { UserAssessmentSessionsQueryDto, UserAssessmentSessionDto } from './dto/user-assessment-sessions.dto';
import { CombinedStatus } from './dto/combined-status.enum';
import { AssessmentStatus } from './dto/assessment-session.dto';
import { ReviewCommentDto } from './dto/review-comment.dto';
import { AssessmentSessionDetailDto } from './dto/assessment-session.dto';
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
        group: true,
        responses: {
          include: {
            question: true,
            groupQuestion: true
          }
        },
        review: {
          include: {
            reviewer: {
              select: {
                name: true
              }
            }
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
          group: true,
          responses: {
            include: {
              question: true,
              groupQuestion: true
            }
          },
          review: {
            include: {
              reviewer: {
                select: {
                  name: true
                }
              }
            }
          }
        }
      });

      // Record initial status in StatusProgress
      await this.statusProgressService.recordStatusChange(
        'response_session',
        session.id,
        'draft',
        userId,
        { action: 'create_session' }
      );
    } else {
      // Only update lastActivityAt, don't modify status here
      await this.prisma.responseSession.update({
        where: { id: session.id },
        data: {
          lastActivityAt: new Date()
        }
      });
      
      // Update the session object for the response
      session.lastActivityAt = new Date();
    }

    // Get current status from StatusProgress
    const currentStatus = await this.statusProgressService.getCurrentStatus('response_session', session.id);
    let sessionCurrentStatus = currentStatus?.status || 'draft';

    // Get current review status from StatusProgress if review exists
    let currentReviewStatus: string | null = null;
    if (session.review) {
      const reviewStatus = await this.statusProgressService.getCurrentStatus('review', session.review.id);
      currentReviewStatus = reviewStatus?.status || null;
    }

    // Calculate final status with resubmission detection
    const finalStatus = await this.calculateCombinedStatusWithResubmission(
      sessionCurrentStatus, // Use current status from StatusProgress for final status calculation
      currentReviewStatus,
      session.review?.stage || null,
      session.id
    );

    // Check if finalStatus filter is provided and if the session matches
    if (paginationQuery?.finalStatus && finalStatus !== paginationQuery.finalStatus) {
      throw new BadRequestException(`Session status '${finalStatus}' does not match requested status '${paginationQuery.finalStatus}'`);
    }

    // After calculating finalStatus, check if it's a resubmission
    if (finalStatus === CombinedStatus.RESUBMITTED && sessionCurrentStatus !== 'resubmitted') {
      // Update the session status to resubmitted via StatusProgress only
      
      // Record the status change in StatusProgress
      await this.statusProgressService.recordStatusChange(
        'response_session',
        session.id,
        'resubmitted',
        userId,
        { action: 'resubmission_detected' }
      );
      
      // Update the current status for this response
      sessionCurrentStatus = 'resubmitted';
    }

    // Get ALL questions for this group (for progress calculation)
    const allGroupQuestions = await this.prisma.groupQuestion.findMany({
      where: { groupId },
      select: { id: true }
    });

    // Get questions with full details for display
    let groupQuestions = await this.prisma.groupQuestion.findMany({
      where: { groupId },
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
    });

    // Apply filtering if provided (but no pagination) 
    if (paginationQuery?.sectionTitle) {
      groupQuestions = groupQuestions.filter(gq => 
        gq.sectionTitle?.toLowerCase().includes(paginationQuery.sectionTitle!.toLowerCase())
      );
    }
    
    if (paginationQuery?.subsection) {
      groupQuestions = groupQuestions.filter(gq => 
        gq.subsection?.toLowerCase().includes(paginationQuery.subsection!.toLowerCase())
      );
    }

    // Get review comments for all questions in this session
    const reviewComments = await this.prisma.reviewComment.findMany({
      where: {
        review: {
          sessionId: session.id
        }
      },
      include: {
        review: {
          include: {
            reviewer: {
              select: {
                name: true
              }
            }
          }
        }
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
        reviewerName: comment.review.reviewer.name || undefined
      });
      return acc;
    }, {} as Record<number, ReviewCommentDto[]>);

    // Map questions WITH responses (if they exist) and review comments
    const questions: AssessmentQuestionDto[] = groupQuestions.map(gq => {
      const response = session.responses.find(r => r.questionId === gq.question.id);
      const questionReviewComments = reviewCommentsByQuestion[gq.question.id] || [];
      
      return {
        id: gq.question.id,
        questionText: gq.question.questionText,
        description: gq.question.description || undefined,
        inputType: gq.question.inputType as QuestionInputType,
        isRequired: gq.question.isRequired,
        orderNumber: gq.orderNumber,
        sectionTitle: gq.sectionTitle || undefined,
        subsection: gq.subsection || undefined,
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
        reviewComments: questionReviewComments // Always include, will be empty array if no comments
      };
    });

    // Calculate progress based on ALL questions in the group (not filtered)
    const totalQuestionsInGroup = allGroupQuestions.length;
    const answeredQuestions = session.responses.filter(r => r.isComplete).length;
    const skippedQuestions = session.responses.filter(r => r.isSkipped).length;
    const progressPercentage = totalQuestionsInGroup > 0 
      ? Math.round(((answeredQuestions + skippedQuestions) / totalQuestionsInGroup) * 100) 
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
      status: sessionCurrentStatus as AssessmentStatus,
      progressPercentage,
      autoSaveEnabled: session.autoSaveEnabled,
      currentQuestionId: session.currentQuestionId || undefined,
      questions,
      startedAt: session.startedAt.toISOString(),
      lastAutoSaveAt: session.lastAutoSaveAt?.toISOString(),
      lastActivityAt: session.lastActivityAt.toISOString(),
      completedAt: session.completedAt?.toISOString(),
      submittedAt: session.submittedAt?.toISOString()
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
      select: { id: true }
    });

    // Calculate progress based on ALL questions in the group
    const totalQuestionsInGroup = allGroupQuestions.length;
    const answeredQuestions = session.responses.filter(r => r.isComplete).length;
    const skippedQuestions = session.responses.filter(r => r.isSkipped).length;
    const progressPercentage = totalQuestionsInGroup > 0 
      ? Math.round(((answeredQuestions + skippedQuestions) / totalQuestionsInGroup) * 100) 
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

  async submitBatchAnswers(sessionId: number, batchDto: BatchAnswerDto): Promise<{ success: boolean; savedCount: number; message: string }> {
    const session = await this.prisma.responseSession.findUnique({
      where: { id: sessionId }
    });

    if (!session) {
      throw new NotFoundException('Assessment session not found');
    }

    let savedCount = 0;

    for (const answer of batchDto.answers) {
      try {
        await this.submitAnswer(sessionId, answer);
        savedCount++;
      } catch (error) {
        console.error(`Failed to save answer for question ${answer.questionId}:`, error);
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
          group: {
            include: {
              groupQuestions: {
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

      // Check if this is a resubmission (was previously in needs_revision status)
      const wasPreviouslyNeedsRevision = await this.wasSessionPreviouslyNeedsRevision(sessionId);

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

      if (wasPreviouslyNeedsRevision) {
        // Mark session as resubmitted instead of submitted
        await tx.responseSession.update({
          where: { id: sessionId },
          data: {
            submittedAt: new Date(),
            lastActivityAt: new Date()
          }
        });

        // Record status change in StatusProgress
        await this.statusProgressService.recordStatusChange(
          'response_session',
          sessionId,
          'resubmitted',
          session.userId,
          { 
            action: 'resubmit_session'
          }
        );
      } else {
        // Original logic for first-time submission
        await tx.responseSession.update({
          where: { id: sessionId },
          data: {
            submittedAt: new Date(),
            lastActivityAt: new Date()
          }
        });

        await this.statusProgressService.recordStatusChange(
          'response_session',
          sessionId,
          'submitted',
          session.userId,
          { 
            action: 'submit_session'
          }
        );
      }

      return {
        success: true,
        message: wasPreviouslyNeedsRevision ? 'Session resubmitted successfully' : 'Session submitted successfully'
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
    query: UserAssessmentSessionsQueryDto
  ): Promise<PaginatedResponseDto<UserAssessmentSessionDto>> {
    const { page = 1, limit = 10, finalStatus, reviewStage, groupId } = query;
    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {};
    
    if (groupId) {
      where.groupId = groupId;
    }

    // Add review stage filter if provided
    if (reviewStage) {
      where.review = {
        stage: reviewStage
      };
    }

    // Get total count
    const total = await this.prisma.responseSession.count({ where });

    // Get sessions with user, group, and review information
    const sessions = await this.prisma.responseSession.findMany({
      where,
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
        review: {
          include: {
            reviewer: {
              select: {
                name: true
              }
            }
          }
        }
      },
      orderBy: {
        lastActivityAt: 'desc'
      },
      skip,
      take: limit
    });

    // Get latest status from StatusProgress for each session
    const sessionsWithStatus = await Promise.all(
      sessions.map(async (session) => {
        const currentStatus = await this.statusProgressService.getCurrentStatus('response_session', session.id);
        const currentReviewStatus = session.review ? 
          await this.statusProgressService.getCurrentStatus('review', session.review.id) : null;

        return {
          ...session,
          currentStatus: currentStatus?.status || 'draft',
          currentReviewStatus: currentReviewStatus?.status || null
        };
      })
    );

    // Filter by final status if provided
    let filteredSessions = sessionsWithStatus;
    if (finalStatus) {
      filteredSessions = sessionsWithStatus.filter(session => {
        const sessionStatus = session.currentStatus;
        const reviewStatus = session.currentReviewStatus;
        
        return this.matchesCombinedStatus(finalStatus, sessionStatus, reviewStatus, session.review?.stage || null);
      });
    }

    // Map to DTO with explicit null handling
    const data: UserAssessmentSessionDto[] = await Promise.all(filteredSessions.map(async (session) => {
      const finalStatus = await this.calculateCombinedStatusWithResubmission(
        session.currentStatus,
        session.currentReviewStatus, 
        session.review?.stage || null,
        session.id
      );

      return {
        id: session.id,
        sessionId: session.id, // Add sessionId field for clarity
        userId: session.userId,
        userEmail: session.user.email,
        userName: session.user.name || 'Unknown User',
        groupId: session.groupId,
        groupName: session.group.groupName,
        status: session.currentStatus as AssessmentStatus,
        finalStatus,
        progressPercentage: session.progressPercentage,
        startedAt: session.startedAt.toISOString(),
        lastActivityAt: session.lastActivityAt.toISOString(),
        completedAt: session.completedAt?.toISOString(),
        submittedAt: session.submittedAt?.toISOString(),
        reviewStatus: session.currentReviewStatus,
        // Review-related fields - explicitly handle null values
        reviewStage: session.review?.stage || null,
        reviewDecision: session.review?.decision || null,
        reviewScore: session.review?.totalScore ? Number(session.review.totalScore) : null,
        reviewedAt: session.review?.reviewedAt?.toISOString() || null,
        reviewerName: session.review?.reviewer?.name || null,
        reviewComments: session.review?.overallComments || null
      };
    }));

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

  /**
   * Determines if a session matches the given combined status
   */
  private matchesCombinedStatus(
    combinedStatus: CombinedStatus, 
    sessionStatus: string, 
    reviewStatus: string | null, 
    reviewStage: string | null
  ): boolean {
    switch (combinedStatus) {
      case CombinedStatus.DRAFT:
        return sessionStatus === 'draft';
      
      case CombinedStatus.IN_PROGRESS:
        return sessionStatus === 'in_progress';
      
      case CombinedStatus.SUBMITTED:
        return sessionStatus === 'submitted' && !reviewStatus;
      
      case CombinedStatus.PENDING_REVIEW:
        return sessionStatus === 'submitted' && (!reviewStatus || reviewStatus === 'pending');
      
      case CombinedStatus.UNDER_REVIEW:
        return sessionStatus === 'submitted' && reviewStatus === 'under_review';
      
      case CombinedStatus.NEEDS_REVISION:
        return sessionStatus === 'submitted' && reviewStatus === 'needs_revision';
      
      case CombinedStatus.APPROVED:
        return sessionStatus === 'submitted' && reviewStatus === 'approved';
      
      case CombinedStatus.REJECTED:
        return sessionStatus === 'submitted' && reviewStatus === 'rejected';
      
      case CombinedStatus.PASSED_TO_JURY:
        return sessionStatus === 'submitted' && reviewStatus === 'passed_to_jury';
      
      case CombinedStatus.JURY_SCORING:
        return sessionStatus === 'submitted' && reviewStage === 'jury_scoring';
      
      case CombinedStatus.JURY_DELIBERATION:
        return sessionStatus === 'submitted' && reviewStage === 'jury_deliberation';
      
      case CombinedStatus.FINAL_DECISION:
        return sessionStatus === 'submitted' && reviewStage === 'final_decision';
      
      case CombinedStatus.COMPLETED:
        return sessionStatus === 'submitted' && (
          reviewStatus === 'approved' || 
          reviewStatus === 'rejected' || 
          reviewStatus === 'completed'
        );
      
      default:
        return false;
    }
  }

  /**
   * Calculates the combined status based on session status, review status, and review stage
   */
  private calculateCombinedStatus(
    sessionStatus: string, 
    reviewStatus: string | null, 
    reviewStage: string | null
  ): CombinedStatus {
    // Session statuses
    if (sessionStatus === 'draft') {
      return CombinedStatus.DRAFT;
    }
    
    if (sessionStatus === 'in_progress') {
      return CombinedStatus.IN_PROGRESS;
    }
    
    if (sessionStatus === 'submitted') {
      // If no review status, it's just submitted
      if (!reviewStatus) {
        return CombinedStatus.SUBMITTED;
      }
      
      // Review statuses
      switch (reviewStatus) {
        case 'pending':
          return CombinedStatus.PENDING_REVIEW;
        case 'under_review':
          return CombinedStatus.UNDER_REVIEW;
        case 'needs_revision':
          return CombinedStatus.NEEDS_REVISION;
        case 'approved':
          return CombinedStatus.APPROVED;
        case 'rejected':
          return CombinedStatus.REJECTED;
        case 'passed_to_jury':
          return CombinedStatus.PASSED_TO_JURY;
        case 'completed':
          return CombinedStatus.COMPLETED;
      }
      
      // Review stages (if review status doesn't match but stage does)
      if (reviewStage) {
        switch (reviewStage) {
          case 'jury_scoring':
            return CombinedStatus.JURY_SCORING;
          case 'jury_deliberation':
            return CombinedStatus.JURY_DELIBERATION;
          case 'final_decision':
            return CombinedStatus.FINAL_DECISION;
        }
      }
      
      // Default for submitted with unknown review status
      return CombinedStatus.PENDING_REVIEW;
    }
    
    // Default fallback
    return CombinedStatus.DRAFT;
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
        review: {
          include: {
            reviewer: {
              select: {
                name: true
              }
            }
          }
        }
      }
    });

    if (!session) {
      throw new NotFoundException('Assessment session not found');
    }

    // Get latest status from StatusProgress
    const currentStatus = await this.statusProgressService.getCurrentStatus('response_session', session.id);

    // Get latest review status from StatusProgress
    const currentReviewStatus = session.review ? 
      await this.statusProgressService.getCurrentStatus('review', session.review.id) : null;

    // Get all questions for this group
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
      orderBy: { orderNumber: 'asc' }
    });

    // Get review comments for all questions in this session
    const reviewComments = await this.prisma.reviewComment.findMany({
      where: {
        review: {
          sessionId: session.id
        }
      },
      include: {
        review: {
          include: {
            reviewer: {
              select: {
                name: true
              }
            }
          }
        }
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
        reviewerName: comment.review.reviewer.name || undefined
      });
      return acc;
    }, {} as Record<number, ReviewCommentDto[]>);

    // Map questions with responses and review comments
    const questions: AssessmentQuestionDto[] = groupQuestions.map(gq => {
      const response = session.responses.find(r => r.questionId === gq.question.id);
      const questionReviewComments = reviewCommentsByQuestion[gq.question.id] || [];
      
      return {
        id: gq.question.id,
        questionText: gq.question.questionText,
        description: gq.question.description || undefined,
        inputType: gq.question.inputType as QuestionInputType,
        isRequired: gq.question.isRequired,
        orderNumber: gq.orderNumber,
        sectionTitle: gq.sectionTitle || undefined,
        subsection: gq.subsection || undefined,
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
      userEmail: session.user.email,
      userName: session.user.name || 'Unknown User',
      groupId: session.groupId,
      groupName: session.group.groupName,
      status: (currentStatus?.status || 'draft') as AssessmentStatus,
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
      reviewStage: session.review?.stage || null,
      reviewDecision: session.review?.decision || null,
      reviewScore: session.review?.totalScore ? Number(session.review.totalScore) : null,
      reviewedAt: session.review?.reviewedAt?.toISOString() || null,
      reviewerName: session.review?.reviewer?.name || null,
      reviewComments: session.review?.overallComments || null
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

    // Check if session is submitted or resubmitted using StatusProgress
    const sessionStatus = await this.statusProgressService.getResponseSessionStatus(sessionId);
    if (sessionStatus !== 'submitted' && sessionStatus !== 'resubmitted') {
      throw new BadRequestException('Session must be submitted or resubmitted before it can be reviewed');
    }

    // Check if this specific reviewer already has a review for this session
    const existingReview = await this.prisma.review.findFirst({
      where: { 
        sessionId,
        reviewerId 
      }
    });

    if (existingReview) {
      throw new BadRequestException('You have already reviewed this session. Use update endpoint to modify your review.');
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
          reviewer: {
            select: {
              name: true
            }
          }
        }
      });

      // Record review status in StatusProgress
      await this.statusProgressService.recordStatusChange(
        'review',
        newReview.id,
        status,
        reviewerId,
        { 
          action: 'create_review',
          stage,
          decision
        }
      );

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

      // Update session reviewedAt timestamp
      await prisma.responseSession.update({
        where: { id: sessionId },
        data: {
          reviewedAt: new Date()
        }
      });

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

    return {
      id: review.id,
      sessionId: review.sessionId,
      reviewerId: review.reviewerId,
      stage: review.stage,
      decision: review.decision,
      overallComments: review.overallComments || undefined,
      totalScore: review.totalScore ? Number(review.totalScore) : undefined,
      reviewedAt: review.reviewedAt?.toISOString() || new Date().toISOString(),
      reviewerName: review.reviewer?.name || 'Unknown Reviewer',
      message: 'Assessment review created successfully'
    };
  }

  async createBatchAssessmentReview(
    reviewerId: number, 
    sessionId: number, 
    batchReviewDto: BatchAssessmentReviewDto
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
      updateExisting = false
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

    // Check if session is submitted or resubmitted using StatusProgress
    const sessionStatus = await this.statusProgressService.getResponseSessionStatus(sessionId);
    if (sessionStatus !== 'submitted' && sessionStatus !== 'resubmitted') {
      throw new BadRequestException('Session must be submitted or resubmitted before it can be reviewed');
    }

    // Check if this specific reviewer already has a review for this session
    const existingReview = await this.prisma.review.findFirst({
      where: { 
        sessionId,
        reviewerId 
      }
    });

    let review;
    let isNewReview = false;
    let totalCommentsAdded = 0;
    let totalScoresAdded = 0;

    if (existingReview && updateExisting) {
      // Update existing review by this reviewer
      review = await this.updateExistingReview(
        existingReview.id,
        reviewerId,
        sessionId,
        batchReviewDto
      );
    } else if (existingReview && !updateExisting) {
      // Create new review (incremental mode) - allow multiple reviews per session
      review = await this.createIncrementalReview(
        reviewerId,
        sessionId,
        existingReview,
        batchReviewDto
      );
      isNewReview = true;
    } else {
      // Create first review by this reviewer
      review = await this.createFirstReview(
        reviewerId,
        sessionId,
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
      reviewId: review.id,
      sessionId: review.sessionId,
      reviewerId: review.reviewerId,
      stage: review.stage,
      decision: review.decision,
      overallComments: review.overallComments || undefined,
      totalScore: review.totalScore ? Number(review.totalScore) : undefined,
      reviewedAt: review.reviewedAt?.toISOString() || new Date().toISOString(),
      reviewerName: review.reviewer?.name || 'Unknown Reviewer',
      message: isNewReview ? 'Assessment review created successfully' : 'Assessment review updated successfully',
      isNewReview,
      totalCommentsAdded,
      totalScoresAdded
    };
  }

  private async createFirstReview(
    reviewerId: number,
    sessionId: number,
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
          reviewer: {
            select: {
              name: true
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

      // Update session reviewedAt timestamp
      await prisma.responseSession.update({
        where: { id: sessionId },
        data: {
          reviewedAt: new Date()
        }
      });

      // Record review status change in StatusProgress
      await this.statusProgressService.recordStatusChange(
        'review',
        newReview.id,
        status,
        reviewerId,
        { 
          action: 'create_first_review',
          stage,
          decision,
          sessionId
        }
      );

      return newReview;
    });
  }

  private async createIncrementalReview(
    reviewerId: number,
    sessionId: number,
    existingReview: any,
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
      // Create a new review entry (incremental)
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
          reviewer: {
            select: {
              name: true
            }
          }
        }
      });

      // Add new question comments (don't remove existing ones)
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

      // Add new jury scores (don't remove existing ones)
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

      // Update session reviewedAt timestamp
      await prisma.responseSession.update({
        where: { id: sessionId },
        data: {
          reviewedAt: new Date()
        }
      });

      // Record review status change in StatusProgress
      await this.statusProgressService.recordStatusChange(
        'review',
        newReview.id,
        status,
        reviewerId,
        { 
          action: 'create_incremental_review',
          stage,
          decision,
          sessionId
        }
      );

      return newReview;
    });
  }

  private async updateExistingReview(
    reviewId: number,
    reviewerId: number,
    sessionId: number,
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
      // Update the existing review
      const updatedReview = await prisma.review.update({
        where: { id: reviewId },
        data: {
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

      // Update question comments (replace existing ones for this review)
      if (questionComments !== undefined) {
        // Remove existing comments for this review
        await prisma.reviewComment.deleteMany({
          where: { reviewId }
        });

        // Add new comments
        if (questionComments.length > 0) {
          await prisma.reviewComment.createMany({
            data: questionComments.map(comment => ({
              reviewId,
              questionId: comment.questionId,
              comment: comment.comment,
              isCritical: comment.isCritical || false,
              stage: comment.stage || stage
            }))
          });
        }
      }

      // Update jury scores (replace existing ones for this review)
      if (juryScores !== undefined) {
        // Remove existing scores for this review
        await prisma.juryScore.deleteMany({
          where: { reviewId }
        });

        // Add new scores
        if (juryScores.length > 0) {
          await prisma.juryScore.createMany({
            data: juryScores.map(score => ({
              reviewId,
              questionId: score.questionId,
              score: score.score,
              comments: score.comments
            }))
          });
        }
      }

      // Update session reviewedAt timestamp
      await prisma.responseSession.update({
        where: { id: sessionId },
        data: {
          reviewedAt: new Date()
        }
      });

      // Record review status change in StatusProgress
      await this.statusProgressService.recordStatusChange(
        'review',
        reviewId,
        status,
        reviewerId,
        { 
          action: 'update_existing_review',
          stage,
          decision,
          sessionId
        }
      );

      return updatedReview;
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
      case 'checkbox':
        return { booleanValue: Boolean(value) };
      case 'multiple-choice':
      case 'file-upload':
        return { arrayValue: Array.isArray(value) ? value : [value] };
      default:
        return { textValue: value?.toString() || null };
    }
  }

  private mapResponseToValue(response: any): any {
    if (response.textValue !== null) return response.textValue;
    if (response.numericValue !== null) return response.numericValue;
    if (response.booleanValue !== null) return response.booleanValue;
    if (response.arrayValue !== null) return response.arrayValue;
    return null;
  }

  async getAssessmentReviews(sessionId: number): Promise<AssessmentReviewResponseDto[]> {
    const session = await this.prisma.responseSession.findUnique({
      where: { id: sessionId }
    });

    if (!session) {
      throw new NotFoundException('Assessment session not found');
    }

    const reviews = await this.prisma.review.findMany({
      where: { sessionId },
      include: {
        reviewer: {
          select: {
            name: true
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
      },
      orderBy: {
        reviewedAt: 'desc'
      }
    });

    return reviews.map(review => ({
      id: review.id,
      sessionId: review.sessionId,
      reviewerId: review.reviewerId,
      stage: review.stage,
      decision: review.decision,
      overallComments: review.overallComments || undefined,
      totalScore: review.totalScore ? Number(review.totalScore) : undefined,
      reviewedAt: review.reviewedAt?.toISOString() || '',
      reviewerName: review.reviewer?.name || 'Unknown Reviewer',
      message: 'Review retrieved successfully'
    }));
  }

  /**
   * Check if a session was previously in needs_revision status
   */
  private async wasSessionPreviouslyNeedsRevision(sessionId: number): Promise<boolean> {
    // Check if there's a review with needs_revision status in StatusProgress
    const reviews = await this.prisma.review.findMany({
      where: { sessionId },
      select: { id: true }
    });

    for (const review of reviews) {
      const currentStatus = await this.statusProgressService.getCurrentStatus('review', review.id);
      if (currentStatus?.status === 'needs_revision') {
        return true;
      }
    }

    // Check StatusProgress history for any review that was previously needs_revision
    const statusProgress = await this.prisma.statusProgress.findFirst({
      where: {
        entityType: 'review',
        entityId: {
          in: await this.prisma.review.findMany({
            where: { sessionId },
            select: { id: true }
          }).then(reviews => reviews.map(r => r.id))
        },
        status: 'needs_revision'
      },
      orderBy: {
        changedAt: 'desc'
      }
    });

    return !!statusProgress;
  }

  /**
   * Calculates the combined status with resubmission detection
   */
  private async calculateCombinedStatusWithResubmission(
    sessionStatus: string, 
    reviewStatus: string | null, 
    reviewStage: string | null,
    sessionId: number
  ): Promise<CombinedStatus> {
    // Session statuses
    if (sessionStatus === 'draft') {
      return CombinedStatus.DRAFT;
    }
    
    if (sessionStatus === 'in_progress') {
      return CombinedStatus.IN_PROGRESS;
    }
    
    if (sessionStatus === 'submitted') {
      // If no review status, it's just submitted
      if (!reviewStatus) {
        return CombinedStatus.SUBMITTED;
      }
      
      // Review statuses
      switch (reviewStatus) {
        case 'pending':
          return CombinedStatus.PENDING_REVIEW;
        case 'under_review':
          return CombinedStatus.UNDER_REVIEW;
        case 'needs_revision':
          return CombinedStatus.NEEDS_REVISION;
        case 'approved':
          return CombinedStatus.APPROVED;
        case 'rejected':
          return CombinedStatus.REJECTED;
        case 'passed_to_jury':
          return CombinedStatus.PASSED_TO_JURY;
        case 'completed':
          return CombinedStatus.COMPLETED;
      }
      
      // Review stages
      if (reviewStage) {
        switch (reviewStage) {
          case 'jury_scoring':
            return CombinedStatus.JURY_SCORING;
          case 'jury_deliberation':
            return CombinedStatus.JURY_DELIBERATION;
          case 'final_decision':
            return CombinedStatus.FINAL_DECISION;
        }
      }
      
      return CombinedStatus.PENDING_REVIEW;
    }
    
    // Handle resubmitted status - this should take priority
    if (sessionStatus === 'resubmitted') {
      return CombinedStatus.RESUBMITTED; // Always return RESUBMITTED for resubmitted sessions
    }
    
    return CombinedStatus.DRAFT;
  }
}

