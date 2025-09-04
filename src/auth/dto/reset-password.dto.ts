import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength, MaxLength, Matches, Validate, ValidationArguments, ValidatorConstraint, ValidatorConstraintInterface } from 'class-validator';

@ValidatorConstraint({ name: 'passwordMatch', async: false })
export class PasswordMatchConstraint implements ValidatorConstraintInterface {
  validate(confirmPassword: string, args: ValidationArguments) {
    const object = args.object as any;
    return confirmPassword === object.newPassword;
  }

  defaultMessage(args: ValidationArguments) {
    return 'Kata sandi baru dan konfirmasi kata sandi tidak cocok';
  }
}

export class ResetPasswordDto {
  @ApiProperty({
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    description: 'Password reset token received via email',
  })
  @IsString()
  resetToken: string;

  @ApiProperty({
    example: 'newPassword123',
    description: 'New password (minimum 8 characters, must contain letters and numbers)',
  })
  @IsString()
  @MinLength(8, { message: 'Kata sandi harus minimal 8 karakter' })
  @MaxLength(128, { message: 'Kata sandi tidak boleh lebih dari 128 karakter' })
  @Matches(/^(?=.*[A-Za-z])(?=.*\d)/, {
    message: 'Kata sandi harus mengandung minimal satu huruf dan satu angka',
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
