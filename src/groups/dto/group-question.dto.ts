import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsString, IsOptional, IsArray, ArrayMinSize, IsBoolean, IsEnum } from 'class-validator';

export enum CalculationType {
  DELTA = 'delta',
  AVERAGE = 'average',
  SUM = 'sum',
  CUSTOM = 'custom'
}

export enum TahapGroup {
  TAHAP_1_DELTA = 'Tahap 1 Delta',
  TAHAP_2 = 'Tahap 2',
  TAHAP_3 = 'Tahap 3'
}

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

  @ApiProperty({ 
    example: 'Tahap 1 Delta', 
    description: 'Tahap group for calculation purposes', 
    required: false,
    enum: TahapGroup
  })
  @IsEnum(TahapGroup)
  @IsOptional()
  tahapGroup?: TahapGroup;

  @ApiProperty({ 
    example: 'delta', 
    description: 'Type of calculation for this group', 
    required: false,
    enum: CalculationType
  })
  @IsEnum(CalculationType)
  @IsOptional()
  calculationType?: CalculationType;

  @ApiProperty({ 
    example: 'poverty_metrics', 
    description: 'Identifier for grouping related questions across subsections', 
    required: false 
  })
  @IsString()
  @IsOptional()
  groupIdentifier?: string;

  @ApiProperty({ 
    example: true, 
    description: 'Whether this question is part of a calculation group', 
    required: false 
  })
  @IsBoolean()
  @IsOptional()
  isGrouped?: boolean;
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

  @ApiProperty({ 
    example: 'Tahap 2', 
    description: 'Updated tahap group', 
    required: false,
    enum: TahapGroup
  })
  @IsEnum(TahapGroup)
  @IsOptional()
  tahapGroup?: TahapGroup;

  @ApiProperty({ 
    example: 'average', 
    description: 'Updated calculation type', 
    required: false,
    enum: CalculationType
  })
  @IsEnum(CalculationType)
  @IsOptional()
  calculationType?: CalculationType;

  @ApiProperty({ 
    example: 'expenditure_metrics', 
    description: 'Updated group identifier', 
    required: false 
  })
  @IsString()
  @IsOptional()
  groupIdentifier?: string;

  @ApiProperty({ 
    example: false, 
    description: 'Updated grouped status', 
    required: false 
  })
  @IsBoolean()
  @IsOptional()
  isGrouped?: boolean;
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

  @ApiProperty({ example: 'Tahap 1 Delta', required: false, enum: TahapGroup })
  tahapGroup?: TahapGroup;

  @ApiProperty({ example: 'delta', required: false, enum: CalculationType })
  calculationType?: CalculationType;

  @ApiProperty({ example: 'poverty_metrics', required: false })
  groupIdentifier?: string;

  @ApiProperty({ example: true, required: false })
  isGrouped?: boolean;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  updatedAt: Date;
}

// New DTOs for tahap-based grouping
export class CreateTahapGroupDto {
  @ApiProperty({ example: 'Tahap 1 Delta', enum: TahapGroup })
  @IsEnum(TahapGroup)
  tahapGroup: TahapGroup;

  @ApiProperty({ example: 'poverty_metrics' })
  @IsString()
  groupIdentifier: string;

  @ApiProperty({ example: 'delta', enum: CalculationType })
  @IsEnum(CalculationType)
  calculationType: CalculationType;

  @ApiProperty({ example: 'Poverty reduction metrics for delta calculation' })
  @IsString()
  description: string;

  @ApiProperty({ 
    example: [1, 2, 3], 
    description: 'Array of question IDs to include in this group' 
  })
  @IsArray()
  @ArrayMinSize(1)
  questionIds: number[];
}

export class UpdateTahapGroupDto {
  @ApiProperty({ example: 'Tahap 2', enum: TahapGroup, required: false })
  @IsEnum(TahapGroup)
  @IsOptional()
  tahapGroup?: TahapGroup;

  @ApiProperty({ example: 'expenditure_metrics', required: false })
  @IsString()
  @IsOptional()
  groupIdentifier?: string;

  @ApiProperty({ example: 'average', enum: CalculationType, required: false })
  @IsEnum(CalculationType)
  @IsOptional()
  calculationType?: CalculationType;

  @ApiProperty({ example: 'Updated description', required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ 
    example: [4, 5, 6], 
    description: 'Updated array of question IDs', 
    required: false 
  })
  @IsArray()
  @IsOptional()
  questionIds?: number[];
}

export class GetTahapGroupsDto {
  @ApiProperty({ example: 'Tahap 1 Delta', enum: TahapGroup, required: false })
  @IsEnum(TahapGroup)
  @IsOptional()
  tahapGroup?: TahapGroup;

  @ApiProperty({ example: 'poverty_metrics', required: false })
  @IsString()
  @IsOptional()
  groupIdentifier?: string;

  @ApiProperty({ example: 1, required: false })
  @IsInt()
  @IsOptional()
  groupId?: number;
}