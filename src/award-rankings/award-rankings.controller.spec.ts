import { Test, TestingModule } from '@nestjs/testing';
import { AwardRankingsController } from './award-rankings.controller';

describe('AwardRankingsController', () => {
  let controller: AwardRankingsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AwardRankingsController],
    }).compile();

    controller = module.get<AwardRankingsController>(AwardRankingsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
