import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateQuestionCategoryDto } from './dto/create-question-category.dto';
import { UpdateQuestionCategoryDto } from './dto/update-question-category.dto';
import { QuestionCategoryResponseDto } from './dto/question-category-response.dto';
import {
  AssignQuestionsToCategory,
  AssignSingleQuestionToCategory,
  BulkAssignQuestionsDto,
  QuestionCategoryAssignmentResponseDto,
} from './dto/assign-questions.dto';

@Injectable()
export class QuestionCategoriesService {
  constructor(private prisma: PrismaService) {}

  async create(
    createQuestionCategoryDto: CreateQuestionCategoryDto,
  ): Promise<{ message: string; questionCategory: QuestionCategoryResponseDto }> {
    try {
      const questionCategory = await this.prisma.questionCategory.create({
        data: {
          ...createQuestionCategoryDto,
          weight: createQuestionCategoryDto.weight || 1.0,
          scoreType: createQuestionCategoryDto.scoreType || 'number',
        },
      });
      return {
        message: 'Question category created successfully',
        questionCategory: {
          ...questionCategory,
          weight: Number(questionCategory.weight),
          minValue: questionCategory.minValue ? Number(questionCategory.minValue) : null,
          maxValue: questionCategory.maxValue ? Number(questionCategory.maxValue) : null,
        },
      };
    } catch (error) {
      if (error.code === 'P2002') {
        throw new ConflictException('Question category name already exists');
      }
      throw error;
    }
  }

  async findAll(): Promise<{
    message: string;
    questionCategories: QuestionCategoryResponseDto[];
  }> {
    const questionCategories = await this.prisma.questionCategory.findMany({
      where: {
        deletedAt: null,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
    return {
      message: 'Question categories retrieved successfully',
      questionCategories: questionCategories.map(category => ({
        ...category,
        weight: Number(category.weight),
        minValue: category.minValue ? Number(category.minValue) : null,
        maxValue: category.maxValue ? Number(category.maxValue) : null,
      })),
    };
  }

  async findOne(
    id: number,
  ): Promise<{ message: string; questionCategory: QuestionCategoryResponseDto }> {
    const questionCategory = await this.prisma.questionCategory.findFirst({
      where: {
        id,
        deletedAt: null,
      },
    });

    if (!questionCategory) {
      throw new NotFoundException(`Question category with ID ${id} not found`);
    }

    return {
      message: 'Question category retrieved successfully',
      questionCategory: {
        ...questionCategory,
        weight: Number(questionCategory.weight),
        minValue: questionCategory.minValue ? Number(questionCategory.minValue) : null,
        maxValue: questionCategory.maxValue ? Number(questionCategory.maxValue) : null,
      },
    };
  }

  async update(
    id: number,
    updateQuestionCategoryDto: UpdateQuestionCategoryDto,
  ): Promise<{ message: string; questionCategory: QuestionCategoryResponseDto }> {
    try {
      const questionCategory = await this.prisma.questionCategory.update({
        where: { id },
        data: updateQuestionCategoryDto,
      });
      return {
        message: 'Question category updated successfully',
        questionCategory: {
          ...questionCategory,
          weight: Number(questionCategory.weight),
          minValue: questionCategory.minValue ? Number(questionCategory.minValue) : null,
          maxValue: questionCategory.maxValue ? Number(questionCategory.maxValue) : null,
        },
      };
    } catch (error) {
      if (error.code === 'P2025') {
        throw new NotFoundException(`Question category with ID ${id} not found`);
      }
      if (error.code === 'P2002') {
        throw new ConflictException('Question category name already exists');
      }
      throw error;
    }
  }

  async remove(id: number): Promise<{ message: string }> {
    try {
      // Check if the question category exists
      const questionCategory = await this.prisma.questionCategory.findFirst({
        where: {
          id,
          deletedAt: null,
        },
      });

      if (!questionCategory) {
        throw new NotFoundException(`Question category with ID ${id} not found`);
      }

      // Check if the question category is being used in any group questions
      const groupQuestions = await this.prisma.groupQuestion.findMany({
        where: {
          categoryId: id,
        },
      });

      if (groupQuestions.length > 0) {
        throw new ConflictException(
          'Cannot delete question category as it is being used in group questions',
        );
      }

      // Soft delete the question category
      await this.prisma.questionCategory.update({
        where: { id },
        data: {
          deletedAt: new Date(),
        },
      });

      return {
        message: 'Question category deleted successfully',
      };
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof ConflictException) {
        throw error;
      }
      throw new NotFoundException(`Question category with ID ${id} not found`);
    }
  }

  async findByScoreType(scoreType: string): Promise<{
    message: string;
    questionCategories: QuestionCategoryResponseDto[];
  }> {
    const questionCategories = await this.prisma.questionCategory.findMany({
      where: {
        scoreType,
        deletedAt: null,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
    return {
      message: `Question categories with score type '${scoreType}' retrieved successfully`,
      questionCategories: questionCategories.map(category => ({
        ...category,
        weight: Number(category.weight),
        minValue: category.minValue ? Number(category.minValue) : null,
        maxValue: category.maxValue ? Number(category.maxValue) : null,
      })),
    };
  }

  // Assignment methods
  async assignQuestionsToCategory(
    categoryId: number,
    assignDto: AssignQuestionsToCategory,
  ): Promise<{ message: string; assignments: QuestionCategoryAssignmentResponseDto[] }> {
    // Verify category exists
    const category = await this.prisma.questionCategory.findFirst({
      where: { id: categoryId, deletedAt: null },
    });

    if (!category) {
      throw new NotFoundException(`Question category with ID ${categoryId} not found`);
    }

    // Verify all group questions exist
    const groupQuestions = await this.prisma.groupQuestion.findMany({
      where: {
        id: { in: assignDto.groupQuestionIds },
      },
      include: {
        group: true,
        question: true,
      },
    });

    if (groupQuestions.length !== assignDto.groupQuestionIds.length) {
      throw new NotFoundException('One or more group questions not found');
    }

    // Update all group questions with the category
    await this.prisma.groupQuestion.updateMany({
      where: {
        id: { in: assignDto.groupQuestionIds },
      },
      data: {
        categoryId,
      },
    });

    // Fetch updated data for response
    const updatedGroupQuestions = await this.prisma.groupQuestion.findMany({
      where: {
        id: { in: assignDto.groupQuestionIds },
      },
      include: {
        group: true,
        question: true,
        category: true,
      },
    });

    const assignments = updatedGroupQuestions.map(gq => ({
      groupQuestionId: gq.id,
      categoryId: gq.categoryId!,
      categoryName: gq.category!.name,
      groupId: gq.groupId,
      groupName: gq.group.groupName,
      questionId: gq.questionId,
      questionText: gq.question.questionText,
      assignedAt: gq.updatedAt,
    }));

    return {
      message: `${assignDto.groupQuestionIds.length} questions assigned to category successfully`,
      assignments,
    };
  }

  async assignSingleQuestionToCategory(
    categoryId: number,
    assignDto: AssignSingleQuestionToCategory,
  ): Promise<{ message: string; assignment: QuestionCategoryAssignmentResponseDto }> {
    // Verify category exists
    const category = await this.prisma.questionCategory.findFirst({
      where: { id: categoryId, deletedAt: null },
    });

    if (!category) {
      throw new NotFoundException(`Question category with ID ${categoryId} not found`);
    }

    // Verify group question exists
    const groupQuestion = await this.prisma.groupQuestion.findUnique({
      where: { id: assignDto.groupQuestionId },
      include: {
        group: true,
        question: true,
      },
    });

    if (!groupQuestion) {
      throw new NotFoundException(`Group question with ID ${assignDto.groupQuestionId} not found`);
    }

    // Update the group question with the category
    const updatedGroupQuestion = await this.prisma.groupQuestion.update({
      where: { id: assignDto.groupQuestionId },
      data: { categoryId },
      include: {
        group: true,
        question: true,
        category: true,
      },
    });

    const assignment = {
      groupQuestionId: updatedGroupQuestion.id,
      categoryId: updatedGroupQuestion.categoryId!,
      categoryName: updatedGroupQuestion.category!.name,
      groupId: updatedGroupQuestion.groupId,
      groupName: updatedGroupQuestion.group.groupName,
      questionId: updatedGroupQuestion.questionId,
      questionText: updatedGroupQuestion.question.questionText,
      assignedAt: updatedGroupQuestion.updatedAt,
    };

    return {
      message: 'Question assigned to category successfully',
      assignment,
    };
  }

  async removeQuestionFromCategory(
    categoryId: number,
    groupQuestionId: number,
  ): Promise<{ message: string }> {
    // Verify the group question is assigned to this category
    const groupQuestion = await this.prisma.groupQuestion.findFirst({
      where: {
        id: groupQuestionId,
        categoryId,
      },
    });

    if (!groupQuestion) {
      throw new NotFoundException(
        `Group question ${groupQuestionId} is not assigned to category ${categoryId}`,
      );
    }

    // Remove the category assignment
    await this.prisma.groupQuestion.update({
      where: { id: groupQuestionId },
      data: { categoryId: null },
    });

    return {
      message: 'Question removed from category successfully',
    };
  }

  async getQuestionsByCategory(
    categoryId: number,
  ): Promise<{ message: string; questions: QuestionCategoryAssignmentResponseDto[] }> {
    // Verify category exists
    const category = await this.prisma.questionCategory.findFirst({
      where: { id: categoryId, deletedAt: null },
    });

    if (!category) {
      throw new NotFoundException(`Question category with ID ${categoryId} not found`);
    }

    const groupQuestions = await this.prisma.groupQuestion.findMany({
      where: {
        categoryId,
      },
      include: {
        group: true,
        question: true,
        category: true,
      },
      orderBy: {
        orderNumber: 'asc',
      },
    });

    const questions = groupQuestions.map(gq => ({
      groupQuestionId: gq.id,
      categoryId: gq.categoryId!,
      categoryName: gq.category!.name,
      groupId: gq.groupId,
      groupName: gq.group.groupName,
      questionId: gq.questionId,
      questionText: gq.question.questionText,
      assignedAt: gq.updatedAt,
    }));

    return {
      message: `Questions in category '${category.name}' retrieved successfully`,
      questions,
    };
  }

  async bulkAssignQuestions(
    bulkDto: BulkAssignQuestionsDto,
  ): Promise<{ message: string; results: { success: number; failed: number } }> {
    let successCount = 0;
    let failedCount = 0;

    for (const assignment of bulkDto.assignments) {
      try {
        if (assignment.categoryId === null) {
          // Remove assignment
          await this.prisma.groupQuestion.update({
            where: { id: assignment.groupQuestionId },
            data: { categoryId: null },
          });
        } else {
          // Verify category exists
          const category = await this.prisma.questionCategory.findFirst({
            where: { id: assignment.categoryId, deletedAt: null },
          });

          if (!category) {
            failedCount++;
            continue;
          }

          // Assign to category
          await this.prisma.groupQuestion.update({
            where: { id: assignment.groupQuestionId },
            data: { categoryId: assignment.categoryId },
          });
        }
        successCount++;
      } catch (error) {
        failedCount++;
      }
    }

    return {
      message: `Bulk assignment completed: ${successCount} successful, ${failedCount} failed`,
      results: { success: successCount, failed: failedCount },
    };
  }
}
