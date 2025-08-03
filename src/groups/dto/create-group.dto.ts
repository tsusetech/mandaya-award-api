import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsNotEmpty } from 'class-validator';

export class CreateGroupDto {
  @ApiProperty({ example: 'Quiz Indonesia', description: 'Group name' })
  @IsString()
  @IsNotEmpty()
  groupName: string;

  @ApiProperty({ example: 'Quiz tentang pengetahuan umum Indonesia', description: 'Group description', required: false })
  @IsString()
  @IsOptional()
  description?: string;
}