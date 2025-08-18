import { ApiProperty } from '@nestjs/swagger';

export class UserRoleDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'PESERTA' })
  name: string;

  @ApiProperty({ example: 'Peserta kompetisi' })
  description?: string;
}

export class UserResponseDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'john.doe@example.com' })
  email: string;

  @ApiProperty({ example: 'johndoe' })
  username: string;

  @ApiProperty({ example: 'John Doe', required: false })
  name?: string;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  updatedAt: Date;

  @ApiProperty({ type: [UserRoleDto] })
  userRoles: { role: UserRoleDto }[];
}

export class UsersListResponseDto {
  @ApiProperty({ example: 'Users retrieved successfully' })
  message: string;

  @ApiProperty({ type: [UserResponseDto] })
  users: UserResponseDto[];

  @ApiProperty({ example: 10 })
  count: number;
}
