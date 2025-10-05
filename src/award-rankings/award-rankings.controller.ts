import { Controller, Get, Post, Param, Patch, Body, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { AwardRankingsService } from './award-rankings.service';
import { CreateAwardRankingDto } from './dto/create-award-ranking.dto';
import { CreateBatchAwardRankingsDto } from './dto/create-batch-award-rankings.dto';
import { CreateAwardRankingScoringDto } from './dto/create-award-ranking-scoring.dto';
import { UpdateAwardRankingScoringDto } from './dto/update-award-ranking-scoring.dto';
import { AwardRankingResponseDto } from './dto/award-ranking-response.dto';
import { AwardRankingScoringResponseDto } from './dto/award-ranking-scoring-response.dto';
import { AwardRankingSummaryDto } from './dto/award-ranking-summary.dto';
import { BatchAwardRankingsResponseDto } from './dto/batch-award-rankings-response.dto';

@ApiTags('Award Rankings')
@Controller('award-rankings')
export class AwardRankingsController {
  constructor(private readonly awardRankingsService: AwardRankingsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all award rankings' })
  @ApiResponse({ 
    status: 200, 
    description: 'List of all award rankings with jury scores',
    type: [AwardRankingResponseDto]
  })
  async findAll(): Promise<{ data: AwardRankingResponseDto[] }> {
    const data = await this.awardRankingsService.findAll();
    return { data };
  }

  @Get('session/:sessionId')
  @ApiOperation({ summary: 'Get award ranking by session ID' })
  @ApiParam({ name: 'sessionId', description: 'Session ID', example: 155 })
  @ApiResponse({ 
    status: 200, 
    description: 'Award ranking for the specified session',
    type: AwardRankingSummaryDto
  })
  @ApiResponse({ status: 404, description: 'Award ranking not found for this session' })
  async findBySession(@Param('sessionId', ParseIntPipe) sessionId: number): Promise<{ data: AwardRankingSummaryDto }> {
    const data = await this.awardRankingsService.findBySession(sessionId);
    return { data };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get award ranking by ID' })
  @ApiParam({ name: 'id', description: 'Award ranking ID', example: 1 })
  @ApiResponse({ 
    status: 200, 
    description: 'Award ranking details with jury scores',
    type: AwardRankingResponseDto
  })
  @ApiResponse({ status: 404, description: 'Award ranking not found' })
  async findOne(@Param('id', ParseIntPipe) id: number): Promise<{ data: AwardRankingResponseDto }> {
    const data = await this.awardRankingsService.findOne(id);
    return { data };
  }

  @Post()
  @ApiOperation({ summary: 'Create a new award ranking' })
  @ApiResponse({ 
    status: 201, 
    description: 'Award ranking created successfully',
    type: AwardRankingResponseDto
  })
  @ApiResponse({ status: 409, description: 'Award ranking already exists for this session' })
  async create(@Body() createAwardRankingDto: CreateAwardRankingDto): Promise<{ data: AwardRankingResponseDto }> {
    const data = await this.awardRankingsService.create(createAwardRankingDto);
    return { data };
  }

  @Post('batch')
  @ApiOperation({ summary: 'Create multiple award rankings in batch' })
  @ApiResponse({ 
    status: 201, 
    description: 'Batch creation completed',
    type: BatchAwardRankingsResponseDto
  })
  async createBatch(@Body() createBatchDto: CreateBatchAwardRankingsDto): Promise<{ data: BatchAwardRankingsResponseDto }> {
    const data = await this.awardRankingsService.createBatch(createBatchDto);
    return { data };
  }

  @Post('scoring')
  @ApiOperation({ summary: 'Add jury scoring to an award ranking' })
  @ApiResponse({ 
    status: 201, 
    description: 'Jury scoring added successfully',
    type: AwardRankingScoringResponseDto
  })
  @ApiResponse({ status: 409, description: 'This jury has already scored this ranking' })
  @ApiResponse({ status: 404, description: 'Award ranking not found' })
  async addJuryScoring(@Body() createScoringDto: CreateAwardRankingScoringDto): Promise<{ data: AwardRankingScoringResponseDto }> {
    const data = await this.awardRankingsService.addJuryScoring(createScoringDto);
    return { data };
  }

  @Patch('scoring/:id')
  @ApiOperation({ summary: 'Update jury scoring' })
  @ApiParam({ name: 'id', description: 'Scoring ID', example: 1 })
  @ApiResponse({ 
    status: 200, 
    description: 'Jury scoring updated successfully',
    type: AwardRankingScoringResponseDto
  })
  @ApiResponse({ status: 404, description: 'Scoring not found' })
  async updateJuryScoring(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateScoringDto: UpdateAwardRankingScoringDto,
  ): Promise<{ data: AwardRankingScoringResponseDto }> {
    const data = await this.awardRankingsService.updateJuryScoring(id, updateScoringDto);
    return { data };
  }
}