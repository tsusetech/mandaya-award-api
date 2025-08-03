import { 
    Controller, 
    Get, 
    Put, 
    Delete, 
    Body, 
    Param, 
    Query, 
    UseGuards, 
    ParseIntPipe,
    HttpStatus,
    Post,
    Request
  } from '@nestjs/common';
  import { AuthGuard } from '@nestjs/passport';
  import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
  import { UsersService } from './users.service';
  import { UpdateUserDto } from './dto/update-user.dto';
  import { UsersListResponseDto, UserResponseDto } from './dto/user-response.dto';
  import { Roles } from '../auth/decorators/roles.decorator';
  import { RolesGuard } from '../auth/guards/roles.guard';
  
  @ApiTags('Users')
  @Controller('users')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  export class UsersController {
    constructor(private usersService: UsersService) {}
  
    @Get()
    @ApiOperation({ summary: 'Get all users (Admin/SuperAdmin only)' })
    @ApiResponse({ 
      status: HttpStatus.OK, 
      description: 'Users retrieved successfully',
      type: UsersListResponseDto 
    })
    @Roles('ADMIN', 'SUPERADMIN')
    @UseGuards(RolesGuard)
    getAllUsers() {
      return this.usersService.getAllUsers();
    }
  
    @Get('stats')
    @ApiOperation({ summary: 'Get user statistics (Admin/SuperAdmin only)' })
    @ApiResponse({ status: HttpStatus.OK, description: 'User statistics retrieved' })
    @Roles('ADMIN', 'SUPERADMIN')
    @UseGuards(RolesGuard)
    getUserStats() {
      return this.usersService.getUserStats();
    }
  
    @Get('search')
    @ApiOperation({ summary: 'Search users (Admin/SuperAdmin only)' })
    @ApiQuery({ name: 'q', description: 'Search query' })
    @ApiResponse({ 
      status: HttpStatus.OK, 
      description: 'Search results retrieved',
      type: UsersListResponseDto 
    })
    @Roles('ADMIN', 'SUPERADMIN')
    @UseGuards(RolesGuard)
    searchUsers(@Query('q') query: string) {
      return this.usersService.searchUsers(query);
    }
  
    @Get('by-role/:roleName')
    @ApiOperation({ summary: 'Get users by role (Admin/SuperAdmin only)' })
    @ApiResponse({ 
      status: HttpStatus.OK, 
      description: 'Users with specific role retrieved',
      type: UsersListResponseDto 
    })
    @Roles('ADMIN', 'SUPERADMIN')
    @UseGuards(RolesGuard)
    getUsersByRole(@Param('roleName') roleName: string) {
      return this.usersService.getUsersByRole(roleName);
    }
  
    @Get(':id')
    @ApiOperation({ summary: 'Get user by ID (Admin/SuperAdmin only)' })
    @ApiResponse({ 
      status: HttpStatus.OK, 
      description: 'User retrieved successfully',
      type: UserResponseDto 
    })
    @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'User not found' })
    @Roles('ADMIN', 'SUPERADMIN')
    @UseGuards(RolesGuard)
    getUserById(@Param('id', ParseIntPipe) id: number) {
      return this.usersService.getUserById(id);
    }
  
    @Put(':id')
    @ApiOperation({ summary: 'Update user (Admin/SuperAdmin only)' })
    @ApiResponse({ 
      status: HttpStatus.OK, 
      description: 'User updated successfully',
      type: UserResponseDto 
    })
    @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'User not found' })
    @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Email or username already exists' })
    @Roles('ADMIN', 'SUPERADMIN')
    @UseGuards(RolesGuard)
    updateUser(
      @Param('id', ParseIntPipe) id: number,
      @Body() updateUserDto: UpdateUserDto
    ) {
      return this.usersService.updateUser(id, updateUserDto);
    }
  
      @Delete(':id')
  @ApiOperation({ summary: 'Soft delete user (SuperAdmin only)' })
  @ApiResponse({ status: HttpStatus.OK, description: 'User deleted successfully' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'User not found' })
  @Roles('SUPERADMIN')
  @UseGuards(RolesGuard)
  deleteUser(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    const deletedBy = req.user?.sub;
    return this.usersService.deleteUser(id, deletedBy);
  }

  @Get(':id/groups')
  @ApiOperation({ summary: 'Get groups for user (Admin/SuperAdmin only)' })
  @ApiResponse({ status: HttpStatus.OK, description: 'User groups retrieved successfully' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'User not found' })
  @Roles('ADMIN', 'SUPERADMIN')
  @UseGuards(RolesGuard)
  getUserGroups(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.getUserGroups(id);
  }

  // Soft Delete Management Endpoints
  @Get('deleted/list')
  @ApiOperation({ summary: 'Get all soft deleted users (SuperAdmin only)' })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Soft deleted users retrieved successfully',
    type: UsersListResponseDto 
  })
  @Roles('SUPERADMIN')
  @UseGuards(RolesGuard)
  getSoftDeletedUsers() {
    return this.usersService.getSoftDeletedUsers();
  }

  @Post(':id/restore')
  @ApiOperation({ summary: 'Restore soft deleted user (SuperAdmin only)' })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'User restored successfully',
    type: UserResponseDto 
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Soft deleted user not found' })
  @Roles('SUPERADMIN')
  @UseGuards(RolesGuard)
  restoreUser(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    const restoredBy = req.user?.sub;
    return this.usersService.restoreUser(id, restoredBy);
  }

  @Delete(':id/permanent')
  @ApiOperation({ summary: 'Permanently delete user (SuperAdmin only)' })
  @ApiResponse({ status: HttpStatus.OK, description: 'User permanently deleted successfully' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Soft deleted user not found' })
  @Roles('SUPERADMIN')
  @UseGuards(RolesGuard)
  permanentlyDeleteUser(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.permanentlyDeleteUser(id);
  }
}