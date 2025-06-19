import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { Company } from '../../companies/schemas/company.schema';

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

    @Prop({ default: false })
    deleted: boolean;
}

export const DriverSchema = SchemaFactory.createForClass(Driver);

DriverSchema.index({ full_name: 'text' });