import { Controller, Get, Param, Patch, Body, ParseIntPipe } from '@nestjs/common';
import { AwardRankingsService } from './award-rankings.service';
import { UpdateAwardRankingDto } from './dto/update-award-ranking.dto';
import { AwardRankingResponseDto } from './dto/award-ranking-response.dto';

@Controller('award-rankings')
export class AwardRankingsController {
  constructor(private readonly awardRankingsService: AwardRankingsService) {}

  @Get()
  async findAll(): Promise<{ data: AwardRankingResponseDto[] }> {
    const data = await this.awardRankingsService.findAll();
    return { data };
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number): Promise<{ data: AwardRankingResponseDto }> {
    const data = await this.awardRankingsService.findOne(id);
    return { data };
  }

  @Patch(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateAwardRankingDto: UpdateAwardRankingDto,
  ): Promise<{ data: AwardRankingResponseDto }> {
    const data = await this.awardRankingsService.update(id, updateAwardRankingDto);
    return { data };
  }
}
