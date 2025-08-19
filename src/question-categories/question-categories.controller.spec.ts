import { Test, TestingModule } from '@nestjs/testing';
import { QuestionCategoriesController } from './question-categories.controller';
import { QuestionCategoriesService } from './question-categories.service';

describe('QuestionCategoriesController', () => {
  let controller: QuestionCategoriesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [QuestionCategoriesController],
      providers: [
        {
          provide: QuestionCategoriesService,
          useValue: {
            create: jest.fn(),
            findAll: jest.fn(),
            findOne: jest.fn(),
            update: jest.fn(),
            remove: jest.fn(),
            findByScoreType: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<QuestionCategoriesController>(QuestionCategoriesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
