import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { AssignGroupToCategoryDto } from './dto/assign-group-to-category.dto';
import { CategoryResponseDto } from './dto/category-response.dto';
import { CategoryGroupResponseDto } from './dto/category-group-response.dto';

@Injectable()
export class CategoriesService {
  constructor(private prisma: PrismaService) {}

  async create(createCategoryDto: CreateCategoryDto): Promise<{ message: string; category: CategoryResponseDto }> {
    try {
      const category = await this.prisma.category.create({
        data: createCategoryDto,
      });
      return {
        message: 'Category created successfully',
        category
      };
    } catch (error) {
      if (error.code === 'P2002') {
        throw new ConflictException('Category name already exists');
      }
      throw error;
    }
  }

  async findAll(): Promise<{ message: string; categories: CategoryResponseDto[] }> {
    const categories = await this.prisma.category.findMany({
      where: {
        deletedAt: null,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
    return {
      message: 'Categories retrieved successfully',
      categories
    };
  }

  async findOne(id: number): Promise<{ message: string; category: CategoryResponseDto }> {
    const category = await this.prisma.category.findFirst({
      where: {
        id,
        deletedAt: null,
      },
    });

    if (!category) {
      throw new NotFoundException(`Category with ID ${id} not found`);
    }

    return {
      message: 'Category retrieved successfully',
      category
    };
  }

  async update(id: number, updateCategoryDto: UpdateCategoryDto): Promise<{ message: string; category: CategoryResponseDto }> {
    try {
      const category = await this.prisma.category.update({
        where: { id },
        data: updateCategoryDto,
      });
      return {
        message: 'Category updated successfully',
        category
      };
    } catch (error) {
      if (error.code === 'P2025') {
        throw new NotFoundException(`Category with ID ${id} not found`);
      }
      if (error.code === 'P2002') {
        throw new ConflictException('Category name already exists');
      }
      throw error;
    }
  }

  async remove(id: number): Promise<{ message: string }> {
    try {
      await this.prisma.category.update({
        where: { id },
        data: {
          deletedAt: new Date(),
        },
      });
      return {
        message: 'Category deleted successfully'
      };
    } catch (error) {
      if (error.code === 'P2025') {
        throw new NotFoundException(`Category with ID ${id} not found`);
      }
      throw error;
    }
  }

  async assignGroupToCategory(assignDto: AssignGroupToCategoryDto): Promise<{ message: string; categoryGroup: CategoryGroupResponseDto }> {
    try {
      const categoryGroup = await this.prisma.categoryGroup.create({
        data: assignDto,
        include: {
          category: {
            select: {
              id: true,
              name: true,
              description: true,
            },
          },
          group: {
            select: {
              id: true,
              groupName: true,
              description: true,
            },
          },
        },
      });
      return {
        message: 'Group assigned to category successfully',
        categoryGroup
      };
    } catch (error) {
      if (error.code === 'P2002') {
        throw new ConflictException('Group is already assigned to this category');
      }
      if (error.code === 'P2003') {
        throw new NotFoundException('Category or Group not found');
      }
      throw error;
    }
  }

  async getCategoryGroups(categoryId: number): Promise<{ message: string; categoryGroups: CategoryGroupResponseDto[] }> {
    const categoryGroups = await this.prisma.categoryGroup.findMany({
      where: {
        categoryId,
      },
      include: {
        category: {
          select: {
            id: true,
            name: true,
            description: true,
          },
        },
        group: {
          select: {
            id: true,
            groupName: true,
            description: true,
          },
        },
      },
    });
    return {
      message: 'Category groups retrieved successfully',
      categoryGroups
    };
  }

  async getGroupCategories(groupId: number): Promise<{ message: string; categoryGroups: CategoryGroupResponseDto[] }> {
    const categoryGroups = await this.prisma.categoryGroup.findMany({
      where: {
        groupId,
      },
      include: {
        category: {
          select: {
            id: true,
            name: true,
            description: true,
          },
        },
        group: {
          select: {
            id: true,
            groupName: true,
            description: true,
          },
        },
      },
    });
    return {
      message: 'Group categories retrieved successfully',
      categoryGroups
    };
  }

  async removeGroupFromCategory(categoryId: number, groupId: number): Promise<{ message: string }> {
    try {
      await this.prisma.categoryGroup.delete({
        where: {
          categoryId_groupId: {
            categoryId,
            groupId,
          },
        },
      });
      return {
        message: 'Group removed from category successfully'
      };
    } catch (error) {
      if (error.code === 'P2025') {
        throw new NotFoundException('Category-Group assignment not found');
      }
      throw error;
    }
  }
}
