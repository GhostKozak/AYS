import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { VehicleType } from '../enums/vehicleTypes';
import { SoftDeletePlugin } from '../../common/plugins/soft-delete.plugin';

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

  deleted?: boolean;
}

export const VehicleSchema = SchemaFactory.createForClass(Vehicle);
VehicleSchema.plugin(SoftDeletePlugin);
