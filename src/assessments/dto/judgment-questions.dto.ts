import { ApiProperty } from '@nestjs/swagger';
import {
  IsNumber,
  IsString,
  IsOptional,
  IsBoolean,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { AssessmentQuestionDto } from './assessment-question.dto';

export class TahapGroupInfoDto {
  @ApiProperty({ example: 'Tahap 1 Delta' })
  @IsString()
  tahapGroup: string;

  @ApiProperty({ example: 'delta_penduduk_miskin' })
  @IsString()
  groupIdentifier: string;

  @ApiProperty({ example: 'Delta jumlah penduduk miskin' })
  @IsString()
  description: string;

  @ApiProperty({ example: 'delta' })
  @IsString()
  calculationType: string;
}

export class JudgmentQuestionDto extends AssessmentQuestionDto {
  // Override the optional properties to make them required with specific types
  @ApiProperty({ example: 'Fadel Nugraha' })
  @IsString()
  declare response: string;

  @ApiProperty({ 
    description: 'Tahap group information for this question',
    type: [TahapGroupInfoDto]
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TahapGroupInfoDto)
  tahapGroups: TahapGroupInfoDto[];
}

export class JudgmentSessionDto {
  @ApiProperty({ example: 280 })
  @IsNumber()
  id: number;

  @ApiProperty({ example: 641 })
  @IsNumber()
  userId: number;

  @ApiProperty({ example: 5 })
  @IsNumber()
  groupId: number;

  @ApiProperty({ example: 'Perguruan Tinggi' })
  @IsString()
  groupName: string;

  @ApiProperty({ example: 'submitted' })
  @IsString()
  status: string;

  @ApiProperty({ example: 100 })
  @IsNumber()
  progressPercentage: number;

  @ApiProperty({ example: true })
  @IsBoolean()
  autoSaveEnabled: boolean;

  @ApiProperty({
    description: 'Questions with tahap-group assignments',
    type: [JudgmentQuestionDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => JudgmentQuestionDto)
  questions: JudgmentQuestionDto[];
}

export class JudgmentQuestionsResponseDto {
  @ApiProperty({
    description: 'Array of sessions with their tahap-group questions',
    type: [JudgmentSessionDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => JudgmentSessionDto)
  data: JudgmentSessionDto[];
}
