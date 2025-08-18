import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional } from 'class-validator';

export class UpdateGroupDto {
  @ApiProperty({
    example: 'Quiz Indonesia Updated',
    description: 'Group name',
    required: false,
  })
  @IsString()
  @IsOptional()
  groupName?: string;

  @ApiProperty({
    example: 'Updated description',
    description: 'Group description',
    required: false,
  })
  @IsString()
  @IsOptional()
  description?: string;
}
