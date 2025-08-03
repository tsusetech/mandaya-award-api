import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsPositive, IsOptional } from 'class-validator';

export class UpdatePositionDto {
  @ApiProperty({ example: 2, description: 'Current question ID' })
  @IsNumber()
  @IsPositive()
  currentQuestionId: number;

  @ApiProperty({ example: 1, description: 'Previous question ID', required: false })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  previousQuestionId?: number;
}