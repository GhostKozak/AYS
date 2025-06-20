import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { VehicleType } from '../enums/vehicleTypes';

export type VehicleDocument = HydratedDocument<Vehicle>;

@Schema({
    collection: 'vehicles',
    timestamps: true,
})

export class Vehicle {
    @Prop({ unique: true, trim: true })
    licence_plate: string;

    @Prop({ enum: VehicleType, default: VehicleType.TRUCK })
    vehicle_type: VehicleType;

    @Prop({ default: false })
    deleted: boolean;
}

export const VehicleSchema = SchemaFactory.createForClass(Vehicle);