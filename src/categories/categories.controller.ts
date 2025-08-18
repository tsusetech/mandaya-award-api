import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { AssignCategoryToGroupDto } from './dto/assign-category-to-group.dto';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { AssignGroupToCategoryDto } from './dto/assign-group-to-category.dto';
import { CategoryGroupResponseDto } from './dto/category-group-response.dto';

@ApiTags('Categories')
@Controller('categories')
@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth()
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new category' })
  @ApiResponse({ status: 201, description: 'Category created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 409, description: 'Category name already exists' })
  @Roles('ADMIN', 'SUPERADMIN')
  @UseGuards(RolesGuard)
  create(@Body() createCategoryDto: CreateCategoryDto) {
    return this.categoriesService.create(createCategoryDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all categories' })
  @ApiResponse({
    status: 200,
    description: 'Categories retrieved successfully',
  })
  findAll() {
    return this.categoriesService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get category by ID' })
  @ApiResponse({ status: 200, description: 'Category retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Category not found' })
  findOne(@Param('id') id: string) {
    return this.categoriesService.findOne(+id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a category' })
  @ApiResponse({ status: 200, description: 'Category updated successfully' })
  @ApiResponse({ status: 404, description: 'Category not found' })
  @ApiResponse({ status: 409, description: 'Category name already exists' })
  @Roles('ADMIN', 'SUPERADMIN')
  @UseGuards(RolesGuard)
  update(
    @Param('id') id: string,
    @Body() updateCategoryDto: UpdateCategoryDto,
  ) {
    return this.categoriesService.update(+id, updateCategoryDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a category' })
  @ApiResponse({ status: 200, description: 'Category deleted successfully' })
  @ApiResponse({ status: 404, description: 'Category not found' })
  @Roles('ADMIN', 'SUPERADMIN')
  @UseGuards(RolesGuard)
  remove(@Param('id') id: string) {
    return this.categoriesService.remove(+id);
  }

  @Post('assign')
  @ApiOperation({ summary: 'Assign group to category' })
  @ApiResponse({
    status: 201,
    description: 'Group assigned to category successfully',
  })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 404, description: 'Category or group not found' })
  @ApiResponse({
    status: 409,
    description: 'Group is already assigned to this category',
  })
  @Roles('ADMIN', 'SUPERADMIN')
  @UseGuards(RolesGuard)
  assignGroupToCategory(@Body() assignDto: AssignGroupToCategoryDto) {
    return this.categoriesService.assignGroupToCategory(assignDto);
  }

  @Get('category/:categoryId/groups')
  @ApiOperation({ summary: 'Get groups for a specific category' })
  @ApiResponse({
    status: 200,
    description: 'Category groups retrieved successfully',
  })
  getCategoryGroups(@Param('categoryId') categoryId: string) {
    return this.categoriesService.getCategoryGroups(+categoryId);
  }

  @Get('group/:groupId/categories')
  @ApiOperation({ summary: 'Get categories for a specific group' })
  @ApiResponse({
    status: 200,
    description: 'Group categories retrieved successfully',
  })
  getGroupCategories(@Param('groupId') groupId: string) {
    return this.categoriesService.getGroupCategories(+groupId);
  }

  @Delete('category/:categoryId/group/:groupId')
  @ApiOperation({ summary: 'Remove group from category' })
  @ApiResponse({
    status: 200,
    description: 'Group removed from category successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Category-Group assignment not found',
  })
  @Roles('ADMIN', 'SUPERADMIN')
  @UseGuards(RolesGuard)
  removeGroupFromCategory(
    @Param('categoryId') categoryId: string,
    @Param('groupId') groupId: string,
  ) {
    return this.categoriesService.removeGroupFromCategory(
      +categoryId,
      +groupId,
    );
  }
}
