import { IsEmail, IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({
    description: 'User email address',
    example: 'admin@admin.com',
  })
  @IsEmail({}, { message: 'validation.IS_EMAIL' })
  @IsNotEmpty({ message: 'validation.IS_NOT_EMPTY' })
  email: string;

  @ApiProperty({ description: 'User password', example: 'Admin.123.' })
  @IsString({ message: 'validation.IS_STRING' })
  @IsNotEmpty({ message: 'validation.IS_NOT_EMPTY' })
  password: string;
}
