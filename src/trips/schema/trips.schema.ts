import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { Company } from '../../companies/schemas/company.schema';
import { Driver } from '../../drivers/schemas/driver.schema';
import { Vehicle } from '../../vehicles/schema/vehicles.schema';
import { UnloadStatus } from '../enums/unloadStatus';
import { VerificationStatus } from '../enums/verificationStatus';
export type TripDocument = HydratedDocument<Trip>;

@Schema({
  collection: 'trips',
  timestamps: true,
})
export class Trip {
  @Prop({ type: Types.ObjectId, ref: Driver.name, required: true })
  driver: Driver;

  @Prop({ type: Types.ObjectId, ref: Company.name, required: true })
  company: Company;

  @Prop({ type: Types.ObjectId, ref: Vehicle.name, required: true })
  vehicle: Vehicle;

  @Prop({ default: null })
  departure_time: Date;

  @Prop({ default: Date.now, required: true, index: true })
  arrival_time: Date;

  @Prop({ type: String, enum: UnloadStatus, default: UnloadStatus.WAITING })
  unload_status: UnloadStatus;

  @Prop({ default: false })
  has_gps_tracking: boolean;

  @Prop({ default: false })
  is_trip_canceled: boolean;

  @Prop({ default: false })
  is_in_parking_lot: boolean;

  @Prop({ default: null })
  parked_at: Date;

  @Prop({ default: 'Murat Garaj' })
  parking_area: string;

  @Prop({ default: null })
  parking_note: string;

  @Prop({ type: [{ entered_at: { type: Date }, area: { type: String }, note: { type: String } }], default: [] })
  parking_history: { entered_at: Date; area: string; note: string }[];

  @Prop({
    type: String,
    enum: VerificationStatus,
    default: VerificationStatus.PENDING,
  })
  status: VerificationStatus;

  @Prop({ default: null })
  field_photo_path: string;

  @Prop({ type: [String], default: [] })
  field_photo_paths: string[];

  @Prop({ default: null })
  seal_number: string;

  @Prop({ default: null })
  field_verified_at: Date;

  @Prop()
  notes: string;

  deleted?: boolean;
}

export const TripSchema = SchemaFactory.createForClass(Trip);

TripSchema.index({ vehicle: 1, driver: 1, company: 1, arrival_time: -1 });
TripSchema.index({ unload_status: 1, arrival_time: -1 });
TripSchema.index({ is_trip_canceled: 1, arrival_time: -1 });
TripSchema.index({ is_in_parking_lot: 1 });
TripSchema.index({ status: 1, is_trip_canceled: 1 });
