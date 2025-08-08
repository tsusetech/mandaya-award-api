import { IsInt } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AssignGroupToCategoryDto {
  @ApiProperty({ 
    example: 1, 
    description: 'Category ID to assign the group to' 
  })
  @IsInt()
  categoryId: number;

  @ApiProperty({ 
    example: 1, 
    description: 'Group ID to assign to the category' 
  })
  @IsInt()
  groupId: number;
}
