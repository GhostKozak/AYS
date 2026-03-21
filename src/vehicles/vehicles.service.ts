import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';
import { InjectModel } from '@nestjs/mongoose';
import { Vehicle, VehicleDocument } from './schema/vehicles.schema';
import { Model } from 'mongoose';
import { VehicleType } from './enums/vehicleTypes';
import { PaginationQueryDto } from 'src/common/dto/pagination-query.dto';
import { FilterVehicleDto } from './dto/filter-vehicle.dto';
import { I18nService } from 'nestjs-i18n';
import { AuditService } from '../audit/audit.service';
import { EventsGateway } from '../events/events.gateway';

@Injectable()
export class VehiclesService {
  private readonly logger = new Logger(VehiclesService.name);

  constructor(
    @InjectModel(Vehicle.name) private vehicleModel: Model<VehicleDocument>,
    private readonly i18n: I18nService,
    private readonly auditService: AuditService,
    private readonly eventsGateway: EventsGateway,
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

    const existingVehicle = await this.vehicleModel.findOne({ licence_plate: normalizedPlate }).lean().exec();
    
    if (existingVehicle) {
      this.logger.log(`Existing vehicle found: ${normalizedPlate}`);
      if (existingVehicle.deleted) {
        existingVehicle.deleted = false;
        return existingVehicle.save();
      }
      return existingVehicle;
    }

    this.logger.log(`Creating new vehicle: ${normalizedPlate}, Type: ${type || VehicleType.TRUCK}`);
    const newVehicle = new this.vehicleModel({
      licence_plate: normalizedPlate,
      type: type || VehicleType.TRUCK,
    });

    return newVehicle.save();
  }

  async findAll(paginationQuery: PaginationQueryDto, filterVehicleDto: FilterVehicleDto, showDeleted = false) {
    const { limit, offset } = paginationQuery;
    const { vehicle_type, search } = filterVehicleDto;
    const query: any = {};

    if (vehicle_type) {
      query.vehicle_type = vehicle_type;
    }

    if (search) {
      query.licence_plate = { $regex: search.replace(/\s+/g, ''), $options: 'i' };
    }

    const vehicles = await this.vehicleModel
      .find(query)
      .setOptions({ skipSoftDelete: showDeleted })
      .skip(offset ?? 0)
      .limit(limit ?? 10)
      .lean()
      .exec();

    const count = await this.vehicleModel.countDocuments(query).setOptions({ skipSoftDelete: showDeleted });

    return {
      data: vehicles,
      count,
    };
  }

  async findOne(id: string, showDeleted = false) {
    const vehicle = await this.vehicleModel.findOne({ _id: id }).setOptions({ skipSoftDelete: showDeleted }).lean().exec();
    
    if (!vehicle) {
      throw new NotFoundException(
        await this.i18n.translate('vehicle.NOT_FOUND', { args: { id } }),
      );
    }
    
    return vehicle;
  }

  async update(id: string, updateVehicleDto: UpdateVehicleDto, user?: any) {
    const existingVehicle = await this.vehicleModel.findOne({ _id: id }).setOptions({ skipSoftDelete: false }).lean().exec();

    if (!existingVehicle) {
      throw new NotFoundException(
        await this.i18n.translate('vehicle.NOT_FOUND', { args: { id } }),
      );
    }

    const updatedVehicle = await this.vehicleModel.findOneAndUpdate(
      { _id: id },
      updateVehicleDto,
      { new: true, returnDocument: 'after' }
    ).setOptions({ skipSoftDelete: false }).lean().exec();

    if (!updatedVehicle) {
      throw new NotFoundException(
        await this.i18n.translate('vehicle.NOT_FOUND', { args: { id } }),
      );
    }

    if (user) {
      setImmediate(() => {
        this.auditService.log({
          user: user.userId,
          action: 'UPDATE',
          entity: 'Vehicle',
          entityId: id,
          oldValue: existingVehicle,
          newValue: updatedVehicle,
        }).catch(err => this.logger.error('Audit log failed', err));
      });
    }

    this.eventsGateway.emitVehicleUpdated(updatedVehicle);

    return updatedVehicle;
  }

  async remove(id: string) {
    const deletedVehicle = await this.vehicleModel.findOneAndUpdate(
      { _id: id },
      { deleted: true },
      { new: true }
    ).exec();

    if (!deletedVehicle) {
      throw new NotFoundException(
        await this.i18n.translate('vehicle.NOT_FOUND', { args: { id } }),
      );
    }

    return deletedVehicle;
  }
}
