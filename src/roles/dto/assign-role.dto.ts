import { ApiProperty } from '@nestjs/swagger';

export class AssignRoleDto {
  @ApiProperty({ example: 1, description: 'User ID to assign role to' })
  userId: number;

  @ApiProperty({ example: 'ADMIN', description: 'Role name to assign' })
  roleName: string;
}