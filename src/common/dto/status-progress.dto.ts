import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional, IsDateString, IsEnum } from 'class-validator';

export enum EntityType {
  RESPONSE_SESSION = 'response_session',
  REVIEW = 'review'
}

export class StatusProgressDto {
  @ApiProperty({ example: 1 })
  @IsNumber()
  id: number;

  @ApiProperty({ enum: EntityType, example: EntityType.RESPONSE_SESSION })
  @IsEnum(EntityType)
  entityType: EntityType;

  @ApiProperty({ example: 1 })
  @IsNumber()
  entityId: number;

  @ApiProperty({ example: 'submitted' })
  @IsString()
  status: string;

  @ApiProperty({ example: 1, description: 'Version number (1 for latest, 2 for previous, etc.)' })
  @IsNumber()
  version: number;

  @ApiProperty({ example: 'draft', required: false, nullable: true })
  @IsOptional()
  @IsString()
  previousStatus?: string | null;

  @ApiProperty({ example: 1, required: false, nullable: true })
  @IsOptional()
  @IsNumber()
  changedBy?: number | null;

  @ApiProperty({ example: 'John Doe', required: false, nullable: true })
  @IsOptional()
  @IsString()
  changedByName?: string | null;

  @ApiProperty({ example: '2024-01-01T00:00:00Z' })
  @IsDateString()
  changedAt: string;

  @ApiProperty({ example: { action: 'submit_session' }, required: false, nullable: true })
  @IsOptional()
  metadata?: any;
}

export class StatusHistoryDto {
  @ApiProperty({ enum: EntityType, example: EntityType.RESPONSE_SESSION })
  @IsEnum(EntityType)
  entityType: EntityType;

  @ApiProperty({ example: 1 })
  @IsNumber()
  entityId: number;

  @ApiProperty({ type: [StatusProgressDto] })
  history: StatusProgressDto[];
}
