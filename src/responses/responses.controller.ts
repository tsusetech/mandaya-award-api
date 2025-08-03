import { Controller, Post, Get, Put, Patch, Body, Param, ParseIntPipe, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { ResponsesService } from './responses.service';
import { CreateSessionDto } from './dto/create-session.dto';
import { AutoSaveDto, BatchAutoSaveDto } from './dto/auto-save.dto';
import { UpdatePositionDto } from './dto/update-position.dto';
import { ResponseSessionDto } from './dto/response-session.dto';
import { AutoSaveResultDto, BatchAutoSaveResultDto, ProgressResultDto } from './dto/auto-save-result.dto';
import { ProgressSummaryDto } from './dto/progress-summary.dto';
import { ResponseService } from '../common/services/response.service';

@ApiTags('responses')
@Controller('responses')
@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth()
export class ResponsesController {
  constructor(
    private readonly responsesService: ResponsesService,
    private readonly responseService: ResponseService
  ) {}

  // Session Management Endpoints
  @Post('sessions')
  @ApiOperation({ summary: 'Create or resume a response session' })
  @ApiResponse({ status: 201, description: 'Session created or resumed successfully', type: ResponseSessionDto })
  async createOrResumeSession(
    @Request() req,
    @Body() createSessionDto: CreateSessionDto
  ) {
    const session = await this.responsesService.createOrResumeSession(req.user.userId, createSessionDto);
    return this.responseService.success({ session }, 'Session created or resumed successfully');
  }

  @Get('sessions/:sessionId')
  @ApiOperation({ summary: 'Get session details' })
  @ApiResponse({ status: 200, description: 'Session retrieved successfully', type: ResponseSessionDto })
  async getSession(@Param('sessionId', ParseIntPipe) sessionId: number) {
    const session = await this.responsesService.getSession(sessionId);
    return this.responseService.success({ session }, 'Session retrieved successfully');
  }

  @Patch('sessions/:sessionId/pause')
  @ApiOperation({ summary: 'Pause a session' })
  @ApiResponse({ status: 200, description: 'Session paused successfully' })
  async pauseSession(@Param('sessionId', ParseIntPipe) sessionId: number) {
    const result = await this.responsesService.pauseSession(sessionId);
    return this.responseService.success({ lastSaved: result.lastSaved }, result.message);
  }

  @Patch('sessions/:sessionId/resume')
  @ApiOperation({ summary: 'Resume a paused session' })
  @ApiResponse({ status: 200, description: 'Session resumed successfully' })
  async resumeSession(@Param('sessionId', ParseIntPipe) sessionId: number) {
    const result = await this.responsesService.resumeSession(sessionId);
    return this.responseService.success({ currentQuestion: result.currentQuestion }, result.message);
  }

  // Auto-Save Endpoints
  @Put('sessions/:sessionId/auto-save')
  @ApiOperation({ summary: 'Auto-save a single response' })
  @ApiResponse({ status: 200, description: 'Response auto-saved successfully', type: AutoSaveResultDto })
  async autoSaveResponse(
    @Param('sessionId', ParseIntPipe) sessionId: number,
    @Body() autoSaveDto: AutoSaveDto
  ) {
    const result = await this.responsesService.autoSaveResponse(sessionId, autoSaveDto);
    return this.responseService.success(result, 'Response auto-saved successfully');
  }

  @Put('sessions/:sessionId/auto-save/batch')
  @ApiOperation({ summary: 'Auto-save multiple responses in batch' })
  @ApiResponse({ status: 200, description: 'Responses auto-saved successfully', type: BatchAutoSaveResultDto })
  async batchAutoSave(
    @Param('sessionId', ParseIntPipe) sessionId: number,
    @Body() batchAutoSaveDto: BatchAutoSaveDto
  ) {
    const result = await this.responsesService.batchAutoSave(sessionId, batchAutoSaveDto);
    return this.responseService.success(result, 'Responses auto-saved successfully');
  }

  // Navigation & Progress Endpoints
  @Put('sessions/:sessionId/position')
  @ApiOperation({ summary: 'Update current question position' })
  @ApiResponse({ status: 200, description: 'Position updated successfully', type: ProgressResultDto })
  async updatePosition(
    @Param('sessionId', ParseIntPipe) sessionId: number,
    @Body() updatePositionDto: UpdatePositionDto
  ) {
    const result = await this.responsesService.updatePosition(sessionId, updatePositionDto);
    return this.responseService.success(result, 'Position updated successfully');
  }

  @Get('sessions/:sessionId/progress')
  @ApiOperation({ summary: 'Get session progress summary' })
  @ApiResponse({ status: 200, description: 'Progress retrieved successfully', type: ProgressSummaryDto })
  async getProgress(@Param('sessionId', ParseIntPipe) sessionId: number) {
    const progress = await this.responsesService.getProgress(sessionId);
    return this.responseService.success(progress, 'Progress retrieved successfully');
  }

  @Post('sessions/:sessionId/submit')
  @ApiOperation({ summary: 'Submit completed session' })
  @ApiResponse({ status: 200, description: 'Session submitted successfully' })
  async submitSession(@Param('sessionId', ParseIntPipe) sessionId: number) {
    const result = await this.responsesService.submitSession(sessionId);
    return this.responseService.success(result, 'Session submitted successfully');
  }
}
