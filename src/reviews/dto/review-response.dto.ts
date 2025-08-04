import { ApiProperty } from '@nestjs/swagger';

export class JuryScoreResponseDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  questionId: number;

  @ApiProperty()
  score: number;

  @ApiProperty()
  comments?: string;

  @ApiProperty()
  createdAt: Date;
}

export class ReviewCommentResponseDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  questionId: number;

  @ApiProperty()
  comment: string;

  @ApiProperty()
  isCritical: boolean;

  @ApiProperty()
  stage?: string;

  @ApiProperty()
  createdAt: Date;
}

export class ReviewResponseDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  sessionId: number;

  @ApiProperty()
  reviewerId: number;

  @ApiProperty()
  reviewerName: string;

  @ApiProperty()
  stage: string;

  @ApiProperty()
  status: string;

  @ApiProperty()
  decision: string;

  @ApiProperty()
  overallComments?: string;

  @ApiProperty()
  totalScore?: number;

  @ApiProperty()
  deliberationNotes?: string;

  @ApiProperty()
  internalNotes?: string;

  @ApiProperty({ type: [ReviewCommentResponseDto] })
  questionComments: ReviewCommentResponseDto[];

  @ApiProperty({ type: [JuryScoreResponseDto] })
  juryScores: JuryScoreResponseDto[];

  @ApiProperty({ type: [String] })
  validationChecklist?: string[];

  @ApiProperty()
  reviewedAt?: Date;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
