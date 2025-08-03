import { ApiProperty } from '@nestjs/swagger';

export class AssignRoleByIdDto {
  @ApiProperty({ example: 1, description: 'User ID to assign role to' })
  userId: number;

  @ApiProperty({ example: 2, description: 'Role ID to assign' })
  roleId: number;
}