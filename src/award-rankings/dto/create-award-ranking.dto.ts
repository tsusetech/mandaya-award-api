import { IsInt } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateAwardRankingDto {
  @ApiProperty({
    description: 'Session ID to create award ranking for',
    example: 155,
    type: 'integer'
  })
  @IsInt()
  sessionId: number;
}
