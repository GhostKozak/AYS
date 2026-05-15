import { IsMongoId, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateDriverDto {
  @ApiProperty({
    description: 'Company ID',
    example: '507f1f77bcf86cd799439011',
  })
  @IsMongoId({ message: 'validation.IS_MONGOID' })
  @IsNotEmpty({ message: 'validation.IS_NOT_EMPTY' })
  company: string;

  @ApiProperty({ description: 'Driver full name', example: 'John Doe' })
  @IsString({ message: 'validation.IS_STRING' })
  @IsNotEmpty({ message: 'validation.IS_NOT_EMPTY' })
  full_name: string;

  @ApiPropertyOptional({
    description: 'Driver phone number',
    example: '+905551234567',
  })
  @IsOptional()
  @IsString({ message: 'validation.IS_STRING' })
  @IsNotEmpty({ message: 'validation.IS_NOT_EMPTY' })
  phone_number: string;
}
