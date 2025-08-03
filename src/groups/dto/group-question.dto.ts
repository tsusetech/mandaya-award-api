import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsString, IsOptional, IsArray, ArrayMinSize } from 'class-validator';

export class BindQuestionToGroupDto {
  @ApiProperty({ example: 1, description: 'Question ID to bind to group' })
  @IsInt()
  questionId: number;

  @ApiProperty({ example: 1, description: 'Order number for the question in the group' })
  @IsInt()
  orderNumber: number;

  @ApiProperty({ example: 'Section 1: Basic Information', description: 'Section title', required: false })
  @IsString()
  @IsOptional()
  sectionTitle?: string;

  @ApiProperty({ example: 'Personal Details', description: 'Subsection', required: false })
  @IsString()
  @IsOptional()
  subsection?: string;
}

export class UpdateGroupQuestionDto {
  @ApiProperty({ example: 2, description: 'New order number for the question', required: false })
  @IsInt()
  @IsOptional()
  orderNumber?: number;

  @ApiProperty({ example: 'Section 2: Updated Section', description: 'Updated section title', required: false })
  @IsString()
  @IsOptional()
  sectionTitle?: string;

  @ApiProperty({ example: 'Updated Subsection', description: 'Updated subsection', required: false })
  @IsString()
  @IsOptional()
  subsection?: string;
}

export class ReorderQuestionsDto {
  @ApiProperty({ 
    example: [
      { groupQuestionId: 1, orderNumber: 1 },
      { groupQuestionId: 2, orderNumber: 2 }
    ], 
    description: 'Array of group question IDs with their new order numbers' 
  })
  @IsArray()
  @ArrayMinSize(1)
  questions: {
    groupQuestionId: number;
    orderNumber: number;
  }[];
}

export class GroupQuestionResponseDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 1 })
  groupId: number;

  @ApiProperty({ example: 1 })
  questionId: number;

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