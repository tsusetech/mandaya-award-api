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
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { AssignCategoryToGroupDto } from './dto/assign-category-to-group.dto';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('categories')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Post()
  @Roles('admin')
  create(@Body() createCategoryDto: CreateCategoryDto) {
    return this.categoriesService.create(createCategoryDto);
  }

  @Get()
  findAll() {
    return this.categoriesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.categoriesService.findOne(+id);
  }

  @Patch(':id')
  @Roles('admin')
  update(@Param('id') id: string, @Body() updateCategoryDto: UpdateCategoryDto) {
    return this.categoriesService.update(+id, updateCategoryDto);
  }

  @Delete(':id')
  @Roles('admin')
  remove(@Param('id') id: string) {
    return this.categoriesService.remove(+id);
  }

  @Post('assign')
  @Roles('admin')
  assignCategoryToGroup(@Body() assignDto: AssignCategoryToGroupDto) {
    return this.categoriesService.assignCategoryToGroup(assignDto);
  }

  @Get('group/:groupId')
  getGroupCategories(@Param('groupId') groupId: string) {
    return this.categoriesService.getGroupCategories(+groupId);
  }

  @Get(':categoryId/groups')
  getCategoryGroups(@Param('categoryId') categoryId: string) {
    return this.categoriesService.getCategoryGroups(+categoryId);
  }

  @Delete('group/:groupId/category/:categoryId')
  @Roles('admin')
  removeCategoryFromGroup(
    @Param('groupId') groupId: string,
    @Param('categoryId') categoryId: string,
  ) {
    return this.categoriesService.removeCategoryFromGroup(+groupId, +categoryId);
  }
}
