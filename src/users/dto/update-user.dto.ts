import { ApiProperty } from '@nestjs/swagger';

export class UpdateUserDto {
  @ApiProperty({
    example: 'John Doe',
    description: 'Full name',
    required: false,
  })
  name?: string;

  @ApiProperty({
    example: 'john.doe@example.com',
    description: 'Email address',
    required: false,
  })
  email?: string;

  @ApiProperty({ example: 'johndoe', description: 'Username', required: false })
  username?: string;
}
