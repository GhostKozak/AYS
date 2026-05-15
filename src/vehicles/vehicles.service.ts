import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';
import { InjectModel } from '@nestjs/mongoose';
import { Vehicle, VehicleDocument } from './schema/vehicles.schema';
import { Model, FilterQuery } from 'mongoose';
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

  async create(createVehicleDto: CreateVehicleDto) {
    const normalizedPlate = createVehicleDto.licence_plate
      .replace(/\s+/g, '')
      .toUpperCase();

    const vehicleToCreate = {
      ...createVehicleDto,
      licence_plate: normalizedPlate,
    };

    const createdVehicle = new this.vehicleModel(vehicleToCreate);
    const savedVehicle = await createdVehicle.save();
    return savedVehicle;
  }

  async findOrCreateByPlate(
    licencePlate: string,
    type?: VehicleType,
  ): Promise<VehicleDocument> {
    const normalizedPlate = licencePlate.replace(/\s+/g, '').toUpperCase();

    const existingVehicle = await this.vehicleModel
      .findOne({ licence_plate: normalizedPlate })
      .lean()
      .exec();

    if (existingVehicle) {
      this.logger.log(`Existing vehicle found: ${normalizedPlate}`);
      if (existingVehicle.deleted) {
        const savedVehicle = await this.vehicleModel.findByIdAndUpdate(
          existingVehicle._id,
          { deleted: false },
          { new: true },
        );
        return savedVehicle as VehicleDocument;
      }
      return existingVehicle;
    }

    this.logger.log(
      `Creating new vehicle: ${normalizedPlate}, Type: ${type || VehicleType.TRUCK}`,
    );
    try {
      const newVehicle = new this.vehicleModel({
        licence_plate: normalizedPlate,
        type: type || VehicleType.TRUCK,
      });

      const savedVehicle = await newVehicle.save();
      return savedVehicle;
    } catch (error: unknown) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      if ((error as any).code === 11000) {
        const raceConditionVehicle = await this.vehicleModel
          .findOne({ licence_plate: normalizedPlate })
          .lean()
          .exec();
        if (raceConditionVehicle?.deleted) {
          return (await this.vehicleModel.findByIdAndUpdate(
            raceConditionVehicle._id,
            { deleted: false },
            { new: true },
          )) as VehicleDocument;
        }
        return raceConditionVehicle as VehicleDocument;
      }
      throw error;
    }
  }

  async findAll(
    paginationQuery: PaginationQueryDto,
    filterVehicleDto: FilterVehicleDto,
    showDeleted = false,
  ) {
    const { limit, offset } = paginationQuery;
    const { vehicle_type, search } = filterVehicleDto;
    const query: FilterQuery<VehicleDocument> = {};

    if (vehicle_type) {
      query.vehicle_type = vehicle_type;
    }

    if (search) {
      query.licence_plate = {
        $regex: search.replace(/\s+/g, ''),
        $options: 'i',
      };
    }

    const vehicles = await this.vehicleModel
      .find(query)
      .setOptions({ skipSoftDelete: showDeleted })
      .skip(offset ?? 0)
      .limit(limit ?? 10)
      .lean()
      .exec();

    const count = await this.vehicleModel
      .countDocuments(query)
      .setOptions({ skipSoftDelete: showDeleted });

    return {
      data: vehicles,
      count,
    };
  }

  async findOne(id: string, showDeleted = false) {
    const vehicle = await this.vehicleModel
      .findOne({ _id: id })
      .setOptions({ skipSoftDelete: showDeleted })
      .lean()
      .exec();

    if (!vehicle) {
      throw new NotFoundException(
        this.i18n.translate('vehicle.NOT_FOUND', { args: { id } }),
      );
    }

    return vehicle;
  }

  async update(
    id: string,
    updateVehicleDto: UpdateVehicleDto,
    user?: { userId?: string; _id?: string },
  ) {
    const existingVehicle = await this.vehicleModel
      .findOne({ _id: id })
      .setOptions({ skipSoftDelete: false })
      .lean()
      .exec();

    if (!existingVehicle) {
      throw new NotFoundException(
        this.i18n.translate('vehicle.NOT_FOUND', { args: { id } }),
      );
    }

    const updatedVehicle = await this.vehicleModel
      .findOneAndUpdate({ _id: id }, updateVehicleDto, {
        new: true,
        returnDocument: 'after',
      })
      .setOptions({ skipSoftDelete: false })
      .lean()
      .exec();

    if (!updatedVehicle) {
      throw new NotFoundException(
        this.i18n.translate('vehicle.NOT_FOUND', { args: { id } }),
      );
    }

    if (user) {
      setImmediate(() => {
        this.auditService
          .log({
            user: user.userId || user._id || 'SYSTEM',
            action: 'UPDATE',
            entity: 'Vehicle',
            entityId: id,
            oldValue: existingVehicle,
            newValue: updatedVehicle,
          })
          .catch((err) => this.logger.error('Audit log failed', err));
      });
    }

    this.eventsGateway.emitVehicleUpdated(updatedVehicle);
    return updatedVehicle;
  }

  async remove(id: string) {
    const deletedVehicle = await this.vehicleModel
      .findOneAndUpdate({ _id: id }, { deleted: true }, { new: true })
      .exec();

    if (!deletedVehicle) {
      throw new NotFoundException(
        this.i18n.translate('vehicle.NOT_FOUND', { args: { id } }),
      );
    }

    return deletedVehicle;
  }
}
