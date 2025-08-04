import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SoftDeleteService } from '../common/services/soft-delete.service';
import { CreateGroupDto } from './dto/create-group.dto';
import { UpdateGroupDto } from './dto/update-group.dto';
import { AssignUserToGroupDto, AssignUsersToGroupDto, RemoveUserFromGroupDto } from './dto/assign-user-to-group.dto';
import { 
  BindQuestionToGroupDto, 
  UpdateGroupQuestionDto, 
  ReorderQuestionsDto,
  CreateTahapGroupDto,
  UpdateTahapGroupDto,
  GetTahapGroupsDto,
  TahapGroup,
  CalculationType
} from './dto/group-question.dto';

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

  // Tahap-based Grouping Methods
  async createTahapGroup(groupId: number, createTahapGroupDto: CreateTahapGroupDto) {
    // Check if group exists
    const group = await this.prisma.group.findUnique({
      where: { id: groupId },
    });

    if (!group) {
      throw new NotFoundException('Group not found');
    }

    // Check if all questions exist and are bound to this group
    const existingGroupQuestions = await this.prisma.groupQuestion.findMany({
      where: {
        groupId: groupId,
        questionId: { in: createTahapGroupDto.questionIds },
      },
    });

    if (existingGroupQuestions.length !== createTahapGroupDto.questionIds.length) {
      throw new BadRequestException('Some questions are not bound to this group');
    }

    // Check if tahap group already exists
    const existingTahapGroup = await this.prisma.groupQuestion.findFirst({
      where: {
        groupId: groupId,
        tahapGroup: createTahapGroupDto.tahapGroup,
        groupIdentifier: createTahapGroupDto.groupIdentifier,
      },
    });

    if (existingTahapGroup) {
      throw new BadRequestException(
        `Tahap group '${createTahapGroupDto.tahapGroup}' with identifier '${createTahapGroupDto.groupIdentifier}' already exists in this group`
      );
    }

    // Update group questions with tahap group information using transaction
    await this.prisma.$transaction(async (prisma) => {
      for (const questionId of createTahapGroupDto.questionIds) {
        const groupQuestion = existingGroupQuestions.find(gq => gq.questionId === questionId);
        if (groupQuestion) {
          await prisma.groupQuestion.update({
            where: { id: groupQuestion.id },
            data: {
              tahapGroup: createTahapGroupDto.tahapGroup,
              calculationType: createTahapGroupDto.calculationType,
              groupIdentifier: createTahapGroupDto.groupIdentifier,
              isGrouped: true,
              updatedAt: new Date(),
            },
          });
        }
      }
    });

    // Fetch updated group questions
    const updatedGroupQuestions = await this.prisma.groupQuestion.findMany({
      where: {
        groupId: groupId,
        tahapGroup: createTahapGroupDto.tahapGroup,
        groupIdentifier: createTahapGroupDto.groupIdentifier,
      },
      include: {
        question: true,
      },
      orderBy: {
        orderNumber: 'asc',
      },
    });

    return {
      message: 'Tahap group created successfully',
      tahapGroup: {
        tahapGroup: createTahapGroupDto.tahapGroup,
        groupIdentifier: createTahapGroupDto.groupIdentifier,
        calculationType: createTahapGroupDto.calculationType,
        description: createTahapGroupDto.description,
        questionCount: updatedGroupQuestions.length,
        questions: updatedGroupQuestions,
      },
    };
  }

  async updateTahapGroup(groupId: number, groupIdentifier: string, updateTahapGroupDto: UpdateTahapGroupDto) {
    // Check if group exists
    const group = await this.prisma.group.findUnique({
      where: { id: groupId },
    });

    if (!group) {
      throw new NotFoundException('Group not found');
    }

    // Check if tahap group exists
    const existingGroupQuestions = await this.prisma.groupQuestion.findMany({
      where: {
        groupId: groupId,
        groupIdentifier: groupIdentifier,
      },
    });

    if (existingGroupQuestions.length === 0) {
      throw new NotFoundException('Tahap group not found');
    }

    // Check for conflicts if updating tahap group or group identifier
    if (updateTahapGroupDto.tahapGroup || updateTahapGroupDto.groupIdentifier) {
      const newTahapGroup = updateTahapGroupDto.tahapGroup || existingGroupQuestions[0].tahapGroup;
      const newGroupIdentifier = updateTahapGroupDto.groupIdentifier || groupIdentifier;

      if (newTahapGroup !== existingGroupQuestions[0].tahapGroup || newGroupIdentifier !== groupIdentifier) {
        const conflict = await this.prisma.groupQuestion.findFirst({
          where: {
            groupId: groupId,
            tahapGroup: newTahapGroup,
            groupIdentifier: newGroupIdentifier,
            id: { notIn: existingGroupQuestions.map(gq => gq.id) },
          },
        });

        if (conflict) {
          throw new BadRequestException(
            `Tahap group '${newTahapGroup}' with identifier '${newGroupIdentifier}' already exists in this group`
          );
        }
      }
    }

    // Update group questions
    const updateData: any = {
      updatedAt: new Date(),
    };

    if (updateTahapGroupDto.tahapGroup) updateData.tahapGroup = updateTahapGroupDto.tahapGroup;
    if (updateTahapGroupDto.calculationType) updateData.calculationType = updateTahapGroupDto.calculationType;
    if (updateTahapGroupDto.groupIdentifier) updateData.groupIdentifier = updateTahapGroupDto.groupIdentifier;

    const updatePromises = existingGroupQuestions.map(groupQuestion =>
      this.prisma.groupQuestion.update({
        where: { id: groupQuestion.id },
        data: updateData,
      })
    );

    await this.prisma.$transaction(updatePromises);

    // Handle question IDs update if provided
    if (updateTahapGroupDto.questionIds) {
      // Remove current questions from tahap group
      await this.prisma.groupQuestion.updateMany({
        where: {
          groupId: groupId,
          groupIdentifier: updateTahapGroupDto.groupIdentifier || groupIdentifier,
        },
        data: {
          tahapGroup: null,
          calculationType: null,
          groupIdentifier: null,
          isGrouped: false,
          updatedAt: new Date(),
        },
      });

      // Add new questions to tahap group
      const newGroupQuestions = await this.prisma.groupQuestion.findMany({
        where: {
          groupId: groupId,
          questionId: { in: updateTahapGroupDto.questionIds },
        },
      });

      if (newGroupQuestions.length !== updateTahapGroupDto.questionIds.length) {
        throw new BadRequestException('One or more questions are not bound to this group');
      }

      const addPromises = newGroupQuestions.map(groupQuestion =>
        this.prisma.groupQuestion.update({
          where: { id: groupQuestion.id },
          data: {
            tahapGroup: updateTahapGroupDto.tahapGroup || existingGroupQuestions[0].tahapGroup,
            calculationType: updateTahapGroupDto.calculationType || existingGroupQuestions[0].calculationType,
            groupIdentifier: updateTahapGroupDto.groupIdentifier || groupIdentifier,
            isGrouped: true,
            updatedAt: new Date(),
          },
        })
      );

      await this.prisma.$transaction(addPromises);
    }

    // Fetch updated group questions
    const updatedGroupQuestions = await this.prisma.groupQuestion.findMany({
      where: {
        groupId: groupId,
        groupIdentifier: updateTahapGroupDto.groupIdentifier || groupIdentifier,
      },
      include: {
        question: true,
      },
      orderBy: {
        orderNumber: 'asc',
      },
    });

    return {
      message: 'Tahap group updated successfully',
      tahapGroup: {
        tahapGroup: updateTahapGroupDto.tahapGroup || existingGroupQuestions[0].tahapGroup,
        groupIdentifier: updateTahapGroupDto.groupIdentifier || groupIdentifier,
        calculationType: updateTahapGroupDto.calculationType || existingGroupQuestions[0].calculationType,
        questionCount: updatedGroupQuestions.length,
        questions: updatedGroupQuestions,
      },
    };
  }

  async deleteTahapGroup(groupId: number, groupIdentifier: string) {
    // Check if group exists
    const group = await this.prisma.group.findUnique({
      where: { id: groupId },
    });

    if (!group) {
      throw new NotFoundException('Group not found');
    }

    // Check if tahap group exists
    const existingGroupQuestions = await this.prisma.groupQuestion.findMany({
      where: {
        groupId: groupId,
        groupIdentifier: groupIdentifier,
      },
    });

    if (existingGroupQuestions.length === 0) {
      throw new NotFoundException('Tahap group not found');
    }

    // Remove tahap group from all questions
    await this.prisma.groupQuestion.updateMany({
      where: {
        groupId: groupId,
        groupIdentifier: groupIdentifier,
      },
      data: {
        tahapGroup: null,
        calculationType: null,
        groupIdentifier: null,
        isGrouped: false,
        updatedAt: new Date(),
      },
    });

    return {
      message: 'Tahap group deleted successfully',
      deletedQuestions: existingGroupQuestions.length,
    };
  }

  async getTahapGroups(groupId: number, filters?: GetTahapGroupsDto) {
    // Check if group exists
    const group = await this.prisma.group.findUnique({
      where: { id: groupId },
    });

    if (!group) {
      throw new NotFoundException('Group not found');
    }

    // Build where clause
    const whereClause: any = {
      groupId: groupId,
      isGrouped: true,
    };

    if (filters?.tahapGroup) whereClause.tahapGroup = filters.tahapGroup;
    if (filters?.groupIdentifier) whereClause.groupIdentifier = filters.groupIdentifier;

    // Get grouped questions
    const groupQuestions = await this.prisma.groupQuestion.findMany({
      where: whereClause,
      include: {
        question: true,
      },
      orderBy: [
        { tahapGroup: 'asc' },
        { groupIdentifier: 'asc' },
        { orderNumber: 'asc' },
      ],
    });

    // Group by tahap group and group identifier
    const tahapGroups = groupQuestions.reduce((acc, groupQuestion) => {
      const key = `${groupQuestion.tahapGroup}_${groupQuestion.groupIdentifier}`;
      
      if (!acc[key]) {
        acc[key] = {
          tahapGroup: groupQuestion.tahapGroup,
          groupIdentifier: groupQuestion.groupIdentifier,
          calculationType: groupQuestion.calculationType,
          questionCount: 0,
          questions: [],
        };
      }

      acc[key].questions.push(groupQuestion);
      acc[key].questionCount++;

      return acc;
    }, {} as Record<string, any>);

    const result = Object.values(tahapGroups);

    return {
      message: 'Tahap groups retrieved successfully',
      group: {
        id: group.id,
        groupName: group.groupName,
        description: group.description,
      },
      tahapGroups: result,
      count: result.length,
    };
  }

  async getTahapGroupDetails(groupId: number, groupIdentifier: string) {
    // Check if group exists
    const group = await this.prisma.group.findUnique({
      where: { id: groupId },
    });

    if (!group) {
      throw new NotFoundException('Group not found');
    }

    // Get tahap group questions
    const groupQuestions = await this.prisma.groupQuestion.findMany({
      where: {
        groupId: groupId,
        groupIdentifier: groupIdentifier,
        isGrouped: true,
      },
      include: {
        question: true,
      },
      orderBy: {
        orderNumber: 'asc',
      },
    });

    if (groupQuestions.length === 0) {
      throw new NotFoundException('Tahap group not found');
    }

    // Group questions by subsection for better organization
    const questionsBySubsection = groupQuestions.reduce((acc, groupQuestion) => {
      const subsection = groupQuestion.subsection || 'General';
      
      if (!acc[subsection]) {
        acc[subsection] = [];
      }

      acc[subsection].push(groupQuestion);
      return acc;
    }, {} as Record<string, any[]>);

    return {
      message: 'Tahap group details retrieved successfully',
      group: {
        id: group.id,
        groupName: group.groupName,
        description: group.description,
      },
      tahapGroup: {
        tahapGroup: groupQuestions[0].tahapGroup,
        groupIdentifier: groupQuestions[0].groupIdentifier,
        calculationType: groupQuestions[0].calculationType,
        questionCount: groupQuestions.length,
        questionsBySubsection,
        allQuestions: groupQuestions,
      },
    };
  }

  async getCrossSubsectionGroups(groupId: number) {
    // Check if group exists
    const group = await this.prisma.group.findUnique({
      where: { id: groupId },
    });

    if (!group) {
      throw new NotFoundException('Group not found');
    }

    // Get all grouped questions
    const groupQuestions = await this.prisma.groupQuestion.findMany({
      where: {
        groupId: groupId,
        isGrouped: true,
      },
      include: {
        question: true,
      },
      orderBy: [
        { tahapGroup: 'asc' },
        { groupIdentifier: 'asc' },
        { orderNumber: 'asc' },
      ],
    });

    // Group by tahap group and identify cross-subsection groups
    const tahapGroups = groupQuestions.reduce((acc, groupQuestion) => {
      const key = `${groupQuestion.tahapGroup}_${groupQuestion.groupIdentifier}`;
      
      if (!acc[key]) {
        acc[key] = {
          tahapGroup: groupQuestion.tahapGroup,
          groupIdentifier: groupQuestion.groupIdentifier,
          calculationType: groupQuestion.calculationType,
          subsections: new Set<string>(),
          questionCount: 0,
          questions: [],
          isCrossSubsection: false,
        };
      }

      acc[key].questions.push(groupQuestion);
      acc[key].questionCount++;
      
      if (groupQuestion.subsection) {
        acc[key].subsections.add(groupQuestion.subsection);
      }

      return acc;
    }, {} as Record<string, any>);

    // Mark groups as cross-subsection if they span multiple subsections
    Object.values(tahapGroups).forEach((tahapGroup: any) => {
      tahapGroup.isCrossSubsection = tahapGroup.subsections.size > 1;
      tahapGroup.subsections = Array.from(tahapGroup.subsections);
    });

    const result = Object.values(tahapGroups);

    return {
      message: 'Cross-subsection groups retrieved successfully',
      group: {
        id: group.id,
        groupName: group.groupName,
        description: group.description,
      },
      tahapGroups: result,
      crossSubsectionGroups: result.filter((tg: any) => tg.isCrossSubsection),
      count: result.length,
    };
  }
}
