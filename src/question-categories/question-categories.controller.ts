import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { QuestionCategoriesService } from './question-categories.service';
import { CreateQuestionCategoryDto } from './dto/create-question-category.dto';
import { UpdateQuestionCategoryDto } from './dto/update-question-category.dto';
import { QuestionCategoryResponseDto } from './dto/question-category-response.dto';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { ScoreType } from './dto/create-question-category.dto';
import {
  AssignQuestionsToCategory,
  AssignSingleQuestionToCategory,
  BulkAssignQuestionsDto,
  QuestionCategoryAssignmentResponseDto,
} from './dto/assign-questions.dto';

@ApiTags('Question Categories')
@Controller('question-categories')
@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth()
export class QuestionCategoriesController {
  constructor(
    private readonly questionCategoriesService: QuestionCategoriesService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a new question category' })
  @ApiResponse({
    status: 201,
    description: 'Question category created successfully',
    type: QuestionCategoryResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 409, description: 'Question category name already exists' })
  @Roles('ADMIN', 'SUPERADMIN')
  @UseGuards(RolesGuard)
  create(@Body() createQuestionCategoryDto: CreateQuestionCategoryDto) {
    return this.questionCategoriesService.create(createQuestionCategoryDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all question categories' })
  @ApiResponse({
    status: 200,
    description: 'Question categories retrieved successfully',
    type: [QuestionCategoryResponseDto],
  })
  @ApiQuery({
    name: 'scoreType',
    required: false,
    enum: ScoreType,
    description: 'Filter by score type',
  })
  findAll(@Query('scoreType') scoreType?: string) {
    if (scoreType) {
      return this.questionCategoriesService.findByScoreType(scoreType);
    }
    return this.questionCategoriesService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get question category by ID' })
  @ApiParam({ name: 'id', description: 'Question category ID' })
  @ApiResponse({
    status: 200,
    description: 'Question category retrieved successfully',
    type: QuestionCategoryResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Question category not found' })
  findOne(@Param('id') id: string) {
    return this.questionCategoriesService.findOne(+id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a question category' })
  @ApiParam({ name: 'id', description: 'Question category ID' })
  @ApiResponse({
    status: 200,
    description: 'Question category updated successfully',
    type: QuestionCategoryResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Question category not found' })
  @ApiResponse({ status: 409, description: 'Question category name already exists' })
  @Roles('ADMIN', 'SUPERADMIN')
  @UseGuards(RolesGuard)
  update(
    @Param('id') id: string,
    @Body() updateQuestionCategoryDto: UpdateQuestionCategoryDto,
  ) {
    return this.questionCategoriesService.update(+id, updateQuestionCategoryDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a question category' })
  @ApiParam({ name: 'id', description: 'Question category ID' })
  @ApiResponse({ status: 200, description: 'Question category deleted successfully' })
  @ApiResponse({ status: 404, description: 'Question category not found' })
  @ApiResponse({
    status: 409,
    description: 'Cannot delete question category as it is being used in group questions',
  })
  @Roles('ADMIN', 'SUPERADMIN')
  @UseGuards(RolesGuard)
  remove(@Param('id') id: string) {
    return this.questionCategoriesService.remove(+id);
  }

  // Assignment endpoints
  @Post(':id/assign-questions')
  @ApiOperation({ summary: 'Assign multiple questions to a category' })
  @ApiParam({ name: 'id', description: 'Question category ID' })
  @ApiResponse({
    status: 201,
    description: 'Questions assigned to category successfully',
    type: [QuestionCategoryAssignmentResponseDto],
  })
  @ApiResponse({ status: 404, description: 'Question category or questions not found' })
  @Roles('ADMIN', 'SUPERADMIN')
  @UseGuards(RolesGuard)
  assignQuestions(
    @Param('id') id: string,
    @Body() assignDto: AssignQuestionsToCategory,
  ) {
    return this.questionCategoriesService.assignQuestionsToCategory(+id, assignDto);
  }

  @Post(':id/assign-question')
  @ApiOperation({ summary: 'Assign a single question to a category' })
  @ApiParam({ name: 'id', description: 'Question category ID' })
  @ApiResponse({
    status: 201,
    description: 'Question assigned to category successfully',
    type: QuestionCategoryAssignmentResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Question category or question not found' })
  @Roles('ADMIN', 'SUPERADMIN')
  @UseGuards(RolesGuard)
  assignSingleQuestion(
    @Param('id') id: string,
    @Body() assignDto: AssignSingleQuestionToCategory,
  ) {
    return this.questionCategoriesService.assignSingleQuestionToCategory(+id, assignDto);
  }

  @Delete(':categoryId/questions/:groupQuestionId')
  @ApiOperation({ summary: 'Remove a question from a category' })
  @ApiParam({ name: 'categoryId', description: 'Question category ID' })
  @ApiParam({ name: 'groupQuestionId', description: 'Group question ID' })
  @ApiResponse({ status: 200, description: 'Question removed from category successfully' })
  @ApiResponse({ status: 404, description: 'Assignment not found' })
  @Roles('ADMIN', 'SUPERADMIN')
  @UseGuards(RolesGuard)
  removeQuestionFromCategory(
    @Param('categoryId') categoryId: string,
    @Param('groupQuestionId') groupQuestionId: string,
  ) {
    return this.questionCategoriesService.removeQuestionFromCategory(
      +categoryId,
      +groupQuestionId,
    );
  }

  @Get(':id/questions')
  @ApiOperation({ summary: 'Get all questions assigned to a category' })
  @ApiParam({ name: 'id', description: 'Question category ID' })
  @ApiResponse({
    status: 200,
    description: 'Questions retrieved successfully',
    type: [QuestionCategoryAssignmentResponseDto],
  })
  @ApiResponse({ status: 404, description: 'Question category not found' })
  getQuestionsByCategory(@Param('id') id: string) {
    return this.questionCategoriesService.getQuestionsByCategory(+id);
  }

  @Post('bulk-assign')
  @ApiOperation({ summary: 'Bulk assign/remove questions to/from categories' })
  @ApiResponse({
    status: 201,
    description: 'Bulk assignment completed',
  })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @Roles('ADMIN', 'SUPERADMIN')
  @UseGuards(RolesGuard)
  bulkAssignQuestions(@Body() bulkDto: BulkAssignQuestionsDto) {
    return this.questionCategoriesService.bulkAssignQuestions(bulkDto);
  }
}
