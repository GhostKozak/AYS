import { IsMongoId, IsNotEmpty, IsOptional, IsString } from "class-validator";

export class CreateDriverDto {

    @IsMongoId({ message: 'A valid company ID must be provided.' })
    @IsNotEmpty()
    company: string;

    @IsString()
    @IsNotEmpty()
    full_name: string;

    @IsOptional()
    @IsString()
    @IsNotEmpty()
    phone_number: string;
}