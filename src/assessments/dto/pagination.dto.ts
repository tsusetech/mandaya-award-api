import { ApiProperty } from '@nestjs/swagger';
import {
  IsOptional,
  IsNumber,
  IsString,
  IsPositive,
  Min,
  Max,
  IsEnum,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CombinedStatus } from './combined-status.enum';

export class PaginationQueryDto {
  @ApiProperty({
    example: 1,
    description: 'Page number (starts from 1)',
    required: false,
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  page?: number = 1;

  @ApiProperty({
    example: 10,
    description: 'Number of items per page',
    required: false,
    default: 10,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 10;

  @ApiProperty({
    example: 'Personal Information',
    description: 'Filter by section title',
    required: false,
  })
  @IsOptional()
  @IsString()
  sectionTitle?: string;

  @ApiProperty({
    example: 'Basic Info',
    description: 'Filter by subsection',
    required: false,
  })
  @IsOptional()
  @IsString()
  subsection?: string;

  @ApiProperty({
    example: 'submitted',
    description:
      'Filter by final status (combines session and review statuses)',
    required: false,
    enum: CombinedStatus,
  })
  @IsOptional()
  @IsEnum(CombinedStatus)
  finalStatus?: CombinedStatus;
}

export class PaginatedResponseDto<T> {
  @ApiProperty({ example: 1 })
  page: number;

  @ApiProperty({ example: 10 })
  limit: number;

  @ApiProperty({ example: 50 })
  total: number;

  @ApiProperty({ example: 5 })
  totalPages: number;

  @ApiProperty({ example: true })
  hasNext: boolean;

  @ApiProperty({ example: false })
  hasPrev: boolean;

  @ApiProperty()
  data: T[];
}
