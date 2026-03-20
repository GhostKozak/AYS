import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { SoftDeletePlugin } from '../../common/plugins/soft-delete.plugin';

export type CompanyDocument = HydratedDocument<Company>;

@Schema({
    collection: 'companies',
    timestamps: true,
})

export class Company {
    @Prop({ required: true, trim: true, unique: true })
    name: string;

    deleted?: boolean;
}

export const CompanySchema = SchemaFactory.createForClass(Company);
CompanySchema.plugin(SoftDeletePlugin);