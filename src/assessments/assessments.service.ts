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
          status: 'draft', // Keep this for backward compatibility
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
          { action: 'update_activity' }
        );
      }
    }

    // Get current status from StatusProgress
    const currentStatus = await this.statusProgressService.getCurrentStatus('response_session', session.id);

    // Get questions for this group
    const groupQuestions = await this.prisma.groupQuestion.findMany({
      where: { groupId },
      include: {
        question: true
      },
      orderBy: [
        { groupId: 'asc' },
        { orderNumber: 'asc' },
      ],
    });

    // Map questions to DTO format
    const questions = groupQuestions.map(gq => ({
      id: gq.question.id,
      questionText: gq.question.questionText,
      questionType: gq.question.questionType,
      isRequired: gq.question.isRequired,
      orderNumber: gq.orderNumber,
      groupQuestionId: gq.id,
      options: gq.question.options,
      validationRules: gq.question.validationRules,
      response: session.responses.find(r => r.groupQuestionId === gq.id) || null,
      isAnswered: session.responses.some(r => r.groupQuestionId === gq.id && r.value !== null),
      isSkipped: session.responses.some(r => r.groupQuestionId === gq.id && r.value === null && r.isSkipped)
    }));

    // Calculate progress
    const totalQuestions = questions.length;
    const answeredQuestions = questions.filter(q => q.isAnswered).length;
    const progressPercentage = totalQuestions > 0 ? Math.round((answeredQuestions / totalQuestions) * 100) : 0;

    return {
      id: session.id,
      userId: session.userId,
      groupId: session.groupId,
      groupName: session.group.groupName,
      currentStatus: currentStatus || session.status, // Use StatusProgress status, fallback to session status
      progressPercentage,
      autoSaveEnabled: session.autoSaveEnabled,
      currentQuestionId: session.currentQuestionId,
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
        throw new NotFoundException('Assessment session not found');
      }

      // Check if all questions are answered or skipped
      const totalQuestions = session.group.groupQuestions.length;
      const answeredQuestions = session.responses.filter(r => r.value !== null).length;
      const skippedQuestions = session.responses.filter(r => r.value === null && r.isSkipped).length;

      if (answeredQuestions + skippedQuestions < totalQuestions) {
        throw new BadRequestException('Cannot submit session: not all questions are answered or skipped');
      }

      // Update session status
      await tx.responseSession.update({
        where: { id: sessionId },
        data: {
          status: 'submitted',
          submittedAt: new Date(),
          completedAt: new Date()
        }
      });

      // Record status change in StatusProgress
      await this.statusProgressService.recordStatusChange(
        'response_session',
        sessionId,
        'submitted',
        session.userId,
        { action: 'submit_assessment' }
      );

      return {
        success: true,
        message: 'Assessment submitted successfully'
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
    const { page = 1, limit = 10, currentStatus, reviewStage, groupId } = query;
    const skip = (page - 1) * limit;

    // Build where clause for sessions
    const sessionWhere: any = {};
    if (groupId) {
      sessionWhere.groupId = groupId;
    }

    // Get sessions
    const sessions = await this.prisma.responseSession.findMany({
      where: sessionWhere,
      include: {
        user: true,
        group: true,
        reviews: {
          include: {
            reviewer: true
          },
          orderBy: {
            reviewedAt: 'desc'
          }
        }
      },
      skip,
      take: limit,
      orderBy: {
        lastActivityAt: 'desc'
      }
    });

    // Get current status for each session from StatusProgress
    const sessionsWithStatus = await Promise.all(
      sessions.map(async (session) => {
        const currentStatus = await this.statusProgressService.getCurrentStatus('response_session', session.id);
        
        // Get latest review info
        const latestReview = session.reviews[0];
        
        return {
          id: session.id,
          sessionId: session.id,
          userId: session.userId,
          userEmail: session.user.email,
          userName: session.user.name,
          groupId: session.groupId,
          groupName: session.group.groupName,
          currentStatus: currentStatus || session.status, // Use StatusProgress status, fallback to session status
          progressPercentage: session.progressPercentage,
          startedAt: session.startedAt.toISOString(),
          lastActivityAt: session.lastActivityAt.toISOString(),
          completedAt: session.completedAt?.toISOString(),
          submittedAt: session.submittedAt?.toISOString(),
          reviewStage: latestReview?.stage || null,
          reviewDecision: latestReview?.decision || null,
          reviewScore: latestReview?.totalScore || null,
          reviewedAt: latestReview?.reviewedAt.toISOString() || null,
          reviewerName: latestReview?.reviewer?.name || null,
          reviewComments: latestReview?.overallComments || null
        };
      })
    );

    // Filter by currentStatus if provided
    let filteredSessions = sessionsWithStatus;
    if (currentStatus) {
      filteredSessions = sessionsWithStatus.filter(session => session.currentStatus === currentStatus);
    }

    // Filter by reviewStage if provided
    if (reviewStage) {
      filteredSessions = filteredSessions.filter(session => session.reviewStage === reviewStage);
    }

    // Get total count
    const total = await this.prisma.responseSession.count({ where: sessionWhere });

    return {
      data: filteredSessions,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      hasNext: page < Math.ceil(total / limit),
      hasPrev: page > 1
    };
  }

  async getAssessmentSessionDetail(sessionId: number): Promise<AssessmentSessionDetailDto> {
    const session = await this.prisma.responseSession.findUnique({
      where: { id: sessionId },
      include: {
        user: true,
        group: true,
        responses: {
          include: {
            question: true,
            groupQuestion: true
          }
        },
        reviews: {
          include: {
            reviewer: true
          },
          orderBy: {
            reviewedAt: 'desc'
          }
        }
      }
    });

    if (!session) {
      throw new NotFoundException('Assessment session not found');
    }

    // Get current status from StatusProgress
    const currentStatus = await this.statusProgressService.getCurrentStatus('response_session', session.id);

    // Get questions for this group
    const groupQuestions = await this.prisma.groupQuestion.findMany({
      where: { groupId: session.groupId },
      include: {
        question: true
      },
      orderBy: [
        { groupId: 'asc' },
        { orderNumber: 'asc' },
      ],
    });

    // Map questions to DTO format
    const questions = groupQuestions.map(gq => ({
      id: gq.question.id,
      questionText: gq.question.questionText,
      questionType: gq.question.questionType,
      isRequired: gq.question.isRequired,
      orderNumber: gq.orderNumber,
      groupQuestionId: gq.id,
      options: gq.question.options,
      validationRules: gq.question.validationRules,
      response: session.responses.find(r => r.groupQuestionId === gq.id) || null,
      isAnswered: session.responses.some(r => r.groupQuestionId === gq.id && r.value !== null),
      isSkipped: session.responses.some(r => r.groupQuestionId === gq.id && r.value === null && r.isSkipped)
    }));

    // Get latest review info
    const latestReview = session.reviews[0];

    return {
      id: session.id,
      userId: session.userId,
      userEmail: session.user.email,
      userName: session.user.name,
      groupId: session.groupId,
      groupName: session.group.groupName,
      currentStatus: currentStatus || session.status, // Use StatusProgress status, fallback to session status
      progressPercentage: session.progressPercentage,
      autoSaveEnabled: session.autoSaveEnabled,
      currentQuestionId: session.currentQuestionId,
      questions,
      startedAt: session.startedAt.toISOString(),
      lastAutoSaveAt: session.lastAutoSaveAt?.toISOString(),
      lastActivityAt: session.lastActivityAt.toISOString(),
      completedAt: session.completedAt?.toISOString(),
      submittedAt: session.submittedAt?.toISOString(),
      reviewStage: latestReview?.stage || null,
      reviewDecision: latestReview?.decision || null,
      reviewScore: latestReview?.totalScore || null,
      reviewedAt: latestReview?.reviewedAt.toISOString() || null,
      reviewerName: latestReview?.reviewer?.name || null,
      reviewComments: latestReview?.overallComments || null
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
}
