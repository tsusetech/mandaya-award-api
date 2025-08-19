import { Test, TestingModule } from '@nestjs/testing';
import { QuestionCategoriesService } from './question-categories.service';
import { PrismaService } from '../prisma/prisma.service';

describe('QuestionCategoriesService', () => {
  let service: QuestionCategoriesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QuestionCategoriesService,
        {
          provide: PrismaService,
          useValue: {
            questionCategory: {
              create: jest.fn(),
              findMany: jest.fn(),
              findFirst: jest.fn(),
              update: jest.fn(),
            },
            groupQuestion: {
              findMany: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<QuestionCategoriesService>(QuestionCategoriesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
