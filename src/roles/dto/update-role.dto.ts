import { ApiProperty } from '@nestjs/swagger';

export class UpdateRoleDto {
  @ApiProperty({
    example: 'MODERATOR',
    description: 'Role name (uppercase)',
    required: false,
  })
  name?: string;

  @ApiProperty({
    example: 'Can moderate content and manage users',
    description: 'Role description',
    required: false,
  })
  description?: string;
}
