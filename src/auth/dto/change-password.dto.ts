import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength, MaxLength, Matches, Validate, ValidationArguments, ValidatorConstraint, ValidatorConstraintInterface } from 'class-validator';

@ValidatorConstraint({ name: 'passwordMatch', async: false })
export class PasswordMatchConstraint implements ValidatorConstraintInterface {
  validate(confirmPassword: string, args: ValidationArguments) {
    const object = args.object as any;
    return confirmPassword === object.newPassword;
  }

  defaultMessage(args: ValidationArguments) {
    return 'New password and confirmation password do not match';
  }
}

export class ChangePasswordDto {
  @ApiProperty({
    example: 'currentPassword123',
    description: 'Current password for verification',
  })
  @IsString()
  currentPassword: string;

  @ApiProperty({
    example: 'newPassword123',
    description: 'New password (minimum 8 characters, must contain letters and numbers)',
  })
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  @MaxLength(128, { message: 'Password cannot exceed 128 characters' })
  @Matches(/^(?=.*[A-Za-z])(?=.*\d)/, {
    message: 'Password must contain at least one letter and one number',
  })
  newPassword: string;

  @ApiProperty({
    example: 'newPassword123',
    description: 'Confirm new password (must match newPassword)',
  })
  @IsString()
  @Validate(PasswordMatchConstraint)
  confirmPassword: string;
}
