import { IsInt } from 'class-validator';

export class AssignCategoryToGroupDto {
  @IsInt()
  groupId: number;

  @IsInt()
  categoryId: number;
}
