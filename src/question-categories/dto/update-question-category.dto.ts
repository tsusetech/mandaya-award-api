import { PartialType } from '@nestjs/swagger';
import { CreateQuestionCategoryDto } from './create-question-category.dto';

export class UpdateQuestionCategoryDto extends PartialType(CreateQuestionCategoryDto) {}
