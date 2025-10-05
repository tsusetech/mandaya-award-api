import { Module } from '@nestjs/common';
import { AwardRankingsService } from './award-rankings.service';
import { AwardRankingsController } from './award-rankings.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [AwardRankingsService],
  controllers: [AwardRankingsController],
  exports: [AwardRankingsService],
})
export class AwardRankingsModule {}
