import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { Company } from '../../companies/schemas/company.schema';
import { SoftDeletePlugin } from '../../common/plugins/soft-delete.plugin';

export type DriverDocument = HydratedDocument<Driver>;

@Schema({
    collection: 'drivers',
    timestamps: true,
})

export class Driver {

    @Prop({ type: Types.ObjectId, ref: Company.name, required: true })
    company: Company;

    @Prop({ required: true, trim: true })
    full_name: string;

    @Prop({ trim: true, unique: true, sparse: true })
    phone_number: string;

    deleted?: boolean;
}

export const DriverSchema = SchemaFactory.createForClass(Driver);
DriverSchema.plugin(SoftDeletePlugin);

DriverSchema.index({ full_name: 'text' });