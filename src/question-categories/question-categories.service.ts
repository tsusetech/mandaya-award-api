import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateQuestionCategoryDto } from './dto/create-question-category.dto';
import { UpdateQuestionCategoryDto } from './dto/update-question-category.dto';
import { QuestionCategoryResponseDto } from './dto/question-category-response.dto';

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
}
