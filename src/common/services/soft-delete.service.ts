import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface SoftDeleteOptions {
  deletedBy?: number;
  includeSoftDeleted?: boolean;
}

export interface RestoreOptions {
  restoredBy?: number;
}

@Injectable()
export class SoftDeleteService {
  constructor(private prisma: PrismaService) {}

  /**
   * Get base where clause to exclude soft deleted records
   */
  getActiveRecordsWhere(includeSoftDeleted = false) {
    return includeSoftDeleted ? {} : { deletedAt: null };
  }

  /**
   * Get base where clause to get only soft deleted records
   */
  getSoftDeletedRecordsWhere() {
    return { deletedAt: { not: null } };
  }

  /**
   * Soft delete a user
   */
  async softDeleteUser(id: number, options: SoftDeleteOptions = {}) {
    return this.prisma.user.update({
      where: { id, deletedAt: null },
      data: {
        deletedAt: new Date(),
        deletedBy: options.deletedBy,
        updatedAt: new Date(),
      },
    });
  }

  /**
   * Restore a soft deleted user
   */
  async restoreUser(id: number, options: RestoreOptions = {}) {
    return this.prisma.user.update({
      where: { id, deletedAt: { not: null } },
      data: {
        deletedAt: null,
        deletedBy: null,
        updatedAt: new Date(),
      },
    });
  }

  /**
   * Soft delete a role
   */
  async softDeleteRole(id: number, options: SoftDeleteOptions = {}) {
    return this.prisma.role.update({
      where: { id, deletedAt: null },
      data: {
        deletedAt: new Date(),
        deletedBy: options.deletedBy,
        updatedAt: new Date(),
      },
    });
  }

  /**
   * Restore a soft deleted role
   */
  async restoreRole(id: number, options: RestoreOptions = {}) {
    return this.prisma.role.update({
      where: { id, deletedAt: { not: null } },
      data: {
        deletedAt: null,
        deletedBy: null,
        updatedAt: new Date(),
      },
    });
  }

  /**
   * Soft delete a question
   */
  async softDeleteQuestion(id: number, options: SoftDeleteOptions = {}) {
    return this.prisma.question.update({
      where: { id, deletedAt: null },
      data: {
        deletedAt: new Date(),
        deletedBy: options.deletedBy,
        updatedAt: new Date(),
      },
    });
  }

  /**
   * Restore a soft deleted question
   */
  async restoreQuestion(id: number, options: RestoreOptions = {}) {
    return this.prisma.question.update({
      where: { id, deletedAt: { not: null } },
      data: {
        deletedAt: null,
        deletedBy: null,
        updatedAt: new Date(),
      },
    });
  }

  /**
   * Soft delete a group
   */
  async softDeleteGroup(id: number, options: SoftDeleteOptions = {}) {
    return this.prisma.group.update({
      where: { id, deletedAt: null },
      data: {
        deletedAt: new Date(),
        deletedBy: options.deletedBy,
        updatedAt: new Date(),
      },
    });
  }

  /**
   * Restore a soft deleted group
   */
  async restoreGroup(id: number, options: RestoreOptions = {}) {
    return this.prisma.group.update({
      where: { id, deletedAt: { not: null } },
      data: {
        deletedAt: null,
        deletedBy: null,
        updatedAt: new Date(),
      },
    });
  }

  /**
   * Soft delete a response session
   */
  async softDeleteResponseSession(id: number, options: SoftDeleteOptions = {}) {
    return this.prisma.responseSession.update({
      where: { id, deletedAt: null },
      data: {
        deletedAt: new Date(),
        deletedBy: options.deletedBy,
        lastActivityAt: new Date(),
      },
    });
  }

  /**
   * Restore a soft deleted response session
   */
  async restoreResponseSession(id: number, options: RestoreOptions = {}) {
    return this.prisma.responseSession.update({
      where: { id, deletedAt: { not: null } },
      data: {
        deletedAt: null,
        deletedBy: null,
        lastActivityAt: new Date(),
      },
    });
  }

  /**
   * Get all soft deleted users
   */
  async getSoftDeletedUsers() {
    return this.prisma.user.findMany({
      where: this.getSoftDeletedRecordsWhere(),
      include: {
        deletedByUser: {
          select: {
            id: true,
            name: true,
            email: true,
            username: true,
          },
        },
      },
      orderBy: { deletedAt: 'desc' },
    });
  }

  /**
   * Get all soft deleted roles
   */
  async getSoftDeletedRoles() {
    return this.prisma.role.findMany({
      where: this.getSoftDeletedRecordsWhere(),
      include: {
        deletedByUser: {
          select: {
            id: true,
            name: true,
            email: true,
            username: true,
          },
        },
      },
      orderBy: { deletedAt: 'desc' },
    });
  }

  /**
   * Get all soft deleted questions
   */
  async getSoftDeletedQuestions() {
    return this.prisma.question.findMany({
      where: this.getSoftDeletedRecordsWhere(),
      include: {
        deletedByUser: {
          select: {
            id: true,
            name: true,
            email: true,
            username: true,
          },
        },
      },
      orderBy: { deletedAt: 'desc' },
    });
  }

  /**
   * Get all soft deleted groups
   */
  async getSoftDeletedGroups() {
    return this.prisma.group.findMany({
      where: this.getSoftDeletedRecordsWhere(),
      include: {
        deletedByUser: {
          select: {
            id: true,
            name: true,
            email: true,
            username: true,
          },
        },
      },
      orderBy: { deletedAt: 'desc' },
    });
  }

  /**
   * Get all soft deleted response sessions
   */
  async getSoftDeletedResponseSessions() {
    return this.prisma.responseSession.findMany({
      where: this.getSoftDeletedRecordsWhere(),
      include: {
        deletedByUser: {
          select: {
            id: true,
            name: true,
            email: true,
            username: true,
          },
        },
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
      orderBy: { deletedAt: 'desc' },
    });
  }

  /**
   * Permanently delete a user (hard delete)
   */
  async permanentlyDeleteUser(id: number) {
    return this.prisma.user.delete({
      where: { id, deletedAt: { not: null } },
    });
  }

  /**
   * Permanently delete a role (hard delete)
   */
  async permanentlyDeleteRole(id: number) {
    return this.prisma.role.delete({
      where: { id, deletedAt: { not: null } },
    });
  }

  /**
   * Permanently delete a question (hard delete)
   */
  async permanentlyDeleteQuestion(id: number) {
    return this.prisma.question.delete({
      where: { id, deletedAt: { not: null } },
    });
  }

  /**
   * Permanently delete a group (hard delete)
   */
  async permanentlyDeleteGroup(id: number) {
    return this.prisma.group.delete({
      where: { id, deletedAt: { not: null } },
    });
  }

  /**
   * Permanently delete a response session (hard delete)
   */
  async permanentlyDeleteResponseSession(id: number) {
    return this.prisma.responseSession.delete({
      where: { id, deletedAt: { not: null } },
    });
  }
}
