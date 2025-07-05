import { IsNotEmpty, IsString } from "class-validator";

export class CreateCompanyDto {
    @IsString({ message: 'validation.IS_STRING' })
    @IsNotEmpty({ message: 'validation.IS_NOT_EMPTY' })
    name: string;
}
