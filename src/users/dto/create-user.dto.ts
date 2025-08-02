import { IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';
import { UserRole } from '../schemas/user.schema';

export class CreateUserDto {
  @IsEmail({}, { message: 'validation.IS_EMAIL' })
  @IsNotEmpty({ message: 'validation.IS_NOT_EMPTY' })
  email: string;

  @IsString({ message: 'validation.IS_STRING' })
  @MinLength(6, { message: 'validation.MIN_LENGTH' })
  password: string;

  @IsString({ message: 'validation.IS_STRING' })
  @IsNotEmpty({ message: 'validation.IS_NOT_EMPTY' })
  firstName: string;

  @IsString({ message: 'validation.IS_STRING' })
  @IsNotEmpty({ message: 'validation.IS_NOT_EMPTY' })
  lastName: string;

  @IsEnum(UserRole, { message: 'validation.IS_ENUM' })
  @IsOptional({ message: 'validation.IS_OPTIONAL' })
  role?: UserRole;
} 