import { 
  Controller, 
  Get, 
  Post,
  Body,
  Query,
  Param,
  UseGuards, 
  Request,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
  Patch,
  BadRequestException
} from '@nestjs/common';
import { 
  ApiTags, 
  ApiOperation, 
  ApiResponse, 
  ApiBearerAuth,
  ApiParam,
  ApiQuery
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { AssessmentsService } from './assessments.service';
import { AssessmentSessionDto } from './dto/assessment-session.dto';
import { AssessmentAnswerDto } from './dto/assessment-answer.dto';
import { BatchAnswerDto } from './dto/batch-answer.dto';
import { PaginationQueryDto } from './dto/pagination.dto';
import { UserAssessmentSessionsQueryDto, UserAssessmentSessionDto } from './dto/user-assessment-sessions.dto';
import { PaginatedResponseDto } from './dto/pagination.dto';
import { AssessmentSessionDetailDto } from './dto/assessment-session.dto';
import { CreateAssessmentReviewDto, AssessmentReviewResponseDto } from './dto/user-assessment-sessions.dto';
import { BatchAssessmentReviewDto, BatchAssessmentReviewResponseDto } from './dto/user-assessment-sessions.dto';
import { PrismaService } from '../prisma/prisma.service';
import { ResponseService } from '../common/services/response.service';

@ApiTags('Assessments API')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('assessments')
export class AssessmentsController {
  constructor(
    private readonly assessmentsService: AssessmentsService, 
    private readonly prisma: PrismaService,
    private readonly responseService: ResponseService
  ) {}

  @Get('user/:userId/sessions')
  @ApiOperation({ summary: 'Get all assessment sessions for a user' })
  @ApiResponse({ status: 200, description: 'Sessions retrieved successfully' })
  async getUserAssessmentSessions(
    @Param('userId', ParseIntPipe) userId: number,
    @Query() query: UserAssessmentSessionsQueryDto
  ) {
    const sessions = await this.assessmentsService.getUserAssessmentSessions(userId, query, query.finalStatus);
    return this.responseService.success(sessions, 'Sessions retrieved successfully');
  }

  @Get('user-sessions')
  @Roles('ADMIN', 'SUPERADMIN')
  @ApiOperation({ 
    summary: 'Get all assessment sessions (Admin only)',
    description: 'Retrieves all assessment sessions across all users. Admin and Superadmin access only.'
  })
  @ApiQuery({ 
    name: 'page', 
    required: false, 
    type: 'number', 
    description: 'Page number (starts from 1)',
    example: 1
  })
  @ApiQuery({ 
    name: 'limit', 
    required: false, 
    type: 'number', 
    description: 'Number of items per page',
    example: 10
  })
  @ApiQuery({ 
    name: 'finalStatus', 
    required: false, 
    type: 'string', 
    description: 'Filter by final status',
    example: 'submitted',
    enum: ['draft', 'in_progress', 'submitted', 'pending_review', 'under_review', 'needs_revision', 'resubmitted', 'approved', 'rejected', 'passed_to_jury', 'jury_scoring', 'jury_deliberation', 'final_decision', 'completed']
  })
  @ApiResponse({ status: 200, description: 'All sessions retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  async getAllAssessmentSessions(
    @Query() query: UserAssessmentSessionsQueryDto
  ) {
    const sessions = await this.assessmentsService.getAllAssessmentSessions(query, query.finalStatus);
    return this.responseService.success(sessions, 'All sessions retrieved successfully');
  }

  @Get('session/:groupId')
  @ApiOperation({ 
    summary: 'Get assessment questions for a group',
    description: 'Retrieves all assessment questions for a group with filtering support. Creates or resumes an assessment session, and returns questions with current responses and progress. Supports filtering by sectionTitle, subsection, and finalStatus.'
  })
  @ApiParam({ name: 'groupId', description: 'Group ID', type: 'number' })
  @ApiQuery({ 
    name: 'page', 
    required: false, 
    type: 'number', 
    description: 'Page number (starts from 1)',
    example: 1
  })
  @ApiQuery({ 
    name: 'limit', 
    required: false, 
    type: 'number', 
    description: 'Number of items per page',
    example: 10
  })
  @ApiQuery({ 
    name: 'sectionTitle', 
    required: false, 
    type: 'string', 
    description: 'Filter by section title (case-insensitive)',
    example: 'Personal Information'
  })
  @ApiQuery({ 
    name: 'subsection', 
    required: false, 
    type: 'string', 
    description: 'Filter by subsection (case-insensitive)',
    example: 'Basic Info'
  })
  @ApiQuery({ 
    name: 'finalStatus', 
    required: false, 
    type: 'string', 
    description: 'Filter by final status (combines session and review statuses)',
    example: 'submitted',
    enum: ['draft', 'in_progress', 'submitted', 'pending_review', 'under_review', 'needs_revision', 'resubmitted', 'approved', 'rejected', 'passed_to_jury', 'jury_scoring', 'jury_deliberation', 'final_decision', 'completed']
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Assessment session and questions retrieved successfully',
    type: AssessmentSessionDto 
  })
  @ApiResponse({ status: 400, description: 'User not assigned to group' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getAssessmentQuestions(
    @Request() req,
    @Param('groupId', ParseIntPipe) groupId: number,
    @Query() paginationQuery: PaginationQueryDto
  ): Promise<AssessmentSessionDto> {
    return this.assessmentsService.getAssessmentQuestions(req.user.userId, groupId, paginationQuery);
  }

  @Post('session/:sessionId/answer')
  @ApiOperation({ 
    summary: 'Submit a single assessment answer',
    description: 'Submits a single answer for a specific question in an assessment session. Updates progress percentage automatically.'
  })
  @ApiParam({ name: 'sessionId', description: 'Assessment session ID', example: 1 })
  @ApiResponse({ 
    status: 201, 
    description: 'Answer submitted successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'Answer saved successfully' }
      }
    }
  })
  @ApiResponse({ status: 400, description: 'Bad request - Invalid data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Session or question not found' })
  async submitAnswer(
    @Param('sessionId', ParseIntPipe) sessionId: number,
    @Body() answerDto: AssessmentAnswerDto
  ): Promise<{ success: boolean; message: string }> {
    return this.assessmentsService.submitAnswer(sessionId, answerDto);
  }

  @Post('session/:sessionId/batch-answer')
  @ApiOperation({ 
    summary: 'Submit multiple assessment answers',
    description: 'Submits multiple answers for different questions in an assessment session. Updates progress percentage automatically.'
  })
  @ApiParam({ name: 'sessionId', description: 'Assessment session ID', example: 1 })
  @ApiResponse({ 
    status: 201, 
    description: 'Answers submitted successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        savedCount: { type: 'number', example: 3 },
        message: { type: 'string', example: '3 answers saved successfully' }
      }
    }
  })
  @ApiResponse({ status: 400, description: 'Bad request - Invalid data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Session not found' })
  async submitBatchAnswers(
    @Param('sessionId', ParseIntPipe) sessionId: number,
    @Body() batchDto: BatchAnswerDto
  ): Promise<{ success: boolean; savedCount: number; message: string }> {
    return this.assessmentsService.submitBatchAnswers(sessionId, batchDto);
  }

  @Patch('session/:sessionId/progress')
  @ApiOperation({ 
    summary: 'Update session progress percentage',
    description: 'Updates the progress percentage for an assessment session. Useful for frontend-initiated progress updates.'
  })
  @ApiParam({ name: 'sessionId', description: 'Assessment session ID', example: 1 })
  @ApiResponse({ 
    status: 200, 
    description: 'Progress updated successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'Progress updated successfully' },
        progressPercentage: { type: 'number', example: 75 }
      }
    }
  })
  @ApiResponse({ status: 400, description: 'Bad request - Invalid progress percentage' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Session not found' })
  async updateSessionProgress(
    @Param('sessionId', ParseIntPipe) sessionId: number,
    @Body() body: { progressPercentage: number }
  ): Promise<{ success: boolean; message: string; progressPercentage: number }> {
    const { progressPercentage } = body;
    
    if (progressPercentage < 0 || progressPercentage > 100) {
      throw new BadRequestException('Progress percentage must be between 0 and 100');
    }

    await this.prisma.responseSession.update({
      where: { id: sessionId },
      data: { progressPercentage }
    });

    return {
      success: true,
      message: 'Progress updated successfully',
      progressPercentage
    };
  }

  @Post('session/:sessionId/submit')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'Submit assessment',
    description: 'Finalizes the assessment session'
  })
  @ApiParam({ name: 'sessionId', description: 'Assessment Session ID', type: 'number' })
  @ApiResponse({ status: 200, description: 'Assessment submitted successfully' })
  @ApiResponse({ status: 404, description: 'Assessment session not found' })
  async submitAssessment(
    @Param('sessionId', ParseIntPipe) sessionId: number
  ): Promise<{ success: boolean; message: string }> {
    return this.assessmentsService.submitAssessment(sessionId);
  }

  @Get('session/:groupId/sections')
  @ApiOperation({ 
    summary: 'Get assessment sections',
    description: 'Retrieves all available section titles and their subsections for an assessment group. Useful for building filter options in the frontend.'
  })
  @ApiParam({ name: 'groupId', description: 'Group ID', type: 'number' })
  @ApiResponse({ 
    status: 200, 
    description: 'Assessment sections retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        sections: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              sectionTitle: { type: 'string', example: 'Personal Information' },
              subsections: { 
                type: 'array', 
                items: { type: 'string' },
                example: ['Basic Info', 'Contact Details']
              }
            }
          }
        }
      }
    }
  })
  @ApiResponse({ status: 400, description: 'User not assigned to group' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getAssessmentSections(
    @Request() req,
    @Param('groupId', ParseIntPipe) groupId: number
  ): Promise<{ sections: Array<{ sectionTitle: string; subsections: string[] }> }> {
    return this.assessmentsService.getAssessmentSections(req.user.userId, groupId);
  }

  @Get('session/:sessionId/detail')
  @ApiOperation({ summary: 'Get detailed assessment session information' })
  @ApiResponse({ status: 200, description: 'Session detail retrieved successfully', type: AssessmentSessionDto })
  async getAssessmentSessionDetail(@Param('sessionId', ParseIntPipe) sessionId: number) {
    const session = await this.assessmentsService.getAssessmentSessionDetail(sessionId);
    return this.responseService.success(session, 'Session detail retrieved successfully');
  }

  @Post('session/:sessionId/review')
  @Roles('ADMIN', 'SUPERADMIN', 'JURI')
  @ApiOperation({ 
    summary: 'Create assessment review',
    description: 'Creates a new review for an assessment session. This endpoint consolidates review creation functionality within the assessment module for easier frontend integration.'
  })
  @ApiParam({ name: 'sessionId', description: 'Assessment Session ID', type: 'number' })
  @ApiResponse({ 
    status: 201, 
    description: 'Assessment review created successfully',
    type: AssessmentReviewResponseDto
  })
  @ApiResponse({ status: 400, description: 'Bad request - Session not submitted or review already exists' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Assessment session not found' })
  async createAssessmentReview(
    @Request() req,
    @Param('sessionId', ParseIntPipe) sessionId: number,
    @Body() createReviewDto: CreateAssessmentReviewDto
  ): Promise<AssessmentReviewResponseDto> {
    return this.assessmentsService.createAssessmentReview(req.user.userId, sessionId, createReviewDto);
  }

  @Post('session/:sessionId/review/batch')
  @Roles('ADMIN', 'SUPERADMIN', 'JURI')
  @ApiOperation({ 
    summary: 'Create or update assessment review (batch mode)',
    description: 'Creates a new review or updates existing review for an assessment session. Supports incremental review creation where multiple reviewers can add comments and scores without removing previous ones. Use updateExisting=true to modify the current review instead of creating a new one.'
  })
  @ApiParam({ name: 'sessionId', description: 'Assessment Session ID', type: 'number' })
  @ApiResponse({ 
    status: 201, 
    description: 'Assessment review created/updated successfully',
    type: BatchAssessmentReviewResponseDto
  })
  @ApiResponse({ status: 400, description: 'Bad request - Session not submitted' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Assessment session not found' })
  async createBatchAssessmentReview(
    @Request() req,
    @Param('sessionId', ParseIntPipe) sessionId: number,
    @Body() batchReviewDto: BatchAssessmentReviewDto
  ): Promise<BatchAssessmentReviewResponseDto> {
    return this.assessmentsService.createBatchAssessmentReview(req.user.userId, sessionId, batchReviewDto);
  }

  // Removed getAssessmentReviews endpoint - use reviews service instead
}
