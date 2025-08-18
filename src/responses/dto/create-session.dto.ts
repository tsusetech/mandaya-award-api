import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsPositive } from 'class-validator';

export class CreateSessionDto {
  @ApiProperty({ example: 1, description: 'Group ID to start session for' })
  @IsNumber()
  @IsPositive()
  groupId: number;
}
