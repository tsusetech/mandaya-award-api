import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SoftDeleteService } from '../common/services/soft-delete.service';

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private softDeleteService: SoftDeleteService,
  ) {}

  async getAllUsers() {
    const users = await this.prisma.user.findMany({
      where: this.softDeleteService.getActiveRecordsWhere(),
      include: {
        userRoles: {
          include: {
            role: true,
          },
        },
      },
    });

    return {
      message: 'Users retrieved successfully',
      users: users.map((user) => {
        const { password, ...userWithoutPassword } = user;
        return userWithoutPassword;
      }),
      count: users.length,
    };
  }

  async getUserById(id: number) {
    const user = await this.prisma.user.findFirst({
      where: {
        id,
        ...this.softDeleteService.getActiveRecordsWhere(),
      },
      include: {
        userRoles: {
          include: {
            role: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const { password, ...userWithoutPassword } = user;
    return {
      message: 'User retrieved successfully',
      user: userWithoutPassword,
    };
  }

  async updateUser(
    id: number,
    updateData: { name?: string; email?: string; username?: string; roleName?: string },
  ) {
    // Check if user exists
    const existingUser = await this.prisma.user.findFirst({
      where: {
        id,
        ...this.softDeleteService.getActiveRecordsWhere(),
      },
    });

    if (!existingUser) {
      throw new NotFoundException('User not found');
    }

    // Check if email or username is already taken by another user
    if (updateData.email || updateData.username) {
      const conflictUser = await this.prisma.user.findFirst({
        where: {
          AND: [
            { id: { not: id } }, // Exclude current user
            this.softDeleteService.getActiveRecordsWhere(), // Only active users
            {
              OR: [
                updateData.email ? { email: updateData.email } : {},
                updateData.username ? { username: updateData.username } : {},
              ].filter((condition) => Object.keys(condition).length > 0),
            },
          ],
        },
      });

      if (conflictUser) {
        throw new BadRequestException('Email or username already exists');
      }
    }

    // Update user with role assignment in a transaction
    const updatedUser = await this.prisma.$transaction(async (prisma) => {
      // Update basic user data
      const user = await prisma.user.update({
        where: {
          id,
          ...this.softDeleteService.getActiveRecordsWhere(),
        },
        data: {
          name: updateData.name,
          email: updateData.email,
          username: updateData.username,
          updatedAt: new Date(),
        },
      });

      // Handle role update if provided
      if (updateData.roleName) {
        const roleName = updateData.roleName.toUpperCase();
        const role = await prisma.role.findUnique({
          where: { name: roleName },
        });

        if (!role) {
          throw new BadRequestException(`Role '${roleName}' not found`);
        }

        // Remove existing roles
        await prisma.userRole.deleteMany({
          where: { userId: id },
        });

        // Assign new role
        await prisma.userRole.create({
          data: {
            userId: id,
            roleId: role.id,
          },
        });
      }

      return user;
    });

    // Fetch updated user with roles
    const userWithRoles = await this.prisma.user.findUnique({
      where: { id },
      include: {
        userRoles: {
          include: {
            role: true,
          },
        },
      },
    });

    const { password, ...userWithoutPassword } = userWithRoles;
    return {
      message: 'User updated successfully',
      user: userWithoutPassword,
    };
  }

  async deleteUser(id: number, deletedBy?: number) {
    // Check if user exists
    const existingUser = await this.prisma.user.findFirst({
      where: {
        id,
        ...this.softDeleteService.getActiveRecordsWhere(),
      },
    });

    if (!existingUser) {
      throw new NotFoundException('User not found');
    }

    // Soft delete user
    await this.softDeleteService.softDeleteUser(id, { deletedBy });

    return {
      message: 'User deleted successfully',
    };
  }

  async getUsersByRole(roleName: string) {
    const usersWithRole = await this.prisma.userRole.findMany({
      where: {
        role: {
          name: roleName,
          ...this.softDeleteService.getActiveRecordsWhere(),
        },
        user: this.softDeleteService.getActiveRecordsWhere(),
      },
      include: {
        user: {
          include: {
            userRoles: {
              include: {
                role: true,
              },
            },
          },
        },
      },
    });

    return {
      message: `Users with role ${roleName} retrieved successfully`,
      users: usersWithRole.map((ur) => {
        const { password, ...userWithoutPassword } = ur.user;
        return userWithoutPassword;
      }),
      count: usersWithRole.length,
    };
  }

  async searchUsers(query: string) {
    const users = await this.prisma.user.findMany({
      where: {
        AND: [
          this.softDeleteService.getActiveRecordsWhere(),
          {
            OR: [
              { name: { contains: query, mode: 'insensitive' as const } },
              { email: { contains: query, mode: 'insensitive' as const } },
              { username: { contains: query, mode: 'insensitive' as const } },
            ],
          },
        ],
      },
      include: {
        userRoles: {
          include: {
            role: true,
          },
        },
      },
    });

    return {
      message: 'Search results retrieved successfully',
      users: users.map((user) => {
        const { password, ...userWithoutPassword } = user;
        return userWithoutPassword;
      }),
      count: users.length,
    };
  }

  async getUserStats() {
    const totalUsers = await this.prisma.user.count({
      where: this.softDeleteService.getActiveRecordsWhere(),
    });

    const usersByRole = await this.prisma.role.findMany({
      include: {
        userRoles: {
          include: {
            user: true,
          },
        },
      },
    });

    const roleStats = usersByRole.map((role) => ({
      roleName: role.name,
      userCount: role.userRoles.length,
    }));

    return {
      message: 'User statistics retrieved successfully',
      stats: {
        totalUsers,
        roleStats,
      },
    };
  }

  async getUserGroups(userId: number) {
    // Check if user exists
    const user = await this.prisma.user.findFirst({
      where: {
        id: userId,
        ...this.softDeleteService.getActiveRecordsWhere(),
      },
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
              orderBy: [{ groupId: 'asc' }, { orderNumber: 'asc' }],
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

    const { password, ...userWithoutPassword } = user;
    return {
      message: 'User groups retrieved successfully',
      user: userWithoutPassword,
      groups: userGroups.map((ug) => ug.group),
      count: userGroups.length,
    };
  }

  // Soft Delete Management Methods
  async getSoftDeletedUsers() {
    const users = await this.softDeleteService.getSoftDeletedUsers();

    return {
      message: 'Soft deleted users retrieved successfully',
      users: users.map((user) => {
        const { password, ...userWithoutPassword } = user;
        return userWithoutPassword;
      }),
      count: users.length,
    };
  }

  async restoreUser(id: number, restoredBy?: number) {
    try {
      const restoredUser = await this.softDeleteService.restoreUser(id, {
        restoredBy,
      });
      const { password, ...userWithoutPassword } = restoredUser;

      return {
        message: 'User restored successfully',
        user: userWithoutPassword,
      };
    } catch (error) {
      throw new NotFoundException('Soft deleted user not found');
    }
  }

  async permanentlyDeleteUser(id: number) {
    try {
      await this.softDeleteService.permanentlyDeleteUser(id);

      return {
        message: 'User permanently deleted successfully',
      };
    } catch (error) {
      throw new NotFoundException('Soft deleted user not found');
    }
  }
}
