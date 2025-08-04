import { Controller, Get, Post, Body, Param, Delete, UseGuards, ParseIntPipe, Put } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { RolesService } from './roles.service';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AssignRoleDto } from './dto/assign-role.dto';
import { AssignRoleByIdDto } from './dto/assign-role-by-id.dto';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { RoleResponseDto, UserRoleResponseDto } from './dto/role-response.dto';

@ApiTags('Roles')
@Controller('roles')
@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth()
export class RolesController {
  constructor(private rolesService: RolesService) {}

  @Get()
  @ApiOperation({ summary: 'Get all roles' })
  @ApiResponse({ status: 200, description: 'Roles retrieved successfully' })
  getAllRoles() {
    return this.rolesService.getAllRoles();
  }

  @Post()
  @ApiOperation({ summary: 'Create a new role (Admin/SuperAdmin only)' })
  @ApiResponse({ status: 201, description: 'Role created successfully', type: RoleResponseDto })
  @ApiResponse({ status: 400, description: 'Role already exists' })
  @Roles('ADMIN', 'SUPERADMIN')
  @UseGuards(RolesGuard)
  createRole(@Body() createRoleDto: CreateRoleDto) {
    return this.rolesService.createRole(createRoleDto);
  }

  @Post('assign')
  @ApiOperation({ summary: 'Assign role to user by role name (Admin/SuperAdmin only)' })
  @ApiResponse({ status: 200, description: 'Role assigned successfully', type: UserRoleResponseDto })
  @ApiResponse({ status: 404, description: 'Role or user not found' })
  @ApiResponse({ status: 400, description: 'User already has this role' })
  @Roles('ADMIN', 'SUPERADMIN')
  @UseGuards(RolesGuard)
  assignRole(@Body() assignRoleDto: AssignRoleDto) {
    return this.rolesService.assignRoleToUser(assignRoleDto.userId, assignRoleDto.roleName);
  }

  @Post('assign-by-id')
  @ApiOperation({ summary: 'Assign role to user by role ID (Admin/SuperAdmin only)' })
  @ApiResponse({ status: 200, description: 'Role assigned successfully', type: UserRoleResponseDto })
  @ApiResponse({ status: 404, description: 'Role or user not found' })
  @ApiResponse({ status: 400, description: 'User already has this role' })
  @Roles('ADMIN', 'SUPERADMIN')
  @UseGuards(RolesGuard)
  assignRoleById(@Body() assignRoleByIdDto: AssignRoleByIdDto) {
    return this.rolesService.assignRoleToUserById(assignRoleByIdDto.userId, assignRoleByIdDto.roleId);
  }

  @Delete('remove')
  @ApiOperation({ summary: 'Remove role from user by role name (Admin/SuperAdmin only)' })
  @ApiResponse({ status: 200, description: 'Role removed successfully' })
  @ApiResponse({ status: 404, description: 'Role not found or user does not have this role' })
  @Roles('ADMIN', 'SUPERADMIN')
  @UseGuards(RolesGuard)
  removeRole(@Body() assignRoleDto: AssignRoleDto) {
    return this.rolesService.removeRoleFromUser(assignRoleDto.userId, assignRoleDto.roleName);
  }

  @Delete('remove-by-id')
  @ApiOperation({ summary: 'Remove role from user by role ID (Admin/SuperAdmin only)' })
  @ApiResponse({ status: 200, description: 'Role removed successfully' })
  @ApiResponse({ status: 404, description: 'Role not found or user does not have this role' })
  @Roles('ADMIN', 'SUPERADMIN')
  @UseGuards(RolesGuard)
  removeRoleById(@Body() assignRoleByIdDto: AssignRoleByIdDto) {
    return this.rolesService.removeRoleFromUserById(assignRoleByIdDto.userId, assignRoleByIdDto.roleId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get role by ID' })
  @ApiResponse({ status: 200, description: 'Role retrieved successfully', type: RoleResponseDto })
  @ApiResponse({ status: 404, description: 'Role not found' })
  getRoleById(@Param('id', ParseIntPipe) id: number) {
    return this.rolesService.getRoleById(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update role (Admin/SuperAdmin only)' })
  @ApiResponse({ status: 200, description: 'Role updated successfully', type: RoleResponseDto })
  @ApiResponse({ status: 404, description: 'Role not found' })
  @ApiResponse({ status: 400, description: 'Role with this name already exists' })
  @Roles('ADMIN', 'SUPERADMIN')
  @UseGuards(RolesGuard)
  updateRole(@Param('id', ParseIntPipe) id: number, @Body() updateRoleDto: UpdateRoleDto) {
    return this.rolesService.updateRole(id, updateRoleDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete role (Admin/SuperAdmin only)' })
  @ApiResponse({ status: 200, description: 'Role deleted successfully' })
  @ApiResponse({ status: 404, description: 'Role not found' })
  @ApiResponse({ status: 400, description: 'Cannot delete role that is assigned to users' })
  @Roles('ADMIN', 'SUPERADMIN')
  @UseGuards(RolesGuard)
  deleteRole(@Param('id', ParseIntPipe) id: number) {
    return this.rolesService.deleteRole(id);
  }

  @Get('user/:userId')
  @ApiOperation({ summary: 'Get user roles' })
  @ApiResponse({ status: 200, description: 'User roles retrieved successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  getUserRoles(@Param('userId', ParseIntPipe) userId: number) {
    return this.rolesService.getUserRoles(userId);
  }

  @Get('users/:roleName')
  @ApiOperation({ summary: 'Get users with specific role' })
  @ApiResponse({ status: 200, description: 'Users with role retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Role not found' })
  getUsersWithRole(@Param('roleName') roleName: string) {
    return this.rolesService.getUsersWithRole(roleName);
  }
}