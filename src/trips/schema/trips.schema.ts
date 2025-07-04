import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument, Types } from "mongoose";
import { Company } from "../../companies/schemas/company.schema";
import { Driver } from "../../drivers/schemas/driver.schema";
import { Vehicle } from "../../vehicles/schema/vehicles.schema";
import { UnloadStatus } from "../enums/unloadStatus";

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

    @Prop({ default: Date.now(), required: true })
    arrival_time: Date;

    @Prop({ type: String, enum: UnloadStatus, default: UnloadStatus.WAITING })
    unload_status: UnloadStatus;

    @Prop({ default: false })
    has_gps_tracking: boolean;

    @Prop({ default: false })
    is_in_temporary_parking_lot: boolean;

    @Prop({ default: false })
    is_trip_canceled: boolean;

    @Prop()
    notes: string;

    @Prop({ default: false })
    deleted: boolean;
}

export const TripSchema = SchemaFactory.createForClass(Trip);