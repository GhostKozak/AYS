import { Injectable, Logger } from '@nestjs/common';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';
import { InjectModel } from '@nestjs/mongoose';
import { Vehicle, VehicleDocument } from './schema/vehicles.schema';
import { Model } from 'mongoose';
import { VehicleType } from './enums/vehicleTypes';
import { PaginationQueryDto } from 'src/common/dto/pagination-query.dto';
import { FilterVehicleDto } from './dto/filter-vehicle.dto';

@Injectable()
export class VehiclesService {
  private readonly logger = new Logger(VehiclesService.name);

  constructor(
    @InjectModel(Vehicle.name) private vehicleModel: Model<VehicleDocument>
  ) {}

  create(createVehicleDto: CreateVehicleDto) {
    const normalizedPlate = createVehicleDto.licence_plate.replace(/\s+/g, '').toUpperCase();

    const vehicleToCreate = {
        ...createVehicleDto,
        licence_plate: normalizedPlate,
    };
    
    const createdVehicle = new this.vehicleModel(vehicleToCreate);
    return createdVehicle.save();
  }

  async findOrCreateByPlate(
    licencePlate: string,
    type?: VehicleType,
  ): Promise<VehicleDocument> {
    
    const normalizedPlate = licencePlate.replace(/\s+/g, '').toUpperCase();

    const existingVehicle = await this.vehicleModel.findOne({ licence_plate: normalizedPlate }).exec();
    
    if (existingVehicle) {
      this.logger.log(`Existing vehicle found: ${normalizedPlate}`);
      return existingVehicle;
    }

    this.logger.log(`Creating new vehicle: ${normalizedPlate}, Type: ${type || VehicleType.TRUCK}`);
    const newVehicle = new this.vehicleModel({
      licence_plate: normalizedPlate,
      type: type || VehicleType.TRUCK,
    });

    return newVehicle.save();
  }

  async findAll(paginationQuery: PaginationQueryDto, filterVehicleDto: FilterVehicleDto) {
    const { limit, offset } = paginationQuery;
    const { vehicle_type, search } = filterVehicleDto;
    const query: any = { deleted: false };

    if (vehicle_type) {
      query.vehicle_type = vehicle_type;
    }

    if (search) {
      query.licence_plate = { $regex: search.replace(/\s+/g, ''), $options: 'i' };
    }

    const vehicles = await this.vehicleModel
      .find(query)
      .skip(offset ?? 0)
      .limit(limit ?? 10)
      .exec();

    const count = await this.vehicleModel.countDocuments(query);

    return {
      data: vehicles,
      count,
    };
  }

  async findOne(id: string) {
    return await this.vehicleModel.findById(id).exec()
  }

  async update(id: string, updateVehicleDto: UpdateVehicleDto) {
    return await this.vehicleModel.findByIdAndUpdate(
      id,
      updateVehicleDto,
      { new: true }
    ).exec()
  }

  async remove(id: string) {
    return await this.vehicleModel.findByIdAndUpdate(
      id,
      { deleted: true },
      { new: true }
    ).exec()
  }
}
