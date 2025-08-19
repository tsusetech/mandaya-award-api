import { IsArray, IsInt, ArrayMinSize, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AssignQuestionsToCategory {
  @ApiProperty({
    example: [1, 2, 3],
    description: 'Array of group question IDs to assign to this category',
  })
  @IsArray()
  @ArrayMinSize(1)
  @IsInt({ each: true })
  groupQuestionIds: number[];
}

export class AssignSingleQuestionToCategory {
  @ApiProperty({
    example: 1,
    description: 'Group question ID to assign to this category',
  })
  @IsInt()
  groupQuestionId: number;
}

export class UpdateQuestionCategoryAssignment {
  @ApiProperty({
    example: 2,
    description: 'New category ID to assign (null to remove assignment)',
    required: false,
  })
  @IsOptional()
  @IsInt()
  categoryId?: number | null;
}

export class BulkAssignQuestionsDto {
  @ApiProperty({
    example: [
      { groupQuestionId: 1, categoryId: 1 },
      { groupQuestionId: 2, categoryId: 2 },
      { groupQuestionId: 3, categoryId: null }, // Remove assignment
    ],
    description: 'Array of assignments to process',
  })
  @IsArray()
  @ArrayMinSize(1)
  assignments: {
    groupQuestionId: number;
    categoryId: number | null;
  }[];
}

export class QuestionCategoryAssignmentResponseDto {
  @ApiProperty({ example: 1 })
  groupQuestionId: number;

  @ApiProperty({ example: 1 })
  categoryId: number;

  @ApiProperty({ example: 'Economic Impact' })
  categoryName: string;

  @ApiProperty({ example: 1 })
  groupId: number;

  @ApiProperty({ example: 'Test Group' })
  groupName: string;

  @ApiProperty({ example: 1 })
  questionId: number;

  @ApiProperty({ example: 'What is your organization name?' })
  questionText: string;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  assignedAt: Date;
}
