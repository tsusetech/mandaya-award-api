export class GroupCategoryResponseDto {
  id: number;
  groupId: number;
  categoryId: number;
  createdAt: Date;
  updatedAt: Date;
  group?: {
    id: number;
    groupName: string;
    description: string | null;
  };
  category?: {
    id: number;
    name: string;
    description: string | null;
  };
}
