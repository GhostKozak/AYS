import { IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';
import { UserRole } from '../schemas/user.schema';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateUserDto {
  @ApiProperty({ description: 'User email address', example: 'user@example.com' })
  @IsEmail({}, { message: 'validation.IS_EMAIL' })
  @IsNotEmpty({ message: 'validation.IS_NOT_EMPTY' })
  email: string;

  @ApiProperty({ description: 'User password (min 6 chars)', example: 'secret123' })
  @IsString({ message: 'validation.IS_STRING' })
  @MinLength(6, { message: 'validation.MIN_LENGTH' })
  password: string;

  @ApiProperty({ description: 'User first name', example: 'Jane' })
  @IsString({ message: 'validation.IS_STRING' })
  @IsNotEmpty({ message: 'validation.IS_NOT_EMPTY' })
  firstName: string;

  @ApiProperty({ description: 'User last name', example: 'Smith' })
  @IsString({ message: 'validation.IS_STRING' })
  @IsNotEmpty({ message: 'validation.IS_NOT_EMPTY' })
  lastName: string;

  @ApiPropertyOptional({ description: 'User role', enum: UserRole, default: UserRole.USER })
  @IsEnum(UserRole, { message: 'validation.IS_ENUM' })
  @IsOptional({ message: 'validation.IS_OPTIONAL' })
  role?: UserRole;
} 