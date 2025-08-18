import { ApiProperty } from '@nestjs/swagger';

export class GroupQuestionDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 1 })
  orderNumber: number;

  @ApiProperty({ example: 'Section 1', required: false })
  sectionTitle?: string;

  @ApiProperty({ example: 'Subsection A', required: false })
  subsection?: string;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  updatedAt: Date;
}

export class GroupResponseDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'Quiz Indonesia' })
  groupName: string;

  @ApiProperty({
    example: 'Quiz tentang pengetahuan umum Indonesia',
    required: false,
  })
  description?: string;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  updatedAt: Date;

  @ApiProperty({ type: [GroupQuestionDto], required: false })
  groupQuestions?: GroupQuestionDto[];
}

export class GroupsListResponseDto {
  @ApiProperty({ example: 'Groups retrieved successfully' })
  message: string;

  @ApiProperty({ type: [GroupResponseDto] })
  groups: GroupResponseDto[];

  @ApiProperty({ example: 5 })
  count: number;
}

export class SingleGroupResponseDto {
  @ApiProperty({ example: 'Group retrieved successfully' })
  message: string;

  @ApiProperty({ type: GroupResponseDto })
  group: GroupResponseDto;
}
