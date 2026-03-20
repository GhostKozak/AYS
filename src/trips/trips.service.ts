import { Injectable, NotFoundException, BadRequestException, ConflictException, Inject } from '@nestjs/common';
import { CreateTripDto } from './dto/create-trip.dto';
import { UpdateTripDto } from './dto/update-trip.dto';
import { Model } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { Trip, TripDocument } from './schema/trips.schema';
import { CompaniesService } from '../companies/companies.service';
import { DriversService } from '../drivers/drivers.service';
import { VehiclesService } from '../vehicles/vehicles.service';
import { PaginationQueryDto } from 'src/common/dto/pagination-query.dto';
import { FilterTripDto } from './dto/filter-trip.dto';
import { I18nService } from 'nestjs-i18n';
import { UnloadStatus } from './enums/unloadStatus';
import { AuditService } from '../audit/audit.service';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';

@Injectable()
export class TripsService {
  constructor(
    @InjectModel(Trip.name) private tripModel: Model<TripDocument>,
    private readonly companiesService: CompaniesService,
    private readonly driversService: DriversService,
    private readonly vehiclesService: VehiclesService,
    private readonly i18n: I18nService,
    private readonly auditService: AuditService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  async create(createTripDto: CreateTripDto): Promise<Trip> {
    // Normalize identifiers
    if (createTripDto.licence_plate) {
      createTripDto.licence_plate = createTripDto.licence_plate.replace(/\s+/g, '').toUpperCase();
    }
    if (createTripDto.driver_phone_number) {
      createTripDto.driver_phone_number = createTripDto.driver_phone_number.replace(/[^\d+]/g, '');
    }

    let company;
    if (createTripDto.company) {
      company = await this.companiesService.findOne(createTripDto.company);
    } else {
      if (!createTripDto.company_name) {
        throw new BadRequestException(
          await this.i18n.translate('validation.COMPANY_NAME_REQUIRED'),
        );
      }
      company = await this.companiesService.findOrCreateByName(createTripDto.company_name);
    }

    let driver;
    if (createTripDto.driver) {
      driver = await this.driversService.findOne(createTripDto.driver);
    } else {
      if (!createTripDto.driver_phone_number) {
        throw new BadRequestException(
          await this.i18n.translate('validation.DRIVER_PHONE_NUMBER_REQUIRED'),
        );
      }
      driver = await this.driversService.findByPhone(createTripDto.driver_phone_number);
      if (!driver) {
        if (!createTripDto.driver_full_name) {
          throw new BadRequestException(
            await this.i18n.translate('validation.NEW_DRIVER_NAME_REQUIRED'),
          );
        }
        driver = await this.driversService.create({
          full_name: createTripDto.driver_full_name,
          phone_number: createTripDto.driver_phone_number,
          company: company._id.toString(),
        });
      }
    }

    let vehicle;
    if (createTripDto.vehicle) {
      vehicle = await this.vehiclesService.findOne(createTripDto.vehicle);
    } else if (createTripDto.licence_plate) {
      vehicle = await this.vehiclesService.findOrCreateByPlate(
        createTripDto.licence_plate,
        createTripDto.vehicle_type,
      );
    }

    const twoWeeksAgo = new Date();
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

    const existingTrip = await this.tripModel.findOne({
      vehicle: vehicle._id,
      driver: driver._id,
      company: company._id,
      arrival_time: { $gte: twoWeeksAgo }
    }).sort({ arrival_time: -1 });

    if (existingTrip) {
      if (
        !existingTrip.is_trip_canceled &&
        existingTrip.unload_status !== UnloadStatus.UNLOADED
      ) {
        throw new ConflictException(
          await this.i18n.translate('trip.CONFLICT_TRIP', { args: { unload_status: existingTrip.unload_status } }),
        );
      }
    }

    const newTrip = new this.tripModel({
      ...createTripDto, 
      driver: driver._id,
      company: company._id,
      vehicle: vehicle._id,
    });

    const savedTrip = await newTrip.save();
    await this.cacheManager.clear();
    return savedTrip;
  }

  async findAll(paginationQuery: PaginationQueryDto, filterTripDto: FilterTripDto, showDeleted = false) {
    const { limit, offset } = paginationQuery;
    const { companyId, driverId, vehicleId, unload_status, search } = filterTripDto;

    const query: any = {};

    if (companyId) query.company = companyId;
    if (driverId) query.driver = driverId;
    if (vehicleId) query.vehicle = vehicleId;
    if (unload_status) query.unload_status = unload_status;

    if (search) {
      const searchRegex = new RegExp(search, 'i');
      query.$or = [
        { 'driver.full_name': searchRegex },
        { 'company.name': searchRegex },
        { 'vehicle.licence_plate': searchRegex },
        { notes: searchRegex },
      ];
    }

    const trips = await this.tripModel
      .find(query)
      .setOptions({ skipSoftDelete: showDeleted })
      .skip(offset ?? 0)
      .limit(limit ?? 10)
      .populate('driver', 'full_name phone_number')
      .populate('company', 'name')
      .populate('vehicle', 'licence_plate vehicle_type')
      .exec();

    const count = await this.tripModel.countDocuments(query).setOptions({ skipSoftDelete: showDeleted });

    return {
      data: trips,
      count,
    };
  }

  async findOne(id: string, showDeleted = false): Promise<Trip> {
    const trip = await this.tripModel
      .findOne({ _id: id })
      .setOptions({ skipSoftDelete: showDeleted })
      .populate('driver', 'full_name phone_number')
      .populate('company')
      .populate('vehicle')
      .exec();

    if (!trip) {
      throw new NotFoundException(
        await this.i18n.translate('trip.NOT_FOUND', { args: { id } })
      );
    }

    return trip;
  }

  async update(id: string, updateTripDto: UpdateTripDto, user?: any): Promise<Trip> {
    const oldValue = await this.findOne(id);

    const updatedTrip = await this.tripModel.findByIdAndUpdate(
      id,
      updateTripDto,
      { new: true },
    ).setOptions({ skipSoftDelete: false }).exec();
    
    if (!updatedTrip) {
      throw new NotFoundException(
        await this.i18n.translate('trip.NOT_FOUND', { args: { id } })
      );
    }

    if (user) {
      this.auditService.log({
        user: user._id || user.id || user.userId,
        action: 'UPDATE',
        entity: 'Trip',
        entityId: id,
        oldValue,
        newValue: updatedTrip,
      }).catch(err => console.error('Audit log failed', err));
    }

    await this.cacheManager.clear();
    return updatedTrip;
  }

  async remove(id: string): Promise<Trip> {

    const deletedTrip = await this.tripModel.findByIdAndUpdate(
      id,
      { deleted: true },
      { new: true },
    ).exec();

    if (!deletedTrip) {
      throw new NotFoundException(
        await this.i18n.translate('trip.NOT_FOUND', { args: { id } })
      );
    }

    await this.cacheManager.clear();
    return deletedTrip;
  }
}
