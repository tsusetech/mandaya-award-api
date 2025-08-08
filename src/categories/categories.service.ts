import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { AssignCategoryToGroupDto } from './dto/assign-category-to-group.dto';
import { CategoryResponseDto } from './dto/category-response.dto';
import { GroupCategoryResponseDto } from './dto/group-category-response.dto';

@Injectable()
export class CategoriesService {
  constructor(private prisma: PrismaService) {}

  async create(createCategoryDto: CreateCategoryDto): Promise<CategoryResponseDto> {
    try {
      const category = await this.prisma.category.create({
        data: createCategoryDto,
      });
      return category;
    } catch (error) {
      if (error.code === 'P2002') {
        throw new ConflictException('Category name already exists');
      }
      throw error;
    }
  }

  async findAll(): Promise<CategoryResponseDto[]> {
    return this.prisma.category.findMany({
      where: {
        deletedAt: null,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findOne(id: number): Promise<CategoryResponseDto> {
    const category = await this.prisma.category.findFirst({
      where: {
        id,
        deletedAt: null,
      },
    });

    if (!category) {
      throw new NotFoundException(`Category with ID ${id} not found`);
    }

    return category;
  }

  async update(id: number, updateCategoryDto: UpdateCategoryDto): Promise<CategoryResponseDto> {
    try {
      const category = await this.prisma.category.update({
        where: { id },
        data: updateCategoryDto,
      });
      return category;
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

  async remove(id: number): Promise<void> {
    try {
      await this.prisma.category.update({
        where: { id },
        data: {
          deletedAt: new Date(),
        },
      });
    } catch (error) {
      if (error.code === 'P2025') {
        throw new NotFoundException(`Category with ID ${id} not found`);
      }
      throw error;
    }
  }

  async assignCategoryToGroup(assignDto: AssignCategoryToGroupDto): Promise<GroupCategoryResponseDto> {
    try {
      const groupCategory = await this.prisma.groupCategory.create({
        data: assignDto,
        include: {
          group: {
            select: {
              id: true,
              groupName: true,
              description: true,
            },
          },
          category: {
            select: {
              id: true,
              name: true,
              description: true,
            },
          },
        },
      });
      return groupCategory;
    } catch (error) {
      if (error.code === 'P2002') {
        throw new ConflictException('Group is already assigned to this category');
      }
      if (error.code === 'P2003') {
        throw new NotFoundException('Group or Category not found');
      }
      throw error;
    }
  }

  async getGroupCategories(groupId: number): Promise<GroupCategoryResponseDto[]> {
    return this.prisma.groupCategory.findMany({
      where: {
        groupId,
      },
      include: {
        group: {
          select: {
            id: true,
            groupName: true,
            description: true,
          },
        },
        category: {
          select: {
            id: true,
            name: true,
            description: true,
          },
        },
      },
    });
  }

  async getCategoryGroups(categoryId: number): Promise<GroupCategoryResponseDto[]> {
    return this.prisma.groupCategory.findMany({
      where: {
        categoryId,
      },
      include: {
        group: {
          select: {
            id: true,
            groupName: true,
            description: true,
          },
        },
        category: {
          select: {
            id: true,
            name: true,
            description: true,
          },
        },
      },
    });
  }

  async removeCategoryFromGroup(groupId: number, categoryId: number): Promise<void> {
    try {
      await this.prisma.groupCategory.delete({
        where: {
          groupId_categoryId: {
            groupId,
            categoryId,
          },
        },
      });
    } catch (error) {
      if (error.code === 'P2025') {
        throw new NotFoundException('Group-Category assignment not found');
      }
      throw error;
    }
  }
}
