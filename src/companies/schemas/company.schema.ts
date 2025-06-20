import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type CompanyDocument = HydratedDocument<Company>;

@Schema({
    collection: 'companies',
    timestamps: true,
})

export class Company {
    @Prop({ required: true, trim: true, unique: true })
    name: string;

    @Prop({ default: false })
    deleted: boolean;
}

export const CompanySchema = SchemaFactory.createForClass(Company);