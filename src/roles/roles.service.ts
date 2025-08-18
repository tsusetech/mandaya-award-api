import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SoftDeleteService } from '../common/services/soft-delete.service';
import { ResponseService } from '../common/services/response.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';

@Injectable()
export class RolesService {
  constructor(
    private prisma: PrismaService,
    private responseService: ResponseService,
    private softDeleteService: SoftDeleteService,
  ) {}

  async getAllRoles() {
    const roles = await this.prisma.role.findMany({
      where: this.softDeleteService.getActiveRecordsWhere(),
      include: {
        userRoles: {
          include: {
            user: {
              select: { id: true, email: true, username: true, name: true },
            },
          },
        },
      },
    });

    return this.responseService.success(roles, 'Roles retrieved successfully');
  }

  async createRole(createRoleDto: CreateRoleDto) {
    // Check if role already exists
    const existingRole = await this.prisma.role.findFirst({
      where: {
        name: createRoleDto.name.toUpperCase(),
        ...this.softDeleteService.getActiveRecordsWhere(),
      },
    });

    if (existingRole) {
      throw new BadRequestException('Role already exists');
    }

    const role = await this.prisma.role.create({
      data: {
        name: createRoleDto.name.toUpperCase(),
        description: createRoleDto.description,
      },
    });

    return this.responseService.success(role, 'Role created successfully');
  }

  async updateRole(id: number, updateRoleDto: UpdateRoleDto) {
    // Check if role exists
    const existingRole = await this.prisma.role.findFirst({
      where: {
        id,
        ...this.softDeleteService.getActiveRecordsWhere(),
      },
    });

    if (!existingRole) {
      throw new NotFoundException('Role not found');
    }

    // Check if new name conflicts with existing role (if name is being updated)
    if (updateRoleDto.name) {
      const roleWithSameName = await this.prisma.role.findFirst({
        where: {
          name: updateRoleDto.name.toUpperCase(),
          id: { not: id },
          ...this.softDeleteService.getActiveRecordsWhere(),
        },
      });

      if (roleWithSameName) {
        throw new BadRequestException('Role with this name already exists');
      }
    }

    const updatedRole = await this.prisma.role.update({
      where: {
        id,
        ...this.softDeleteService.getActiveRecordsWhere(),
      },
      data: {
        ...(updateRoleDto.name && { name: updateRoleDto.name.toUpperCase() }),
        ...(updateRoleDto.description !== undefined && {
          description: updateRoleDto.description,
        }),
      },
    });

    return this.responseService.success(
      updatedRole,
      'Role updated successfully',
    );
  }

  async deleteRole(id: number, deletedBy?: number) {
    // Check if role exists
    const existingRole = await this.prisma.role.findFirst({
      where: {
        id,
        ...this.softDeleteService.getActiveRecordsWhere(),
      },
      include: {
        userRoles: true,
      },
    });

    if (!existingRole) {
      throw new NotFoundException('Role not found');
    }

    // Check if role is assigned to any users
    if (existingRole.userRoles.length > 0) {
      throw new BadRequestException(
        'Cannot delete role that is assigned to users',
      );
    }

    await this.softDeleteService.softDeleteRole(id, { deletedBy });

    return this.responseService.success(null, 'Role deleted successfully');
  }

  async getRoleById(id: number) {
    const role = await this.prisma.role.findFirst({
      where: {
        id,
        ...this.softDeleteService.getActiveRecordsWhere(),
      },
      include: {
        userRoles: {
          include: {
            user: {
              select: { id: true, email: true, username: true, name: true },
            },
          },
        },
      },
    });

    if (!role) {
      throw new NotFoundException('Role not found');
    }

    return this.responseService.success(role, 'Role retrieved successfully');
  }

  async assignRoleToUser(userId: number, roleName: string) {
    // Find the role by name
    const role = await this.prisma.role.findUnique({
      where: { name: roleName.toUpperCase() },
    });

    if (!role) {
      throw new NotFoundException(`Role '${roleName}' not found`);
    }

    // Check if user exists
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check if user already has this role
    const existingUserRole = await this.prisma.userRole.findUnique({
      where: { userId_roleId: { userId, roleId: role.id } },
    });

    if (existingUserRole) {
      throw new BadRequestException('User already has this role');
    }

    const userRole = await this.prisma.userRole.create({
      data: { userId, roleId: role.id },
      include: {
        user: { select: { id: true, email: true, username: true, name: true } },
        role: { select: { id: true, name: true, description: true } },
      },
    });

    return this.responseService.success(userRole, 'Role assigned successfully');
  }

  async assignRoleToUserById(userId: number, roleId: number) {
    // Check if role exists
    const role = await this.prisma.role.findUnique({
      where: { id: roleId },
    });

    if (!role) {
      throw new NotFoundException(`Role with ID ${roleId} not found`);
    }

    // Check if user exists
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check if user already has this role
    const existingUserRole = await this.prisma.userRole.findUnique({
      where: { userId_roleId: { userId, roleId } },
    });

    if (existingUserRole) {
      throw new BadRequestException('User already has this role');
    }

    const userRole = await this.prisma.userRole.create({
      data: { userId, roleId },
      include: {
        user: { select: { id: true, email: true, username: true, name: true } },
        role: { select: { id: true, name: true, description: true } },
      },
    });

    return this.responseService.success(userRole, 'Role assigned successfully');
  }

  async removeRoleFromUser(userId: number, roleName: string) {
    // Find the role by name
    const role = await this.prisma.role.findUnique({
      where: { name: roleName.toUpperCase() },
    });

    if (!role) {
      throw new NotFoundException(`Role '${roleName}' not found`);
    }

    const userRole = await this.prisma.userRole.findUnique({
      where: { userId_roleId: { userId, roleId: role.id } },
    });

    if (!userRole) {
      throw new NotFoundException('User does not have this role');
    }

    await this.prisma.userRole.delete({
      where: { userId_roleId: { userId, roleId: role.id } },
    });

    return this.responseService.success(null, 'Role removed successfully');
  }

  async removeRoleFromUserById(userId: number, roleId: number) {
    // Check if role exists
    const role = await this.prisma.role.findUnique({
      where: { id: roleId },
    });

    if (!role) {
      throw new NotFoundException(`Role with ID ${roleId} not found`);
    }

    const userRole = await this.prisma.userRole.findUnique({
      where: { userId_roleId: { userId, roleId } },
    });

    if (!userRole) {
      throw new NotFoundException('User does not have this role');
    }

    await this.prisma.userRole.delete({
      where: { userId_roleId: { userId, roleId } },
    });

    return this.responseService.success(null, 'Role removed successfully');
  }

  async getUserRoles(userId: number) {
    // Check if user exists
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const userRoles = await this.prisma.userRole.findMany({
      where: { userId },
      include: {
        role: true,
      },
    });

    return this.responseService.success(
      userRoles,
      'User roles retrieved successfully',
    );
  }

  async getUsersWithRole(roleName: string) {
    // Check if role exists
    const role = await this.prisma.role.findUnique({
      where: { name: roleName.toUpperCase() },
    });

    if (!role) {
      throw new NotFoundException(`Role '${roleName}' not found`);
    }

    const usersWithRole = await this.prisma.userRole.findMany({
      where: {
        role: { name: roleName.toUpperCase() },
      },
      include: {
        user: {
          select: { id: true, email: true, username: true, name: true },
        },
        role: true,
      },
    });

    return this.responseService.success(
      usersWithRole,
      `Users with role '${roleName}' retrieved successfully`,
    );
  }

  // Soft Delete Management Methods
  async getSoftDeletedRoles() {
    const roles = await this.softDeleteService.getSoftDeletedRoles();

    return this.responseService.success(
      roles,
      'Soft deleted roles retrieved successfully',
    );
  }

  async restoreRole(id: number, restoredBy?: number) {
    try {
      const restoredRole = await this.softDeleteService.restoreRole(id, {
        restoredBy,
      });

      return this.responseService.success(
        restoredRole,
        'Role restored successfully',
      );
    } catch (error) {
      throw new NotFoundException('Soft deleted role not found');
    }
  }

  async permanentlyDeleteRole(id: number) {
    try {
      await this.softDeleteService.permanentlyDeleteRole(id);

      return this.responseService.success(
        null,
        'Role permanently deleted successfully',
      );
    } catch (error) {
      throw new NotFoundException('Soft deleted role not found');
    }
  }
}
