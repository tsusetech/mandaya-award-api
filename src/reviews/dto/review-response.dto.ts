import { ApiProperty } from '@nestjs/swagger';

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
  status: string;

  @ApiProperty()
  decision: string;

  @ApiProperty()
  overallComments?: string;

  @ApiProperty()
  internalNotes?: string;

  @ApiProperty({ type: [ReviewCommentResponseDto] })
  questionComments: ReviewCommentResponseDto[];

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
