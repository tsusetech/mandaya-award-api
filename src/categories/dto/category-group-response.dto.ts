import { ApiProperty } from '@nestjs/swagger';

export class CategoryGroupResponseDto {
  @ApiProperty({ example: 1, description: 'Category-Group assignment ID' })
  id: number;

  @ApiProperty({ example: 1, description: 'Category ID' })
  categoryId: number;

  @ApiProperty({ example: 1, description: 'Group ID' })
  groupId: number;

  @ApiProperty({ example: '2024-01-15T10:30:00Z', description: 'Creation timestamp' })
  createdAt: Date;

  @ApiProperty({ example: '2024-01-15T10:30:00Z', description: 'Last update timestamp' })
  updatedAt: Date;

  @ApiProperty({ 
    example: {
      id: 1,
      name: 'Pemerintah Daerah Pendukung Pemberdayaan',
      description: 'Category for local government supporting empowerment'
    },
    description: 'Category information',
    required: false
  })
  category?: {
    id: number;
    name: string;
    description: string | null;
  };

  @ApiProperty({ 
    example: {
      id: 1,
      groupName: 'Provinsi',
      description: 'Province level group'
    },
    description: 'Group information',
    required: false
  })
  group?: {
    id: number;
    groupName: string;
    description: string | null;
  };
}
