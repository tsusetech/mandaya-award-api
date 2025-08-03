import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsOptional } from 'class-validator';

export class FinalizeResponseDto {
  @ApiProperty({ 
    example: 'Final answer', 
    description: 'Final response value' 
  })
  value: any;

  @ApiProperty({ example: 120, description: 'Total time spent on question in seconds' })
  @IsNumber()
  timeSpent: number;
}