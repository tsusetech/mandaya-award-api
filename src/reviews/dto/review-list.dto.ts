import { ApiProperty } from '@nestjs/swagger';

export class ReviewListItemDto {
  @ApiProperty({ required: false })
  id?: number;

  @ApiProperty()
  sessionId: number;

  @ApiProperty()
  userId: number;

  @ApiProperty()
  userName: string;

  @ApiProperty()
  groupId: number;

  @ApiProperty()
  groupName: string;

  @ApiProperty()
  status: string;

  @ApiProperty()
  submittedAt: Date;

  @ApiProperty({ required: false })
  reviewerId?: number;

  @ApiProperty({ required: false })
  reviewerName?: string;

  @ApiProperty({ required: false })
  reviewedAt?: Date;

  @ApiProperty({ required: false })
  decision?: string;
}

export class ReviewListResponseDto {
  @ApiProperty({ type: [ReviewListItemDto] })
  reviews: ReviewListItemDto[];

  @ApiProperty()
  total: number;

  @ApiProperty()
  page: number;

  @ApiProperty()
  limit: number;
}
