import { ApiProperty } from '@nestjs/swagger';

export class CreateRoleDto {
  @ApiProperty({ example: 'MODERATOR', description: 'Role name (uppercase)' })
  name: string;

  @ApiProperty({ example: 'Can moderate content and manage users', description: 'Role description', required: false })
  description?: string;
}