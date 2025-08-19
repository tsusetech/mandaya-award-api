import { Module } from '@nestjs/common';
import { QuestionCategoriesService } from './question-categories.service';
import { QuestionCategoriesController } from './question-categories.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [QuestionCategoriesController],
  providers: [QuestionCategoriesService],
  exports: [QuestionCategoriesService],
})
export class QuestionCategoriesModule {}
