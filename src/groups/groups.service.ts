import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SoftDeleteService } from '../common/services/soft-delete.service';
import { CreateGroupDto } from './dto/create-group.dto';
import { UpdateGroupDto } from './dto/update-group.dto';
import { AssignUserToGroupDto, AssignUsersToGroupDto, RemoveUserFromGroupDto } from './dto/assign-user-to-group.dto';
import { BindQuestionToGroupDto, UpdateGroupQuestionDto, ReorderQuestionsDto } from './dto/group-question.dto';

@Injectable()
export class GroupsService {
  constructor(
    private prisma: PrismaService,
    private softDeleteService: SoftDeleteService,
  ) {}

  async getAllGroups() {
    const groups = await this.prisma.group.findMany({
      where: this.softDeleteService.getActiveRecordsWhere(),
      include: {
        groupQuestions: {
          include: {
            question: true,
          },
          orderBy: {
            orderNumber: 'asc',
          },
        },
        userGroups: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                username: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return {
      message: 'Groups retrieved successfully',
      groups,
      count: groups.length,
    };
  }

  async getGroupById(id: number) {
    const group = await this.prisma.group.findFirst({
      where: { 
        id,
        ...this.softDeleteService.getActiveRecordsWhere()
      },
      include: {
        groupQuestions: {
          include: {
            question: true,
          },
          orderBy: {
            orderNumber: 'asc',
          },
        },
        userGroups: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                username: true,
              },
            },
          },
        },
      },
    });

    if (!group) {
      throw new NotFoundException('Group not found');
    }

    return {
      message: 'Group retrieved successfully',
      group,
    };
  }

  async createGroup(createGroupDto: CreateGroupDto) {
    // Check if group name already exists
    const existingGroup = await this.prisma.group.findFirst({
      where: { 
        groupName: createGroupDto.groupName,
        ...this.softDeleteService.getActiveRecordsWhere()
      },
    });

    if (existingGroup) {
      throw new BadRequestException('Group name already exists');
    }

    const group = await this.prisma.group.create({
      data: createGroupDto,
      include: {
        groupQuestions: true,
        userGroups: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                username: true,
              },
            },
          },
        },
      },
    });

    return {
      message: 'Group created successfully',
      group,
    };
  }

  async updateGroup(id: number, updateGroupDto: UpdateGroupDto) {
    // Check if group exists
    const existingGroup = await this.prisma.group.findFirst({
      where: { 
        id,
        ...this.softDeleteService.getActiveRecordsWhere()
      },
    });

    if (!existingGroup) {
      throw new NotFoundException('Group not found');
    }

    // Check if new group name already exists (if updating name)
    if (updateGroupDto.groupName) {
      const conflictGroup = await this.prisma.group.findFirst({
        where: {
          AND: [
            { id: { not: id } },
            { groupName: updateGroupDto.groupName },
            this.softDeleteService.getActiveRecordsWhere(),
          ],
        },
      });

      if (conflictGroup) {
        throw new BadRequestException('Group name already exists');
      }
    }

    const updatedGroup = await this.prisma.group.update({
      where: { 
        id,
        ...this.softDeleteService.getActiveRecordsWhere()
      },
      data: {
        ...updateGroupDto,
        updatedAt: new Date(),
      },
      include: {
        groupQuestions: {
          include: {
            question: true,
          },
          orderBy: {
            orderNumber: 'asc',
          },
        },
        userGroups: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                username: true,
              },
            },
          },
        },
      },
    });

    return {
      message: 'Group updated successfully',
      group: updatedGroup,
    };
  }

  async deleteGroup(id: number, deletedBy?: number) {
    // Check if group exists
    const existingGroup = await this.prisma.group.findFirst({
      where: { 
        id,
        ...this.softDeleteService.getActiveRecordsWhere()
      },
    });

    if (!existingGroup) {
      throw new NotFoundException('Group not found');
    }

    // Soft delete group
    await this.softDeleteService.softDeleteGroup(id, { deletedBy });

    return {
      message: 'Group deleted successfully',
    };
  }

  async searchGroups(query: string) {
    const groups = await this.prisma.group.findMany({
      where: {
        AND: [
          this.softDeleteService.getActiveRecordsWhere(),
          {
            OR: [
              { groupName: { contains: query, mode: 'insensitive' as const } },
              { description: { contains: query, mode: 'insensitive' as const } },
            ],
          },
        ],
      },
      include: {
        groupQuestions: {
          include: {
            question: true,
          },
          orderBy: {
            orderNumber: 'asc',
          },
        },
        userGroups: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                username: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return {
      message: 'Search results retrieved successfully',
      groups,
      count: groups.length,
    };
  }

  async getGroupStats() {
    const totalGroups = await this.prisma.group.count({
      where: this.softDeleteService.getActiveRecordsWhere(),
    });
    
    const groupsWithQuestionCount = await this.prisma.group.findMany({
      where: this.softDeleteService.getActiveRecordsWhere(),
      include: {
        groupQuestions: true,
        userGroups: true,
      },
    });

    const stats = groupsWithQuestionCount.map(group => ({
      id: group.id,
      groupName: group.groupName,
      questionCount: group.groupQuestions.length,
      userCount: group.userGroups.length,
    }));

    return {
      message: 'Group statistics retrieved successfully',
      stats: {
        totalGroups,
        groupDetails: stats,
      },
    };
  }

  // UserGroup Management Methods
  async assignUserToGroup(groupId: number, assignUserDto: AssignUserToGroupDto) {
    // Check if group exists
    const group = await this.prisma.group.findUnique({
      where: { id: groupId },
    });

    if (!group) {
      throw new NotFoundException('Group not found');
    }

    // Check if user exists
    const user = await this.prisma.user.findUnique({
      where: { id: assignUserDto.userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check if user is already assigned to group
    const existingAssignment = await this.prisma.userGroup.findFirst({
      where: {
        userId: assignUserDto.userId,
        groupId: groupId,
      },
    });

    if (existingAssignment) {
      throw new BadRequestException('User is already assigned to this group');
    }

    // Create user-group assignment
    const userGroup = await this.prisma.userGroup.create({
      data: {
        userId: assignUserDto.userId,
        groupId: groupId,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            username: true,
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
      message: 'User assigned to group successfully',
      userGroup,
    };
  }

  async assignUsersToGroup(groupId: number, assignUsersDto: AssignUsersToGroupDto) {
    // Check if group exists
    const group = await this.prisma.group.findUnique({
      where: { id: groupId },
    });

    if (!group) {
      throw new NotFoundException('Group not found');
    }

    // Check if all users exist
    const users = await this.prisma.user.findMany({
      where: { id: { in: assignUsersDto.userIds } },
    });

    if (users.length !== assignUsersDto.userIds.length) {
      throw new NotFoundException('One or more users not found');
    }

    // Check for existing assignments
    const existingAssignments = await this.prisma.userGroup.findMany({
      where: {
        userId: { in: assignUsersDto.userIds },
        groupId: groupId,
      },
    });

    if (existingAssignments.length > 0) {
      const existingUserIds = existingAssignments.map(ua => ua.userId);
      throw new BadRequestException(
        `Users with IDs [${existingUserIds.join(', ')}] are already assigned to this group`
      );
    }

    // Create bulk user-group assignments
    const userGroupsData = assignUsersDto.userIds.map(userId => ({
      userId,
      groupId,
    }));

    await this.prisma.userGroup.createMany({
      data: userGroupsData,
    });

    // Fetch created assignments with user details
    const createdAssignments = await this.prisma.userGroup.findMany({
      where: {
        userId: { in: assignUsersDto.userIds },
        groupId: groupId,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            username: true,
          },
        },
      },
    });

    return {
      message: `${assignUsersDto.userIds.length} users assigned to group successfully`,
      userGroups: createdAssignments,
      count: createdAssignments.length,
    };
  }

  async removeUserFromGroup(groupId: number, removeUserDto: RemoveUserFromGroupDto) {
    // Check if assignment exists
    const userGroup = await this.prisma.userGroup.findFirst({
      where: {
        userId: removeUserDto.userId,
        groupId: groupId,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            username: true,
          },
        },
      },
    });

    if (!userGroup) {
      throw new NotFoundException('User is not assigned to this group');
    }

    // Remove user from group
    await this.prisma.userGroup.delete({
      where: { id: userGroup.id },
    });

    return {
      message: 'User removed from group successfully',
      removedUser: userGroup.user,
    };
  }

  async getUsersInGroup(groupId: number) {
    // Check if group exists
    const group = await this.prisma.group.findUnique({
      where: { id: groupId },
    });

    if (!group) {
      throw new NotFoundException('Group not found');
    }

    const userGroups = await this.prisma.userGroup.findMany({
      where: { groupId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            username: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
      orderBy: {
        user: {
          name: 'asc',
        },
      },
    });

    return {
      message: 'Users in group retrieved successfully',
      group: {
        id: group.id,
        groupName: group.groupName,
        description: group.description,
      },
      users: userGroups.map(ug => ug.user),
      count: userGroups.length,
    };
  }

  async getGroupsForUser(userId: number) {
    // Check if user exists
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const userGroups = await this.prisma.userGroup.findMany({
      where: { userId },
      include: {
        group: {
          include: {
            groupQuestions: {
              include: {
                question: true,
              },
              orderBy: {
                orderNumber: 'asc',
              },
            },
          },
        },
      },
      orderBy: {
        group: {
          groupName: 'asc',
        },
      },
    });

    return {
      message: 'User groups retrieved successfully',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        username: user.username,
      },
      groups: userGroups.map(ug => ug.group),
      count: userGroups.length,
    };
  }

  async getGroupForUser(userId: number, groupId: number) {
    // Check if user exists
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check if user is assigned to this group
    const userGroup = await this.prisma.userGroup.findUnique({
      where: { userId_groupId: { userId, groupId } },
      include: {
        group: {
          include: {
            groupQuestions: {
              include: {
                question: true,
              },
              orderBy: {
                orderNumber: 'asc',
              },
            },
          },
        },
      },
    });

    if (!userGroup) {
      throw new NotFoundException('Group not found or user not assigned to this group');
    }

    return {
      message: 'Group details retrieved successfully',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        username: user.username,
      },
      group: userGroup.group,
    };
  }

  // GroupQuestion Management Methods
  async bindQuestionToGroup(groupId: number, bindQuestionDto: BindQuestionToGroupDto) {
    // Check if group exists
    const group = await this.prisma.group.findUnique({
      where: { id: groupId },
    });

    if (!group) {
      throw new NotFoundException('Group not found');
    }

    // Check if question exists
    const question = await this.prisma.question.findUnique({
      where: { id: bindQuestionDto.questionId },
    });

    if (!question) {
      throw new NotFoundException('Question not found');
    }

    // Check if question is already bound to this group
    const existingBinding = await this.prisma.groupQuestion.findFirst({
      where: {
        questionId: bindQuestionDto.questionId,
        groupId: groupId,
      },
    });

    if (existingBinding) {
      throw new BadRequestException('Question is already bound to this group');
    }

    // Check if order number is already taken in this group
    const orderConflict = await this.prisma.groupQuestion.findFirst({
      where: {
        groupId: groupId,
        orderNumber: bindQuestionDto.orderNumber,
      },
    });

    if (orderConflict) {
      throw new BadRequestException(`Order number ${bindQuestionDto.orderNumber} is already taken in this group`);
    }

    // Create question binding
    const groupQuestion = await this.prisma.groupQuestion.create({
      data: {
        questionId: bindQuestionDto.questionId,
        groupId: groupId,
        orderNumber: bindQuestionDto.orderNumber,
        sectionTitle: bindQuestionDto.sectionTitle,
        subsection: bindQuestionDto.subsection,
      },
      include: {
        question: true,
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
      message: 'Question bound to group successfully',
      groupQuestion,
    };
  }

  async updateGroupQuestion(groupQuestionId: number, updateGroupQuestionDto: UpdateGroupQuestionDto) {
    // Check if group question exists
    const existingGroupQuestion = await this.prisma.groupQuestion.findUnique({
      where: { id: groupQuestionId },
      include: {
        question: true,
        group: {
          select: {
            id: true,
            groupName: true,
            description: true,
          },
        },
      },
    });

    if (!existingGroupQuestion) {
      throw new NotFoundException('Group question not found');
    }

    // Check if new order number conflicts (if being updated)
    if (updateGroupQuestionDto.orderNumber && updateGroupQuestionDto.orderNumber !== existingGroupQuestion.orderNumber) {
      const orderConflict = await this.prisma.groupQuestion.findFirst({
        where: {
          groupId: existingGroupQuestion.groupId,
          orderNumber: updateGroupQuestionDto.orderNumber,
          id: { not: groupQuestionId },
        },
      });

      if (orderConflict) {
        throw new BadRequestException(`Order number ${updateGroupQuestionDto.orderNumber} is already taken in this group`);
      }
    }

    // Update group question
    const updatedGroupQuestion = await this.prisma.groupQuestion.update({
      where: { id: groupQuestionId },
      data: {
        ...updateGroupQuestionDto,
        updatedAt: new Date(),
      },
      include: {
        question: true,
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
      message: 'Group question updated successfully',
      groupQuestion: updatedGroupQuestion,
    };
  }

  async removeQuestionFromGroup(groupId: number, questionId: number) {
    // Check if group question exists
    const groupQuestion = await this.prisma.groupQuestion.findFirst({
      where: {
        questionId: questionId,
        groupId: groupId,
      },
      include: {
        question: true,
      },
    });

    if (!groupQuestion) {
      throw new NotFoundException('Question is not bound to this group');
    }

    // Remove group question
    await this.prisma.groupQuestion.delete({
      where: { id: groupQuestion.id },
    });

    return {
      message: 'Question removed from group successfully',
      removedQuestion: groupQuestion.question,
    };
  }

  async reorderQuestionsInGroup(groupId: number, reorderDto: ReorderQuestionsDto) {
    // Check if group exists
    const group = await this.prisma.group.findUnique({
      where: { id: groupId },
    });

    if (!group) {
      throw new NotFoundException('Group not found');
    }

    // Check if all group questions exist and belong to this group
    const groupQuestionIds = reorderDto.questions.map(q => q.groupQuestionId);
    const existingGroupQuestions = await this.prisma.groupQuestion.findMany({
      where: {
        id: { in: groupQuestionIds },
        groupId: groupId,
      },
    });

    if (existingGroupQuestions.length !== groupQuestionIds.length) {
      throw new NotFoundException('One or more group questions not found in this group');
    }

    // Check for duplicate order numbers
    const orderNumbers = reorderDto.questions.map(q => q.orderNumber);
    const uniqueOrderNumbers = new Set(orderNumbers);
    if (uniqueOrderNumbers.size !== orderNumbers.length) {
      throw new BadRequestException('Duplicate order numbers detected');
    }

    // Update all group questions in a transaction
    const updatePromises = reorderDto.questions.map(q =>
      this.prisma.groupQuestion.update({
        where: { id: q.groupQuestionId },
        data: {
          orderNumber: q.orderNumber,
          updatedAt: new Date(),
        },
      })
    );

    await this.prisma.$transaction(updatePromises);

    // Fetch updated group questions
    const updatedGroupQuestions = await this.prisma.groupQuestion.findMany({
      where: {
        groupId: groupId,
      },
      include: {
        question: true,
      },
      orderBy: {
        orderNumber: 'asc',
      },
    });

    return {
      message: 'Questions reordered successfully',
      groupQuestions: updatedGroupQuestions,
      count: updatedGroupQuestions.length,
    };
  }

  async getQuestionsInGroup(groupId: number) {
    // Check if group exists
    const group = await this.prisma.group.findUnique({
      where: { id: groupId },
    });

    if (!group) {
      throw new NotFoundException('Group not found');
    }

    const groupQuestions = await this.prisma.groupQuestion.findMany({
      where: { groupId },
      include: {
        question: true,
      },
      orderBy: {
        orderNumber: 'asc',
      },
    });

    return {
      message: 'Questions in group retrieved successfully',
      group: {
        id: group.id,
        groupName: group.groupName,
        description: group.description,
      },
      groupQuestions,
      count: groupQuestions.length,
    };
  }

  // Soft Delete Management Methods
  async getSoftDeletedGroups() {
    const groups = await this.softDeleteService.getSoftDeletedGroups();
    
    return {
      message: 'Soft deleted groups retrieved successfully',
      groups,
      count: groups.length,
    };
  }

  async restoreGroup(id: number, restoredBy?: number) {
    try {
      const restoredGroup = await this.softDeleteService.restoreGroup(id, { restoredBy });
      
      return {
        message: 'Group restored successfully',
        group: restoredGroup,
      };
    } catch (error) {
      throw new NotFoundException('Soft deleted group not found');
    }
  }

  async permanentlyDeleteGroup(id: number) {
    try {
      await this.softDeleteService.permanentlyDeleteGroup(id);
      
      return {
        message: 'Group permanently deleted successfully',
      };
    } catch (error) {
      throw new NotFoundException('Soft deleted group not found');
    }
  }
}
