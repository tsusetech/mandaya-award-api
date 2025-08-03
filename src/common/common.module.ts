import { Module } from '@nestjs/common';
import { ResponseService } from './services/response.service';
import { SoftDeleteService } from './services/soft-delete.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [ResponseService, SoftDeleteService],
  exports: [ResponseService, SoftDeleteService],
})
export class CommonModule {} 