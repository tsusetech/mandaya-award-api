import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
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
import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsString, IsBoolean, IsOptional, IsDateString, IsArray } from 'class-validator';

@Injectable()
export class AssessmentsService {
  constructor(private prisma: PrismaService) {}

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
      
      // Update the session object for the response
      session.status = updateData.status || session.status;
      session.lastActivityAt = updateData.lastActivityAt;
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
    return this.prisma.$transaction(async (tx) => {
      const session = await tx.responseSession.findUnique({
        where: { id: sessionId }
      });

      if (!session) {
        throw new NotFoundException('Assessment session not found');
      }

      // Check if session is already submitted
      if (session.status === 'submitted') {
        throw new BadRequestException('Assessment has already been submitted');
      }

      // Mark session as submitted
      await tx.responseSession.update({
        where: { id: sessionId },
        data: {
          status: 'submitted',
          submittedAt: new Date(),
          lastActivityAt: new Date()
        }
      });

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

    // Map to DTO with explicit null handling
    const data: UserAssessmentSessionDto[] = sessions.map(session => ({
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

    return {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
      data
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
}
