import { IsArray, IsInt, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { CreateAwardRankingDto } from './create-award-ranking.dto';

export class CreateBatchAwardRankingsDto {
  @ApiProperty({
    description: 'Array of award rankings to create',
    type: [CreateAwardRankingDto],
    example: [
      { sessionId: 155 },
      { sessionId: 160 },
      { sessionId: 173 },
      { sessionId: 179 },
      { sessionId: 181 }
    ]
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateAwardRankingDto)
  rankings: CreateAwardRankingDto[];
}
