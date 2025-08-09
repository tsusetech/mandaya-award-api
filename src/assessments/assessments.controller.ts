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
  HttpStatus
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

@ApiTags('Assessments API')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('assessments')
export class AssessmentsController {
  constructor(private readonly assessmentsService: AssessmentsService) {}

  @Get('user-sessions')
  @Roles('ADMIN', 'SUPERADMIN', 'JURI')
  @ApiOperation({ 
    summary: 'Get all user assessment sessions',
    description: 'Retrieves all assessment sessions from users with pagination and filtering. Only accessible by admin, superadmin, and juri roles.'
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
    name: 'status', 
    required: false, 
    type: 'string', 
    description: 'Filter by assessment status',
    example: 'submitted'
  })
  @ApiQuery({ 
    name: 'reviewStatus', 
    required: false, 
    type: 'string', 
    description: 'Filter by review status',
    example: 'pending'
  })
  @ApiQuery({ 
    name: 'reviewStage', 
    required: false, 
    type: 'string', 
    description: 'Filter by review stage (admin_validation, jury_scoring, jury_deliberation, final_decision)',
    example: 'admin_validation'
  })
  @ApiQuery({ 
    name: 'groupId', 
    required: false, 
    type: 'number', 
    description: 'Filter by group ID',
    example: 1
  })
  @ApiResponse({ 
    status: 200, 
    description: 'User assessment sessions retrieved successfully',
    type: PaginatedResponseDto<UserAssessmentSessionDto>
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  async getUserAssessmentSessions(
    @Query() query: UserAssessmentSessionsQueryDto
  ): Promise<PaginatedResponseDto<UserAssessmentSessionDto>> {
    return this.assessmentsService.getUserAssessmentSessions(query);
  }

  @Get('session/:groupId')
  @ApiOperation({ 
    summary: 'Get assessment questions for a group',
    description: 'Retrieves all assessment questions for a group with filtering support. Creates or resumes an assessment session, and returns questions with current responses and progress. Supports filtering by sectionTitle and subsection.'
  })
  @ApiParam({ name: 'groupId', description: 'Group ID', type: 'number' })
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
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'Submit assessment answer',
    description: 'Saves an answer for a specific assessment question with auto-save functionality'
  })
  @ApiParam({ name: 'sessionId', description: 'Assessment Session ID', type: 'number' })
  @ApiResponse({ status: 200, description: 'Answer saved successfully' })
  @ApiResponse({ status: 404, description: 'Assessment session not found' })
  async submitAnswer(
    @Param('sessionId', ParseIntPipe) sessionId: number,
    @Body() answerDto: AssessmentAnswerDto
  ): Promise<{ success: boolean; message: string }> {
    return this.assessmentsService.submitAnswer(sessionId, answerDto);
  }

  @Post('session/:sessionId/batch-answer')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'Submit multiple assessment answers',
    description: 'Saves multiple assessment answers at once for efficiency'
  })
  @ApiParam({ name: 'sessionId', description: 'Assessment Session ID', type: 'number' })
  @ApiResponse({ status: 200, description: 'Answers saved successfully' })
  @ApiResponse({ status: 404, description: 'Assessment session not found' })
  async submitBatchAnswers(
    @Param('sessionId', ParseIntPipe) sessionId: number,
    @Body() batchDto: BatchAnswerDto
  ): Promise<{ success: boolean; savedCount: number; message: string }> {
    return this.assessmentsService.submitBatchAnswers(sessionId, batchDto);
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
  @Roles('ADMIN', 'SUPERADMIN', 'JURI')
  @ApiOperation({ 
    summary: 'Get assessment session details',
    description: 'Retrieves detailed information about a specific assessment session including all questions, responses, and review information. Only accessible by admin, superadmin, and juri roles.'
  })
  @ApiParam({ name: 'sessionId', description: 'Assessment Session ID', type: 'number' })
  @ApiResponse({ 
    status: 200, 
    description: 'Assessment session details retrieved successfully',
    type: AssessmentSessionDetailDto
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Assessment session not found' })
  async getAssessmentSessionDetail(
    @Param('sessionId', ParseIntPipe) sessionId: number
  ): Promise<AssessmentSessionDetailDto> {
    return this.assessmentsService.getAssessmentSessionDetail(sessionId);
  }
}
