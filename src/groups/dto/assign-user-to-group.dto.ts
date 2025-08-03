import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsArray, ArrayMinSize } from 'class-validator';

export class AssignUserToGroupDto {
  @ApiProperty({ example: 1, description: 'User ID to assign to group' })
  @IsInt()
  userId: number;
}

export class AssignUsersToGroupDto {
  @ApiProperty({ example: [1, 2, 3], description: 'Array of user IDs to assign to group' })
  @IsArray()
  @ArrayMinSize(1)
  @IsInt({ each: true })
  userIds: number[];
}

export class RemoveUserFromGroupDto {
  @ApiProperty({ example: 1, description: 'User ID to remove from group' })
  @IsInt()
  userId: number;
}