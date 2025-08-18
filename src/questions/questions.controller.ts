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
  Request,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { QuestionsService } from './questions.service';
import { CreateQuestionDto } from './dto/create-question.dto';
import { UpdateQuestionDto } from './dto/update-question.dto';
import {
  QuestionsListResponseDto,
  SingleQuestionResponseDto,
} from './dto/question-response.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import {
  CreateQuestionOptionDto,
  UpdateQuestionOptionDto,
  QuestionOptionResponseDto,
} from './dto/question-option.dto';
import {
  GroupQuestionDetailDto,
  QuestionResponseDto,
} from './dto/question-response.dto';

@ApiTags('Questions')
@Controller('questions')
@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth()
export class QuestionsController {
  constructor(private questionsService: QuestionsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all questions (Admin/SuperAdmin only)' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Questions retrieved successfully',
    type: QuestionsListResponseDto,
  })
  @Roles('ADMIN', 'SUPERADMIN')
  @UseGuards(RolesGuard)
  getAllQuestions() {
    return this.questionsService.getAllQuestions();
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get question statistics (Admin/SuperAdmin only)' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Question statistics retrieved',
  })
  @Roles('ADMIN', 'SUPERADMIN')
  @UseGuards(RolesGuard)
  getQuestionStats() {
    return this.questionsService.getQuestionStats();
  }

  @Get('search')
  @ApiOperation({ summary: 'Search questions (Admin/SuperAdmin only)' })
  @ApiQuery({ name: 'q', description: 'Search query' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Search results retrieved',
    type: QuestionsListResponseDto,
  })
  @Roles('ADMIN', 'SUPERADMIN')
  @UseGuards(RolesGuard)
  searchQuestions(@Query('q') query: string) {
    return this.questionsService.searchQuestions(query);
  }

  @Get('by-type/:inputType')
  @ApiOperation({
    summary: 'Get questions by input type (Admin/SuperAdmin only)',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Questions with specific input type retrieved',
    type: QuestionsListResponseDto,
  })
  @Roles('ADMIN', 'SUPERADMIN')
  @UseGuards(RolesGuard)
  getQuestionsByInputType(@Param('inputType') inputType: string) {
    return this.questionsService.getQuestionsByInputType(inputType);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get question by ID (Admin/SuperAdmin only)' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Question retrieved successfully',
    type: SingleQuestionResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Question not found',
  })
  @Roles('ADMIN', 'SUPERADMIN')
  @UseGuards(RolesGuard)
  getQuestionById(@Param('id', ParseIntPipe) id: number) {
    return this.questionsService.getQuestionById(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create new question (Admin/SuperAdmin only)' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Question created successfully',
    type: SingleQuestionResponseDto,
  })
  @Roles('ADMIN', 'SUPERADMIN')
  @UseGuards(RolesGuard)
  createQuestion(@Body() createQuestionDto: CreateQuestionDto) {
    return this.questionsService.createQuestion(createQuestionDto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update question (Admin/SuperAdmin only)' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Question updated successfully',
    type: SingleQuestionResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Question not found',
  })
  @Roles('ADMIN', 'SUPERADMIN')
  @UseGuards(RolesGuard)
  updateQuestion(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateQuestionDto: UpdateQuestionDto,
  ) {
    return this.questionsService.updateQuestion(id, updateQuestionDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete question (SuperAdmin only)' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Question deleted successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Question not found',
  })
  @Roles('SUPERADMIN')
  @UseGuards(RolesGuard)
  deleteQuestion(@Param('id', ParseIntPipe) id: number) {
    return this.questionsService.deleteQuestion(id);
  }

  @Post('options')
  @ApiOperation({ summary: 'Create a new question option' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Question option created successfully',
    type: QuestionOptionResponseDto,
  })
  @Roles('ADMIN', 'SUPERADMIN')
  @UseGuards(RolesGuard)
  createQuestionOption(
    @Body() createQuestionOptionDto: CreateQuestionOptionDto,
  ) {
    return this.questionsService.createQuestionOption(createQuestionOptionDto);
  }

  @Put('options/:id')
  @ApiOperation({ summary: 'Update a question option' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Question option updated successfully',
    type: QuestionOptionResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Question option not found',
  })
  @Roles('ADMIN', 'SUPERADMIN')
  @UseGuards(RolesGuard)
  updateQuestionOption(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateQuestionOptionDto: UpdateQuestionOptionDto,
  ) {
    return this.questionsService.updateQuestionOption(
      id,
      updateQuestionOptionDto,
    );
  }

  @Delete('options/:id')
  @ApiOperation({ summary: 'Delete a question option (SuperAdmin only)' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Question option deleted successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Question option not found',
  })
  @Roles('SUPERADMIN')
  @UseGuards(RolesGuard)
  deleteQuestionOption(@Param('id', ParseIntPipe) id: number) {
    return this.questionsService.deleteQuestionOption(id);
  }
}
