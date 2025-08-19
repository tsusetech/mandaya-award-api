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
}
