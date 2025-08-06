import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
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

@Injectable()
export class TripsService {
  constructor(
    @InjectModel(Trip.name) private tripModel: Model<TripDocument>,
    private readonly companiesService: CompaniesService,
    private readonly driversService: DriversService,
    private readonly vehiclesService: VehiclesService,
    private readonly i18n: I18nService,
  ) {}

  async create(createTripDto: CreateTripDto): Promise<Trip> {
    const {
      driver_phone_number,
      driver_full_name,
      company_name,
      licence_plate,
      vehicle_type,
      ...tripDetails
    } = createTripDto;

    const company = await this.companiesService.findOrCreateByName(company_name);

    let driver = await this.driversService.findByPhone(driver_phone_number);
    if (!driver) {
      if (!driver_full_name) {
        throw new BadRequestException(
          await this.i18n.translate('validation.NEW_DRIVER_NAME_REQUIRED'),
        );
      }

      driver = await this.driversService.create({
        full_name: driver_full_name,
        phone_number: driver_phone_number,
        company: company._id.toString(),
      });
    }

    const vehicle = await this.vehiclesService.findOrCreateByPlate(
      licence_plate,
      vehicle_type,
    );

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
      ...tripDetails,
      driver: driver!._id,
      company: company._id,
      vehicle: vehicle._id,
    });

    return newTrip.save();
  }

  async findAll(paginationQuery: PaginationQueryDto, filterTripDto: FilterTripDto) {
    const { limit, offset } = paginationQuery;
    const { companyId, driverId, vehicleId, unload_status, search } = filterTripDto;

    const query: any = { deleted: false };

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
      .skip(offset ?? 0)
      .limit(limit ?? 10)
      .populate('driver', 'full_name')
      .populate('company', 'name')
      .populate('vehicle', 'licence_plate type')
      .exec();

    const count = await this.tripModel.countDocuments(query);

    return {
      data: trips,
      count,
    };
  }

  async findOne(id: string): Promise<Trip> {
    const trip = await this.tripModel
      .findById(id)
      .populate('driver', 'full_name phone_number')
      .populate('company')
      .populate('vehicle')
      .exec();

    if (!trip || trip.deleted) {
      throw new NotFoundException(
        await this.i18n.translate('trip.NOT_FOUND', { args: { id } })
      );
    }

    return trip;
  }

  async update(id: string, updateTripDto: UpdateTripDto): Promise<Trip> {
    await this.findOne(id);

    const updatedTrip = await this.tripModel.findByIdAndUpdate(
      id,
      updateTripDto,
      { new: true },
    ).exec();
    
    if (!updatedTrip) {
      throw new NotFoundException(
        await this.i18n.translate('trip.NOT_FOUND', { args: { id } })
      );
    }

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

    return deletedTrip;
  }
}
