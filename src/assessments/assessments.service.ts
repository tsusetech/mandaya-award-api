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
        }
      }
    });

    if (!session) {
      // Create new session
      session = await this.prisma.responseSession.create({
        data: {
          userId,
          groupId,
          status: 'draft',
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
      // Update session activity but preserve submitted status
      const updateData: any = {
        lastActivityAt: new Date()
      };
      
      // Only update status to 'in_progress' if it's not already submitted
      if (session.status !== 'submitted') {
        updateData.status = 'in_progress';
      }
      
      await this.prisma.responseSession.update({
        where: { id: session.id },
        data: updateData
      });

      // Record status change in StatusProgress if status changed
      if (updateData.status && updateData.status !== session.status) {
        await this.statusProgressService.recordStatusChange(
          'response_session',
          session.id,
          updateData.status,
          userId,
          { action: 'resume_session' }
        );
      }
      
      // Update the session object for the response
      session.status = updateData.status || session.status;
      session.lastActivityAt = updateData.lastActivityAt;
    }

    // Get current status from StatusProgress
    const currentStatus = await this.statusProgressService.getCurrentStatus('response_session', session.id);
    if (currentStatus) {
      session.status = currentStatus.status;
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
          isCorrect: opt.isCorrect || undefined
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
      status: session.status as any,
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

    // Update session activity
    await this.prisma.responseSession.update({
      where: { id: sessionId },
      data: {
        lastActivityAt: new Date()
      }
    });

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

      // Check if all questions are answered or skipped
      const totalQuestions = session.group.groupQuestions.length;
      const answeredQuestions = session.responses.filter(r => r.isComplete).length;
      const skippedQuestions = session.responses.filter(r => r.isSkipped).length;

      if (answeredQuestions + skippedQuestions < totalQuestions) {
        throw new BadRequestException('Cannot submit session: not all questions are answered or skipped');
      }

      // Mark session as submitted in both tables
      await tx.responseSession.update({
        where: { id: sessionId },
        data: {
          status: 'submitted',
          submittedAt: new Date(),
          lastActivityAt: new Date()
        }
      });

      // Record status change in StatusProgress
      await this.statusProgressService.recordStatusChange(
        'response_session',
        sessionId,
        'submitted',
        session.userId,
        { 
          action: 'submit_session',
          totalQuestions,
          answeredQuestions,
          skippedQuestions
        }
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
    query: UserAssessmentSessionsQueryDto
  ): Promise<PaginatedResponseDto<UserAssessmentSessionDto>> {
    const { page = 1, limit = 10, status, reviewStatus, reviewStage, groupId } = query;
    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {};
    
    if (status) {
      where.status = status;
    }
    
    if (reviewStatus) {
      where.reviewStatus = reviewStatus;
    }
    
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

    // Get current status from StatusProgress for each session
    const sessionsWithStatus = await Promise.all(
      sessions.map(async (session) => {
        const currentStatus = await this.statusProgressService.getCurrentStatus('response_session', session.id);
        const currentReviewStatus = session.review ? 
          await this.statusProgressService.getCurrentStatus('review', session.review.id) : null;

        return {
          ...session,
          status: currentStatus?.status || session.status,
          reviewStatus: currentReviewStatus?.status || session.reviewStatus
        };
      })
    );

    // Map to DTO with explicit null handling
    const data: UserAssessmentSessionDto[] = sessionsWithStatus.map(session => ({
      id: session.id,
      sessionId: session.id, // Add sessionId field for clarity
      userId: session.userId,
      userEmail: session.user.email,
      userName: session.user.name || 'Unknown User',
      groupId: session.groupId,
      groupName: session.group.groupName,
      status: session.status as AssessmentStatus,
      progressPercentage: session.progressPercentage,
      startedAt: session.startedAt.toISOString(),
      lastActivityAt: session.lastActivityAt.toISOString(),
      completedAt: session.completedAt?.toISOString(),
      submittedAt: session.submittedAt?.toISOString(),
      reviewStatus: session.reviewStatus || null,
      // Review-related fields - explicitly handle null values
      reviewStage: session.review?.stage || null,
      reviewDecision: session.review?.decision || null,
      reviewScore: session.review?.totalScore ? Number(session.review.totalScore) : null,
      reviewedAt: session.review?.reviewedAt?.toISOString() || null,
      reviewerName: session.review?.reviewer?.name || null,
      reviewComments: session.review?.overallComments || null
    }));

    const totalPages = Math.ceil(total / limit);
    const hasNext = page < totalPages;
    const hasPrev = page > 1;

    return {
      data,
      total,
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

    // Get current status from StatusProgress
    const currentStatus = await this.statusProgressService.getCurrentStatus('response_session', session.id);
    if (currentStatus) {
      session.status = currentStatus.status;
    }

    // Get current status from StatusProgress
    const currentReviewStatus = session.review ? 
      await this.statusProgressService.getCurrentStatus('review', session.review.id) : null;
    if (currentReviewStatus) {
      session.reviewStatus = currentReviewStatus.status;
    }

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
          isCorrect: opt.isCorrect || undefined
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
      status: session.status as AssessmentStatus,
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
      reviewStatus: session.reviewStatus || null,
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

    if (session.status !== 'submitted') {
      throw new BadRequestException('Session must be submitted before it can be reviewed');
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

      // Update session status based on the most recent review decision
      await prisma.responseSession.update({
        where: { id: sessionId },
        data: {
          reviewStatus: status,
          reviewedAt: new Date()
        }
      });

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

    if (session.status !== 'submitted') {
      throw new BadRequestException('Session must be submitted before it can be reviewed');
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

      // Update session status
      await prisma.responseSession.update({
        where: { id: sessionId },
        data: {
          reviewStatus: status,
          reviewedAt: new Date()
        }
      });

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

      // Update session status if needed
      await prisma.responseSession.update({
        where: { id: sessionId },
        data: {
          reviewStatus: status,
          reviewedAt: new Date()
        }
      });

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

      // Update session status
      await prisma.responseSession.update({
        where: { id: sessionId },
        data: {
          reviewStatus: status,
          reviewedAt: new Date()
        }
      });

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
}
