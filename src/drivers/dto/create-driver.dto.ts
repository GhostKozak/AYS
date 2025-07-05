import { IsMongoId, IsNotEmpty, IsOptional, IsString } from "class-validator";

export class CreateDriverDto {

    @IsMongoId({ message: 'validation.IS_MONGOID' })
    @IsNotEmpty({ message: 'validation.IS_NOT_EMPTY' })
    company: string;

    @IsString({ message: 'validation.IS_STRING' })
    @IsNotEmpty({ message: 'validation.IS_NOT_EMPTY' })
    full_name: string;

    @IsOptional()
    @IsString({ message: 'validation.IS_STRING' })
    @IsNotEmpty({ message: 'validation.IS_NOT_EMPTY' })
    phone_number: string;
}