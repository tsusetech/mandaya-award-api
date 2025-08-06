import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSessionDto } from './dto/create-session.dto';
import { AutoSaveDto, BatchAutoSaveDto } from './dto/auto-save.dto';
import { UpdatePositionDto } from './dto/update-position.dto';
import { ResponseSessionDto } from './dto/response-session.dto';
import { QuestionResponseDto } from './dto/question-response.dto';
import { AutoSaveResultDto, BatchAutoSaveResultDto, ProgressResultDto } from './dto/auto-save-result.dto';
import { ProgressSummaryDto } from './dto/progress-summary.dto';

@Injectable()
export class ResponsesService {
  constructor(private prisma: PrismaService) {}

  // Session Management
  async createOrResumeSession(userId: number, createSessionDto: CreateSessionDto): Promise<ResponseSessionDto> {
    const { groupId } = createSessionDto;

    // Check if user has access to this group
    const userGroup = await this.prisma.userGroup.findUnique({
      where: { userId_groupId: { userId, groupId } }
    });

    if (!userGroup) {
      throw new BadRequestException('User is not assigned to this group');
    }

    // Check if session already exists
    let session = await this.prisma.responseSession.findUnique({
      where: { userId_groupId: { userId, groupId } },
      include: {
        responses: {
          include: {
            question: true,
            groupQuestion: true
          }
        }
      }
    });

    if (session) {
      // Resume existing session
      await this.prisma.responseSession.update({
        where: { id: session.id },
        data: {
          status: 'in_progress',
          lastActivityAt: new Date()
        }
      });
    } else {
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
          responses: {
            include: {
              question: true,
              groupQuestion: true
            }
          }
        }
      });
    }

    return this.mapSessionToDto(session);
  }

  async getSession(sessionId: number): Promise<ResponseSessionDto> {
    const session = await this.prisma.responseSession.findUnique({
      where: { id: sessionId },
      include: {
        responses: {
          include: {
            question: true,
            groupQuestion: true
          }
        }
      }
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    return this.mapSessionToDto(session);
  }

  async pauseSession(sessionId: number): Promise<{ message: string; lastSaved: Date }> {
    const session = await this.prisma.responseSession.update({
      where: { id: sessionId },
      data: {
        status: 'paused',
        lastActivityAt: new Date()
      }
    });

    return {
      message: 'Session paused successfully',
      lastSaved: session.lastActivityAt
    };
  }

  async resumeSession(sessionId: number): Promise<{ message: string; currentQuestion?: any }> {
    const session = await this.prisma.responseSession.update({
      where: { id: sessionId },
      data: {
        status: 'in_progress',
        lastActivityAt: new Date()
      },
      include: {
        currentQuestion: true
      }
    });

    return {
      message: 'Session resumed successfully',
      currentQuestion: session.currentQuestion
    };
  }

  // Auto-Save Methods
  async autoSaveResponse(sessionId: number, autoSaveDto: AutoSaveDto): Promise<AutoSaveResultDto> {
    const { questionId, value, isDraft, isComplete = false, isSkipped = false, timeSpent = 0 } = autoSaveDto;

    return await this.prisma.$transaction(async (tx) => {
      // Get group question ID
      const session = await tx.responseSession.findUnique({
        where: { id: sessionId }
      });

      if (!session) {
        throw new NotFoundException('Session not found');
      }

      const groupQuestion = await tx.groupQuestion.findFirst({
        where: {
          groupId: session.groupId,
          questionId: questionId
        }
      });

      if (!groupQuestion) {
        throw new NotFoundException('Question not found in this group');
      }

      // Get question type for proper value mapping
      const question = await tx.question.findUnique({
        where: { id: questionId }
      });

      if (!question) {
        throw new NotFoundException('Question not found');
      }

      const mappedValue = this.mapValueByQuestionType(value, question.inputType);

      // Upsert response
      const response = await tx.questionResponse.upsert({
        where: {
          sessionId_questionId: { sessionId, questionId }
        },
        update: {
          ...mappedValue,
          isDraft,
          isComplete,
          isSkipped,
          timeSpentSeconds: { increment: timeSpent },
          autoSaveVersion: { increment: 1 },
          lastModifiedAt: new Date(),
          ...(isComplete && { finalizedAt: new Date() })
        },
        create: {
          sessionId,
          questionId,
          groupQuestionId: groupQuestion.id,
          ...mappedValue,
          isDraft,
          isComplete,
          isSkipped,
          timeSpentSeconds: timeSpent,
          autoSaveVersion: 1,
          firstAnsweredAt: new Date(),
          ...(isComplete && { finalizedAt: new Date() })
        }
      });

      // Update session activity and progress if response is complete or skipped
      const updateData: any = {
        lastAutoSaveAt: new Date(),
        lastActivityAt: new Date(),
        status: 'in_progress'
      };

      if (isComplete || isSkipped) {
        const progress = await this.calculateProgress(sessionId);
        updateData.progressPercentage = progress.progressPercentage;
      }

      await tx.responseSession.update({
        where: { id: sessionId },
        data: updateData
      });

      return {
        success: true,
        autoSaveVersion: response.autoSaveVersion,
        lastSaved: response.lastModifiedAt,
        isComplete: response.isComplete,
        isSkipped: response.isSkipped
      };
    });
  }

  async batchAutoSave(sessionId: number, batchDto: BatchAutoSaveDto): Promise<BatchAutoSaveResultDto> {
    const { responses, currentQuestionId } = batchDto;

    return await this.prisma.$transaction(async (tx) => {
      let savedCount = 0;
      let lastSaved = new Date();

      for (const responseDto of responses) {
        try {
          await this.autoSaveResponse(sessionId, responseDto);
          savedCount++;
        } catch (error) {
          // Log error but continue with other responses
          console.error(`Failed to save response for question ${responseDto.questionId}:`, error);
        }
      }

      // Update current position if provided
      if (currentQuestionId) {
        await tx.responseSession.update({
          where: { id: sessionId },
          data: {
            currentQuestionId,
            lastActivityAt: new Date()
          }
        });
      }

      return {
        success: true,
        savedCount,
        lastSaved
      };
    });
  }

  // Navigation Methods
  async updatePosition(sessionId: number, updatePositionDto: UpdatePositionDto): Promise<ProgressResultDto> {
    const { currentQuestionId, previousQuestionId } = updatePositionDto;

    return await this.prisma.$transaction(async (tx) => {
      // Finalize previous question if it was being worked on
      if (previousQuestionId) {
        await tx.questionResponse.updateMany({
          where: {
            sessionId,
            questionId: previousQuestionId,
            isDraft: true
          },
          data: {
            isDraft: false,
            finalizedAt: new Date()
          }
        });
      }

      // Update session position
      await tx.responseSession.update({
        where: { id: sessionId },
        data: {
          currentQuestionId,
          lastActivityAt: new Date()
        }
      });

      // Get next question info
      const nextQuestion = await tx.question.findUnique({
        where: { id: currentQuestionId }
      });

      // Calculate progress
      const progress = await this.calculateProgress(sessionId);

      return {
        success: true,
        progressPercentage: progress.progressPercentage,
        nextQuestion
      };
    });
  }

  async getProgress(sessionId: number): Promise<ProgressSummaryDto> {
    return await this.calculateProgress(sessionId);
  }

  async submitSession(sessionId: number): Promise<{ success: boolean; message: string }> {
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
        message: 'Session submitted successfully'
      };
    });
  }

  // Helper Methods
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

  private async calculateProgress(sessionId: number): Promise<ProgressSummaryDto> {
    const session = await this.prisma.responseSession.findUnique({
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
        responses: {
          where: {
            OR: [
              { isComplete: true },
              { isSkipped: true }
            ]
          }
        }
      }
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    const totalQuestions = session.group.groupQuestions.length;
    const answeredQuestions = session.responses.filter(r => r.isComplete).length;
    const skippedQuestions = session.responses.filter(r => r.isSkipped).length;
    const progressPercentage = totalQuestions > 0 ? Math.round(((answeredQuestions + skippedQuestions) / totalQuestions) * 100) : 0;

    return {
      totalQuestions,
      answeredQuestions,
      skippedQuestions,
      progressPercentage
    };
  }

  private mapSessionToDto(session: any): ResponseSessionDto {
    return {
      id: session.id,
      userId: session.userId,
      groupId: session.groupId,
      status: session.status,
      currentQuestionId: session.currentQuestionId,
      progressPercentage: session.progressPercentage,
      autoSaveEnabled: session.autoSaveEnabled,
      startedAt: session.startedAt,
      lastAutoSaveAt: session.lastAutoSaveAt,
      lastActivityAt: session.lastActivityAt,
      completedAt: session.completedAt,
      submittedAt: session.submittedAt,
      responses: session.responses?.map(this.mapResponseToDto)
    };
  }

  private mapResponseToDto(response: any): QuestionResponseDto {
    return {
      id: response.id,
      sessionId: response.sessionId,
      questionId: response.questionId,
      groupQuestionId: response.groupQuestionId,
      textValue: response.textValue,
      numericValue: response.numericValue,
      booleanValue: response.booleanValue,
      arrayValue: response.arrayValue,
      isDraft: response.isDraft,
      isComplete: response.isComplete,
      isSkipped: response.isSkipped,
      autoSaveVersion: response.autoSaveVersion,
      timeSpentSeconds: response.timeSpentSeconds,
      lastModifiedAt: response.lastModifiedAt,
      firstAnsweredAt: response.firstAnsweredAt,
      finalizedAt: response.finalizedAt,
      validationErrors: response.validationErrors,
      metadata: response.metadata
    };
  }
}
