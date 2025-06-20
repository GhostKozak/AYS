import { Injectable } from '@nestjs/common';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';
import { InjectModel } from '@nestjs/mongoose';
import { Vehicle, VehicleDocument } from './schema/vehicles.schema';
import { Model } from 'mongoose';

@Injectable()
export class VehiclesService {

  constructor(
    @InjectModel(Vehicle.name) private vehicleModel: Model<VehicleDocument>
  ) {}

  create(createVehicleDto: CreateVehicleDto) {
    const newVehicle = new this.vehicleModel(createVehicleDto);
    return newVehicle.save();
  }

  findAll() {
    return this.vehicleModel.find({ deleted: false }).exec()
  }

  findOne(id: string) {
    return this.vehicleModel.findById(id).exec()
  }

  update(id: string, updateVehicleDto: UpdateVehicleDto) {
    return this.vehicleModel.findByIdAndUpdate(
      id,
      updateVehicleDto,
      { new: true }
    ).exec()
  }

  remove(id: string) {
    return this.vehicleModel.findByIdAndUpdate(
      id,
      { deleted: true },
      { new: true }
    ).exec()
  }
}
