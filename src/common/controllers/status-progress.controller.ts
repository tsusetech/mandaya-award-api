import { Controller, Get, Param, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { StatusProgressService } from '../services/status-progress.service';
import { StatusHistoryDto, EntityType } from '../dto/status-progress.dto';

@ApiTags('Status Progress')
@Controller('status-progress')
export class StatusProgressController {
  constructor(private statusProgressService: StatusProgressService) {}

  @Get(':entityType/:entityId/history')
  @ApiOperation({ summary: 'Get status history for an entity' })
  @ApiParam({ name: 'entityType', enum: EntityType, description: 'Type of entity' })
  @ApiParam({ name: 'entityId', description: 'ID of the entity' })
  @ApiResponse({ 
    status: 200, 
    description: 'Status history retrieved successfully',
    type: StatusHistoryDto 
  })
  async getStatusHistory(
    @Param('entityType') entityType: EntityType,
    @Param('entityId', ParseIntPipe) entityId: number
  ): Promise<StatusHistoryDto> {
    const history = await this.statusProgressService.getStatusHistory(entityType, entityId);
    
    return {
      entityType,
      entityId,
      history: history.map(item => ({
        id: item.id,
        entityType: item.entityType as EntityType,
        entityId: item.entityId,
        status: item.status,
        version: item.version,
        previousStatus: item.previousStatus,
        changedBy: item.changedBy,
        changedByName: item.changedByUser?.name || null,
        changedAt: item.changedAt.toISOString(),
        metadata: item.metadata
      }))
    };
  }

  @Get(':entityType/:entityId/current')
  @ApiOperation({ summary: 'Get current status for an entity' })
  @ApiParam({ name: 'entityType', enum: EntityType, description: 'Type of entity' })
  @ApiParam({ name: 'entityId', description: 'ID of the entity' })
  @ApiResponse({ 
    status: 200, 
    description: 'Current status retrieved successfully' 
  })
  async getCurrentStatus(
    @Param('entityType') entityType: EntityType,
    @Param('entityId', ParseIntPipe) entityId: number
  ) {
    const currentStatus = await this.statusProgressService.getCurrentStatus(entityType, entityId);
    
    if (!currentStatus) {
      return { status: null, version: 0, changedAt: null };
    }

    return {
      status: currentStatus.status,
      version: currentStatus.version,
      changedAt: currentStatus.changedAt.toISOString()
    };
  }
}
