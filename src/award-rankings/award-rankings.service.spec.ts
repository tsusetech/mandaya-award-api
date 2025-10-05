import { Test, TestingModule } from '@nestjs/testing';
import { AwardRankingsService } from './award-rankings.service';

describe('AwardRankingsService', () => {
  let service: AwardRankingsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AwardRankingsService],
    }).compile();

    service = module.get<AwardRankingsService>(AwardRankingsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
