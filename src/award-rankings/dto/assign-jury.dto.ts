import { IsInt } from 'class-validator';

export class AssignJuryDto {
  @IsInt()
  juryId: number;
}
