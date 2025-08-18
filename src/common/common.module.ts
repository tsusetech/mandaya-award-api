import { Module } from '@nestjs/common';
import { ResponseService } from './services/response.service';
import { SoftDeleteService } from './services/soft-delete.service';
import { StatusProgressService } from './services/status-progress.service';
import { StatusProgressController } from './controllers/status-progress.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [StatusProgressController],
  providers: [ResponseService, SoftDeleteService, StatusProgressService],
  exports: [ResponseService, SoftDeleteService, StatusProgressService],
})
export class CommonModule {}
