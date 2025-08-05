import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SoftDeleteService } from '../common/services/soft-delete.service';
import { CreateQuestionDto } from './dto/create-question.dto';
import { UpdateQuestionDto } from './dto/update-question.dto';
import { CreateQuestionOptionDto, UpdateQuestionOptionDto } from './dto/question-option.dto';

@Injectable()
export class QuestionsService {
  constructor(
    private prisma: PrismaService,
    private softDeleteService: SoftDeleteService,
  ) {}

  async getAllQuestions() {
    const questions = await this.prisma.question.findMany({
      where: this.softDeleteService.getActiveRecordsWhere(),
      include: {
        groupQuestions: {
          include: {
            group: {
              select: {
                id: true,
                groupName: true,
                description: true,
              },
            },
          },
          orderBy: {
            orderNumber: 'asc',
          },
        },
        options: {
          where: { isActive: true },
          orderBy: { orderNumber: 'asc' },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return {
      message: 'Questions retrieved successfully',
      questions,
      count: questions.length,
    };
  }

  async getQuestionById(id: number) {
    const question = await this.prisma.question.findFirst({
      where: { 
        id,
        ...this.softDeleteService.getActiveRecordsWhere()
      },
      include: {
        groupQuestions: {
          include: {
            group: {
              select: {
                id: true,
                groupName: true,
                description: true,
              },
            },
          },
          orderBy: {
            orderNumber: 'asc',
          },
        },
        options: {
          where: { isActive: true },
          orderBy: { orderNumber: 'asc' },
        },
      },
    });

    if (!question) {
      throw new NotFoundException('Question not found');
    }

    return {
      message: 'Question retrieved successfully',
      question,
    };
  }

  async createQuestion(createQuestionDto: CreateQuestionDto) {
    const { options, ...questionData } = createQuestionDto;

    const question = await this.prisma.question.create({
      data: {
        ...questionData,
        options: options ? {
          create: options.map(option => ({
            optionText: option.optionText,
            optionValue: option.optionValue,
            orderNumber: option.orderNumber,
            isCorrect: option.isCorrect,
          })),
        } : undefined,
      },
      include: {
        groupQuestions: {
          include: {
            group: {
              select: {
                id: true,
                groupName: true,
                description: true,
              },
            },
          },
        },
        options: {
          where: { isActive: true },
          orderBy: { orderNumber: 'asc' },
        },
      },
    });

    return {
      message: 'Question created successfully',
      question,
    };
  }

  async updateQuestion(id: number, updateQuestionDto: UpdateQuestionDto) {
    // Check if question exists
    const existingQuestion = await this.prisma.question.findFirst({
      where: { 
        id,
        ...this.softDeleteService.getActiveRecordsWhere()
      },
    });

    if (!existingQuestion) {
      throw new NotFoundException('Question not found');
    }

    const { options, ...questionData } = updateQuestionDto;

    // If options are provided, first deactivate existing options
    if (options) {
      await this.prisma.questionOption.updateMany({
        where: { questionId: id },
        data: { isActive: false },
      });
    }

    const updatedQuestion = await this.prisma.question.update({
      where: { 
        id,
        ...this.softDeleteService.getActiveRecordsWhere()
      },
      data: {
        ...questionData,
        updatedAt: new Date(),
        ...(options && {
          options: {
            create: options.map(option => ({
              optionText: option.optionText!,
              optionValue: option.optionValue!,
              orderNumber: option.orderNumber!,
              isCorrect: option.isCorrect,
            })),
          },
        }),
      },
      include: {
        groupQuestions: {
          include: {
            group: {
              select: {
                id: true,
                groupName: true,
                description: true,
              },
            },
          },
          orderBy: {
            orderNumber: 'asc',
          },
        },
        options: {
          where: { isActive: true },
          orderBy: { orderNumber: 'asc' },
        },
      },
    });

    return {
      message: 'Question updated successfully',
      question: updatedQuestion,
    };
  }

  async deleteQuestion(id: number, deletedBy?: number) {
    // Check if question exists
    const existingQuestion = await this.prisma.question.findFirst({
      where: { 
        id,
        ...this.softDeleteService.getActiveRecordsWhere()
      },
    });

    if (!existingQuestion) {
      throw new NotFoundException('Question not found');
    }

    // Soft delete question
    await this.softDeleteService.softDeleteQuestion(id, { deletedBy });

    return {
      message: 'Question deleted successfully',
    };
  }

  async searchQuestions(query: string) {
    const questions = await this.prisma.question.findMany({
      where: {
        AND: [
          this.softDeleteService.getActiveRecordsWhere(),
          {
            questionText: { contains: query, mode: 'insensitive' as const },
          },
        ],
      },
      include: {
        groupQuestions: {
          include: {
            group: {
              select: {
                id: true,
                groupName: true,
                description: true,
              },
            },
          },
          orderBy: {
            orderNumber: 'asc',
          },
        },
        options: {
          where: { isActive: true },
          orderBy: { orderNumber: 'asc' },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return {
      message: 'Search results retrieved successfully',
      questions,
      count: questions.length,
    };
  }

  async getQuestionsByInputType(inputType: string) {
    const questions = await this.prisma.question.findMany({
      where: { 
        inputType: inputType,
        ...this.softDeleteService.getActiveRecordsWhere()
      },
      include: {
        groupQuestions: {
          include: {
            group: {
              select: {
                id: true,
                groupName: true,
                description: true,
              },
            },
          },
          orderBy: {
            orderNumber: 'asc',
          },
        },
        options: {
          where: { isActive: true },
          orderBy: { orderNumber: 'asc' },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return {
      message: `Questions with input type ${inputType} retrieved successfully`,
      questions,
      count: questions.length,
    };
  }

  async getQuestionStats() {
    const totalQuestions = await this.prisma.question.count({
      where: this.softDeleteService.getActiveRecordsWhere(),
    });
    
    const questionsByType = await this.prisma.question.groupBy({
      by: ['inputType'],
      where: this.softDeleteService.getActiveRecordsWhere(),
      _count: {
        inputType: true,
      },
    });

    const requiredQuestionsCount = await this.prisma.question.count({
      where: { 
        isRequired: true,
        ...this.softDeleteService.getActiveRecordsWhere()
      },
    });

    const optionalQuestionsCount = await this.prisma.question.count({
      where: { 
        isRequired: false,
        ...this.softDeleteService.getActiveRecordsWhere()
      },
    });

    return {
      message: 'Question statistics retrieved successfully',
      stats: {
        totalQuestions,
        requiredQuestions: requiredQuestionsCount,
        optionalQuestions: optionalQuestionsCount,
        questionsByType: questionsByType.map(type => ({
          inputType: type.inputType,
          count: type._count.inputType,
        })),
      },
    };
  }

  // Soft Delete Management Methods
  async getSoftDeletedQuestions() {
    const questions = await this.softDeleteService.getSoftDeletedQuestions();
    
    return {
      message: 'Soft deleted questions retrieved successfully',
      questions,
      count: questions.length,
    };
  }

  async restoreQuestion(id: number, restoredBy?: number) {
    try {
      const restoredQuestion = await this.softDeleteService.restoreQuestion(id, { restoredBy });
      
      return {
        message: 'Question restored successfully',
        question: restoredQuestion,
      };
    } catch (error) {
      throw new NotFoundException('Soft deleted question not found');
    }
  }

  async permanentlyDeleteQuestion(id: number) {
    try {
      await this.softDeleteService.permanentlyDeleteQuestion(id);
      
      return {
        message: 'Question permanently deleted successfully',
      };
    } catch (error) {
      throw new NotFoundException('Soft deleted question not found');
    }
  }

  // Individual Question Option Management Methods
  async createQuestionOption(createQuestionOptionDto: CreateQuestionOptionDto) {
    // Check if the question exists
    const question = await this.prisma.question.findFirst({
      where: { 
        id: createQuestionOptionDto.questionId,
        ...this.softDeleteService.getActiveRecordsWhere()
      },
    });

    if (!question) {
      throw new NotFoundException('Question not found');
    }

    const questionOption = await this.prisma.questionOption.create({
      data: {
        questionId: createQuestionOptionDto.questionId,
        optionText: createQuestionOptionDto.optionText,
        optionValue: createQuestionOptionDto.optionValue,
        orderNumber: createQuestionOptionDto.orderNumber,
        isCorrect: createQuestionOptionDto.isCorrect,
      },
    });

    return {
      message: 'Question option created successfully',
      questionOption,
    };
  }

  async updateQuestionOption(id: number, updateQuestionOptionDto: UpdateQuestionOptionDto) {
    // Check if question option exists
    const existingOption = await this.prisma.questionOption.findFirst({
      where: { 
        id,
        isActive: true
      },
    });

    if (!existingOption) {
      throw new NotFoundException('Question option not found');
    }

    const updatedOption = await this.prisma.questionOption.update({
      where: { id },
      data: {
        ...updateQuestionOptionDto,
        updatedAt: new Date(),
      },
    });

    return {
      message: 'Question option updated successfully',
      questionOption: updatedOption,
    };
  }

  async deleteQuestionOption(id: number) {
    // Check if question option exists
    const existingOption = await this.prisma.questionOption.findFirst({
      where: { 
        id,
        isActive: true
      },
    });

    if (!existingOption) {
      throw new NotFoundException('Question option not found');
    }

    // Soft delete by setting isActive to false
    await this.prisma.questionOption.update({
      where: { id },
      data: { 
        isActive: false,
        updatedAt: new Date(),
      },
    });

    return {
      message: 'Question option deleted successfully',
    };
  }
}
