import { ApiProperty } from '@nestjs/swagger';

export class RoleResponseDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'ADMIN' })
  name: string;

  @ApiProperty({
    example: 'Administrator role with full permissions',
    required: false,
  })
  description?: string;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  updatedAt: Date;
}

export class UserRoleResponseDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 1 })
  userId: number;

  @ApiProperty({ example: 1 })
  roleId: number;

  @ApiProperty({ type: RoleResponseDto })
  role: RoleResponseDto;

  @ApiProperty({
    type: 'object',
    properties: {
      id: { type: 'number', example: 1 },
      email: { type: 'string', example: 'user@example.com' },
      username: { type: 'string', example: 'username' },
      name: { type: 'string', example: 'Full Name' },
    },
  })
  user: {
    id: number;
    email: string;
    username: string;
    name?: string;
  };
}
