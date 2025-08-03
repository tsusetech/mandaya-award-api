import { ApiProperty } from '@nestjs/swagger';

export class GroupQuestionDetailDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 1 })
  groupId: number;

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

export class QuestionResponseDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'Berapakah jumlah penduduk miskin pada tahun 2022?' })
  questionText: string;

  @ApiProperty({ example: 'numeric-open' })
  inputType: string;

  @ApiProperty({ example: true })
  isRequired: boolean;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  updatedAt: Date;

  @ApiProperty({ type: [GroupQuestionDetailDto], required: false })
  groupQuestions?: GroupQuestionDetailDto[];
}

export class QuestionsListResponseDto {
  @ApiProperty({ example: 'Questions retrieved successfully' })
  message: string;

  @ApiProperty({ type: [QuestionResponseDto] })
  questions: QuestionResponseDto[];

  @ApiProperty({ example: 10 })
  count: number;
}

export class SingleQuestionResponseDto {
  @ApiProperty({ example: 'Question retrieved successfully' })
  message: string;

  @ApiProperty({ type: QuestionResponseDto })
  question: QuestionResponseDto;
}