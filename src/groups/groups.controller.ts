import { 
  Controller, 
  Get, 
  Post, 
  Put, 
  Delete, 
  Body, 
  Param, 
  Query, 
  UseGuards, 
  ParseIntPipe,
  HttpStatus,
  Request
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { GroupsService } from './groups.service';
import { CreateGroupDto } from './dto/create-group.dto';
import { UpdateGroupDto } from './dto/update-group.dto';
import { GroupsListResponseDto, SingleGroupResponseDto } from './dto/group-response.dto';
import { AssignUserToGroupDto, AssignUsersToGroupDto, RemoveUserFromGroupDto } from './dto/assign-user-to-group.dto';
import { 
  BindQuestionToGroupDto, 
  BindMultipleQuestionsToGroupDto,
  UpdateGroupQuestionDto, 
  ReorderQuestionsDto,
  CreateTahapGroupDto,
  UpdateTahapGroupDto,
  GetTahapGroupsDto
} from './dto/group-question.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';

@ApiTags('Groups')
@Controller('groups')
@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth()
export class GroupsController {
  constructor(private groupsService: GroupsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all groups (Admin/SuperAdmin only)' })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Groups retrieved successfully',
    type: GroupsListResponseDto 
  })
  @Roles('ADMIN', 'SUPERADMIN')
  @UseGuards(RolesGuard)
  getAllGroups() {
    return this.groupsService.getAllGroups();
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get group statistics (Admin/SuperAdmin only)' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Group statistics retrieved' })
  @Roles('ADMIN', 'SUPERADMIN')
  @UseGuards(RolesGuard)
  getGroupStats() {
    return this.groupsService.getGroupStats();
  }

  @Get('search')
  @ApiOperation({ summary: 'Search groups (Admin/SuperAdmin only)' })
  @ApiQuery({ name: 'q', description: 'Search query' })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Search results retrieved',
    type: GroupsListResponseDto 
  })
  @Roles('ADMIN', 'SUPERADMIN')
  @UseGuards(RolesGuard)
  searchGroups(@Query('q') query: string) {
    return this.groupsService.searchGroups(query);
  }

  @Get('my-groups')
  @ApiOperation({ summary: 'Get current user\'s assigned groups with questions' })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'User groups retrieved successfully'
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'User not found' })
  async getMyGroups(@Request() req) {
    return this.groupsService.getGroupsForUser(req.user.userId);
  }

  @Get('my-groups/:groupId')
  @ApiOperation({ summary: 'Get specific group details for current user' })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Group details retrieved successfully'
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Group not found or user not assigned to this group' })
  async getMyGroupById(@Request() req, @Param('groupId', ParseIntPipe) groupId: number) {
    return this.groupsService.getGroupForUser(req.user.userId, groupId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get group by ID (Admin/SuperAdmin only)' })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Group retrieved successfully',
    type: SingleGroupResponseDto 
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Group not found' })
  @Roles('ADMIN', 'SUPERADMIN')
  @UseGuards(RolesGuard)
  getGroupById(@Param('id', ParseIntPipe) id: number) {
    return this.groupsService.getGroupById(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create new group (Admin/SuperAdmin only)' })
  @ApiResponse({ 
    status: HttpStatus.CREATED, 
    description: 'Group created successfully',
    type: SingleGroupResponseDto 
  })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Group name already exists' })
  @Roles('ADMIN', 'SUPERADMIN')
  @UseGuards(RolesGuard)
  createGroup(@Body() createGroupDto: CreateGroupDto) {
    return this.groupsService.createGroup(createGroupDto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update group (Admin/SuperAdmin only)' })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Group updated successfully',
    type: SingleGroupResponseDto 
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Group not found' })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Group name already exists' })
  @Roles('ADMIN', 'SUPERADMIN')
  @UseGuards(RolesGuard)
  updateGroup(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateGroupDto: UpdateGroupDto
  ) {
    return this.groupsService.updateGroup(id, updateGroupDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Soft delete group (SuperAdmin only)' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Group deleted successfully' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Group not found' })
  @Roles('SUPERADMIN')
  @UseGuards(RolesGuard)
  deleteGroup(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    const deletedBy = req.user?.sub;
    return this.groupsService.deleteGroup(id, deletedBy);
  }

  // UserGroup Management Endpoints
  @Post(':id/users')
  @ApiOperation({ summary: 'Assign user to group (Admin/SuperAdmin only)' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'User assigned to group successfully' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Group or user not found' })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'User is already assigned to this group' })
  @Roles('ADMIN', 'SUPERADMIN')
  @UseGuards(RolesGuard)
  assignUserToGroup(
    @Param('id', ParseIntPipe) groupId: number,
    @Body() assignUserDto: AssignUserToGroupDto
  ) {
    return this.groupsService.assignUserToGroup(groupId, assignUserDto);
  }

  @Post(':id/users/bulk')
  @ApiOperation({ summary: 'Assign multiple users to group (Admin/SuperAdmin only)' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Users assigned to group successfully' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Group not found or one or more users not found' })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'One or more users are already assigned to this group' })
  @Roles('ADMIN', 'SUPERADMIN')
  @UseGuards(RolesGuard)
  assignUsersToGroup(
    @Param('id', ParseIntPipe) groupId: number,
    @Body() assignUsersDto: AssignUsersToGroupDto
  ) {
    return this.groupsService.assignUsersToGroup(groupId, assignUsersDto);
  }

  @Delete(':id/users/:userId')
  @ApiOperation({ summary: 'Remove user from group (Admin/SuperAdmin only)' })
  @ApiResponse({ status: HttpStatus.OK, description: 'User removed from group successfully' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'User is not assigned to this group' })
  @Roles('ADMIN', 'SUPERADMIN')
  @UseGuards(RolesGuard)
  removeUserFromGroup(
    @Param('id', ParseIntPipe) groupId: number,
    @Param('userId', ParseIntPipe) userId: number
  ) {
    return this.groupsService.removeUserFromGroup(groupId, { userId });
  }

  @Get(':id/users')
  @ApiOperation({ summary: 'Get users in group (Admin/SuperAdmin only)' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Users in group retrieved successfully' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Group not found' })
  @Roles('ADMIN', 'SUPERADMIN')
  @UseGuards(RolesGuard)
  getUsersInGroup(@Param('id', ParseIntPipe) groupId: number) {
    return this.groupsService.getUsersInGroup(groupId);
  }

  // GroupQuestion Management Endpoints
  @Post(':id/questions')
  @ApiOperation({ summary: 'Bind question to group (Admin/SuperAdmin only)' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Question bound to group successfully' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Group or question not found' })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Question is already bound to this group or order number conflict' })
  @Roles('ADMIN', 'SUPERADMIN')
  @UseGuards(RolesGuard)
  bindQuestionToGroup(
    @Param('id', ParseIntPipe) groupId: number,
    @Body() bindQuestionDto: BindQuestionToGroupDto
  ) {
    return this.groupsService.bindQuestionToGroup(groupId, bindQuestionDto);
  }

  @Post(':id/questions/bulk')
  @ApiOperation({ summary: 'Bind multiple questions to group (Admin/SuperAdmin only)' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Multiple questions bound to group successfully' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Group or one or more questions not found' })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'One or more questions already bound to group or order number conflicts' })
  @Roles('ADMIN', 'SUPERADMIN')
  @UseGuards(RolesGuard)
  bindMultipleQuestionsToGroup(
    @Param('id', ParseIntPipe) groupId: number,
    @Body() bindMultipleQuestionsDto: BindMultipleQuestionsToGroupDto
  ) {
    return this.groupsService.bindMultipleQuestionsToGroup(groupId, bindMultipleQuestionsDto);
  }

  @Put(':id/questions/:groupQuestionId')
  @ApiOperation({ summary: 'Update group question (Admin/SuperAdmin only)' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Group question updated successfully' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Group question not found' })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Order number conflict' })
  @Roles('ADMIN', 'SUPERADMIN')
  @UseGuards(RolesGuard)
  updateGroupQuestion(
    @Param('groupQuestionId', ParseIntPipe) groupQuestionId: number,
    @Body() updateGroupQuestionDto: UpdateGroupQuestionDto
  ) {
    return this.groupsService.updateGroupQuestion(groupQuestionId, updateGroupQuestionDto);
  }

  @Delete(':id/questions/:questionId')
  @ApiOperation({ summary: 'Remove question from group (Admin/SuperAdmin only)' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Question removed from group successfully' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Question is not bound to this group' })
  @Roles('ADMIN', 'SUPERADMIN')
  @UseGuards(RolesGuard)
  removeQuestionFromGroup(
    @Param('id', ParseIntPipe) groupId: number,
    @Param('questionId', ParseIntPipe) questionId: number
  ) {
    return this.groupsService.removeQuestionFromGroup(groupId, questionId);
  }

  @Put(':id/questions/reorder')
  @ApiOperation({ summary: 'Reorder questions in group (Admin/SuperAdmin only)' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Questions reordered successfully' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Group not found or one or more group questions not found' })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Duplicate order numbers detected' })
  @Roles('ADMIN', 'SUPERADMIN')
  @UseGuards(RolesGuard)
  reorderQuestionsInGroup(
    @Param('id', ParseIntPipe) groupId: number,
    @Body() reorderDto: ReorderQuestionsDto
  ) {
    return this.groupsService.reorderQuestionsInGroup(groupId, reorderDto);
  }

  @Get(':id/questions')
  @ApiOperation({ summary: 'Get questions in group (Admin/SuperAdmin only)' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Questions in group retrieved successfully' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Group not found' })
  @Roles('ADMIN', 'SUPERADMIN')
  @UseGuards(RolesGuard)
  getQuestionsInGroup(@Param('id', ParseIntPipe) groupId: number) {
    return this.groupsService.getQuestionsInGroup(groupId);
  }

  // Soft Delete Management Endpoints
  @Get('deleted/list')
  @ApiOperation({ summary: 'Get all soft deleted groups (SuperAdmin only)' })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Soft deleted groups retrieved successfully',
    type: GroupsListResponseDto 
  })
  @Roles('SUPERADMIN')
  @UseGuards(RolesGuard)
  getSoftDeletedGroups() {
    return this.groupsService.getSoftDeletedGroups();
  }

  @Post(':id/restore')
  @ApiOperation({ summary: 'Restore soft deleted group (SuperAdmin only)' })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Group restored successfully',
    type: SingleGroupResponseDto 
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Soft deleted group not found' })
  @Roles('SUPERADMIN')
  @UseGuards(RolesGuard)
  restoreGroup(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    const restoredBy = req.user?.sub;
    return this.groupsService.restoreGroup(id, restoredBy);
  }

  @Delete(':id/permanent')
  @ApiOperation({ summary: 'Permanently delete group (SuperAdmin only)' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Group permanently deleted successfully' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Soft deleted group not found' })
  @Roles('SUPERADMIN')
  @UseGuards(RolesGuard)
  permanentlyDeleteGroup(@Param('id', ParseIntPipe) id: number) {
    return this.groupsService.permanentlyDeleteGroup(id);
  }

  // Tahap-based Grouping Endpoints
  @Post(':id/tahap-groups')
  @ApiOperation({ summary: 'Create tahap group for cross-subsection calculations (Admin/SuperAdmin only)' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Tahap group created successfully' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Group not found' })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'One or more questions not bound to group or tahap group already exists' })
  @Roles('ADMIN', 'SUPERADMIN')
  @UseGuards(RolesGuard)
  createTahapGroup(
    @Param('id', ParseIntPipe) groupId: number,
    @Body() createTahapGroupDto: CreateTahapGroupDto
  ) {
    return this.groupsService.createTahapGroup(groupId, createTahapGroupDto);
  }

  @Put(':id/tahap-groups/:groupIdentifier')
  @ApiOperation({ summary: 'Update tahap group (Admin/SuperAdmin only)' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Tahap group updated successfully' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Group or tahap group not found' })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Tahap group already exists or questions not bound to group' })
  @Roles('ADMIN', 'SUPERADMIN')
  @UseGuards(RolesGuard)
  updateTahapGroup(
    @Param('id', ParseIntPipe) groupId: number,
    @Param('groupIdentifier') groupIdentifier: string,
    @Body() updateTahapGroupDto: UpdateTahapGroupDto
  ) {
    return this.groupsService.updateTahapGroup(groupId, groupIdentifier, updateTahapGroupDto);
  }

  @Delete(':id/tahap-groups/:groupIdentifier')
  @ApiOperation({ summary: 'Delete tahap group (Admin/SuperAdmin only)' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Tahap group deleted successfully' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Group or tahap group not found' })
  @Roles('ADMIN', 'SUPERADMIN')
  @UseGuards(RolesGuard)
  deleteTahapGroup(
    @Param('id', ParseIntPipe) groupId: number,
    @Param('groupIdentifier') groupIdentifier: string
  ) {
    return this.groupsService.deleteTahapGroup(groupId, groupIdentifier);
  }

  @Get(':id/tahap-groups')
  @ApiOperation({ summary: 'Get all tahap groups in a group (Admin/SuperAdmin only)' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Tahap groups retrieved successfully' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Group not found' })
  @Roles('ADMIN', 'SUPERADMIN')
  @UseGuards(RolesGuard)
  getTahapGroups(
    @Param('id', ParseIntPipe) groupId: number,
    @Query() filters: GetTahapGroupsDto
  ) {
    return this.groupsService.getTahapGroups(groupId, filters);
  }

  @Get(':id/tahap-groups/:groupIdentifier')
  @ApiOperation({ summary: 'Get tahap group details (Admin/SuperAdmin only)' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Tahap group details retrieved successfully' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Group or tahap group not found' })
  @Roles('ADMIN', 'SUPERADMIN')
  @UseGuards(RolesGuard)
  getTahapGroupDetails(
    @Param('id', ParseIntPipe) groupId: number,
    @Param('groupIdentifier') groupIdentifier: string
  ) {
    return this.groupsService.getTahapGroupDetails(groupId, groupIdentifier);
  }

  @Get(':id/cross-subsection-groups')
  @ApiOperation({ summary: 'Get cross-subsection tahap groups (Admin/SuperAdmin only)' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Cross-subsection groups retrieved successfully' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Group not found' })
  @Roles('ADMIN', 'SUPERADMIN')
  @UseGuards(RolesGuard)
  getCrossSubsectionGroups(@Param('id', ParseIntPipe) groupId: number) {
    return this.groupsService.getCrossSubsectionGroups(groupId);
  }
}
