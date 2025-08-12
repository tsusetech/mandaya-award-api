import { Controller, Get, Param, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { StatusProgressService } from '../services/status-progress.service';
import { ResponseService } from '../services/response.service';
import { StatusHistoryDto, EntityType } from '../dto/status-progress.dto';

@ApiTags('Status Progress')
@Controller('status-progress')
export class StatusProgressController {
  constructor(
    private readonly statusProgressService: StatusProgressService,
    private readonly responseService: ResponseService
  ) {}

  @Get('history/:sessionId')
  @ApiOperation({ summary: 'Get status history for a session' })
  @ApiResponse({ status: 200, description: 'Status history retrieved successfully' })
  async getStatusHistory(@Param('sessionId', ParseIntPipe) sessionId: number) {
    const history = await this.statusProgressService.getStatusHistory(sessionId);
    
    return this.responseService.success(
      history.map(item => ({
        id: item.id,
        sessionId: item.sessionId,
        status: item.status,
        previousStatus: item.previousStatus,
        changedBy: item.changedBy,
        changedAt: item.changedAt,
        changedByUser: item.changedByUser
      })),
      'Status history retrieved successfully'
    );
  }

  @Get('current/:sessionId')
  @ApiOperation({ summary: 'Get current status for a session' })
  @ApiResponse({ status: 200, description: 'Current status retrieved successfully' })
  async getCurrentStatus(@Param('sessionId', ParseIntPipe) sessionId: number) {
    const currentStatus = await this.statusProgressService.getCurrentStatus(sessionId);
    
    if (!currentStatus) {
      return this.responseService.success(null, 'No status found');
    }

    return this.responseService.success({
      status: currentStatus.status,
      changedAt: currentStatus.changedAt
    }, 'Current status retrieved successfully');
  }
}
