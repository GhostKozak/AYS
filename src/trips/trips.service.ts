/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call */
import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { CreateTripDto } from './dto/create-trip.dto';
import { UpdateTripDto } from './dto/update-trip.dto';
import { Model, FilterQuery } from 'mongoose';
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
import { EventsGateway } from '../events/events.gateway';

@Injectable()
export class TripsService {
  constructor(
    @InjectModel(Trip.name) private tripModel: Model<TripDocument>,
    private readonly companiesService: CompaniesService,
    private readonly driversService: DriversService,
    private readonly vehiclesService: VehiclesService,
    private readonly i18n: I18nService,
    private readonly auditService: AuditService,
    private readonly eventsGateway: EventsGateway,
  ) {}

  async create(createTripDto: CreateTripDto): Promise<Trip> {
    // Normalize identifiers
    if (createTripDto.licence_plate) {
      createTripDto.licence_plate = createTripDto.licence_plate
        .replace(/\s+/g, '')
        .toUpperCase();
    }
    if (createTripDto.driver_phone_number) {
      createTripDto.driver_phone_number =
        createTripDto.driver_phone_number.replace(/[^\d+]/g, '');
    }

    let company: { _id: any } | null = null;
    if (createTripDto.company) {
      company = (await this.companiesService.findOne(
        createTripDto.company,
      )) as any;
    } else {
      if (!createTripDto.company_name) {
        throw new BadRequestException(
          this.i18n.translate('validation.COMPANY_NAME_REQUIRED'),
        );
      }
      company = (await this.companiesService.findOrCreateByName(
        createTripDto.company_name,
      )) as any;
    }

    let driver: { _id: any } | null = null;
    if (createTripDto.driver) {
      driver = (await this.driversService.findOne(createTripDto.driver)) as any;
    } else {
      if (!createTripDto.driver_phone_number) {
        throw new BadRequestException(
          this.i18n.translate('validation.DRIVER_PHONE_NUMBER_REQUIRED'),
        );
      }
      driver = (await this.driversService.findByPhone(
        createTripDto.driver_phone_number,
      )) as any;
      if (!driver) {
        if (!createTripDto.driver_full_name) {
          throw new BadRequestException(
            this.i18n.translate('validation.NEW_DRIVER_NAME_REQUIRED'),
          );
        }
        driver = (await this.driversService.create({
          full_name: createTripDto.driver_full_name,
          phone_number: createTripDto.driver_phone_number,
          company: company!._id.toString(),
        })) as any;
      }
    }

    let vehicle: { _id: any } | null = null;
    if (createTripDto.vehicle) {
      vehicle = (await this.vehiclesService.findOne(
        createTripDto.vehicle,
      )) as any;
    } else if (createTripDto.licence_plate) {
      vehicle = (await this.vehiclesService.findOrCreateByPlate(
        createTripDto.licence_plate,
        createTripDto.vehicle_type,
      )) as any;
    }

    const twoWeeksAgo = new Date();
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

    const existingTrip = await this.tripModel
      .findOne({
        vehicle: vehicle?._id,
        driver: driver?._id,
        company: company?._id,
        arrival_time: { $gte: twoWeeksAgo },
      })
      .sort({ arrival_time: -1 })
      .lean();

    if (existingTrip) {
      if (
        !existingTrip.is_trip_canceled &&
        existingTrip.unload_status !== UnloadStatus.UNLOADED
      ) {
        throw new ConflictException(
          this.i18n.translate('trip.CONFLICT_TRIP', {
            args: { unload_status: existingTrip.unload_status },
          }),
        );
      }
    }

    const newTrip = new this.tripModel({
      ...createTripDto,
      driver: driver?._id,
      company: company?._id,
      vehicle: vehicle?._id,
      // Set is_in_parking_lot based on initial status
      is_in_parking_lot: this.isVehicleInParkingLot(
        createTripDto.unload_status,
        createTripDto.is_trip_canceled,
      ),
    });

    const savedTrip = await newTrip.save();

    // Broadcast real-time event
    this.eventsGateway.emitTripCreated(savedTrip);

    return savedTrip;
  }

  async findAll(
    paginationQuery: PaginationQueryDto,
    filterTripDto: FilterTripDto,
    showDeleted = false,
  ) {
    const { limit, offset } = paginationQuery;
    const { companyId, driverId, vehicleId, unload_status, search } =
      filterTripDto;

    const query: FilterQuery<TripDocument> = {};

    if (companyId) query.company = companyId;
    if (driverId) query.driver = driverId;
    if (vehicleId) query.vehicle = vehicleId;
    if (unload_status) query.unload_status = unload_status;

    if (search) {
      const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const searchRegex = new RegExp(escapedSearch, 'i');

      const [matchingDrivers, matchingCompanies, matchingVehicles] =
        await Promise.all([
          this.driversService.findDriverByNameOrPhone(search),
          this.companiesService.searchByName(search),
          this.vehiclesService.findAll({ limit: 100 }, { search }),
        ]);

      const driverIds = matchingDrivers.data.map((d) => d._id);
      const companyIds = matchingCompanies.data.map((c) => c._id);
      const vehicleIds = matchingVehicles.data.map((v) => v._id);

      query.$or = [
        { driver: { $in: driverIds } },
        { company: { $in: companyIds } },
        { vehicle: { $in: vehicleIds } },
        { notes: searchRegex },
      ];
    }

    const trips = await this.tripModel
      .find(query)
      .setOptions({ skipSoftDelete: showDeleted })
      .select(
        'arrival_time departure_time unload_status is_in_parking_lot notes company driver vehicle',
      )
      .skip(offset ?? 0)
      .limit(limit ?? 10)
      .populate('driver', 'full_name phone_number')
      .populate('company', 'name')
      .populate('vehicle', 'licence_plate vehicle_type')
      .lean()
      .exec();

    const count = await this.tripModel
      .countDocuments(query)
      .setOptions({ skipSoftDelete: showDeleted });

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
      .lean()
      .exec();

    if (!trip) {
      throw new NotFoundException(
        this.i18n.translate('trip.NOT_FOUND', { args: { id } }),
      );
    }

    return trip;
  }

  async update(
    id: string,
    updateTripDto: UpdateTripDto,
    user?: { userId?: string; _id?: string },
  ): Promise<Trip> {
    const existingTrip = await this.tripModel
      .findOne({ _id: id })
      .setOptions({ skipSoftDelete: false })
      .populate('driver', 'full_name phone_number')
      .populate('company')
      .populate('vehicle')
      .lean()
      .exec();

    if (!existingTrip) {
      throw new NotFoundException(
        this.i18n.translate('trip.NOT_FOUND', { args: { id } }),
      );
    }

    const updatedTrip = await this.tripModel
      .findOneAndUpdate(
        { _id: id },
        {
          ...updateTripDto,
          // Update is_in_parking_lot based on status changes
          is_in_parking_lot: this.isVehicleInParkingLot(
            updateTripDto.unload_status || existingTrip.unload_status,
            updateTripDto.is_trip_canceled !== undefined
              ? updateTripDto.is_trip_canceled
              : existingTrip.is_trip_canceled,
          ),
        },
        { new: true, returnDocument: 'after', skipSoftDelete: false },
      )
      .setOptions({ skipSoftDelete: false })
      .populate('driver', 'full_name phone_number')
      .populate('company')
      .populate('vehicle')
      .lean()
      .exec();

    if (!updatedTrip) {
      throw new NotFoundException(
        this.i18n.translate('trip.NOT_FOUND', { args: { id } }),
      );
    }

    if (user) {
      setImmediate(() => {
        this.auditService
          .log({
            user: user.userId || user._id || 'SYSTEM',
            action: 'UPDATE',
            entity: 'Trip',
            entityId: id,
            oldValue: existingTrip,
            newValue: updatedTrip,
          })
          .catch((err) => console.error('Audit log failed', err));
      });
    }

    this.eventsGateway.emitTripUpdated(updatedTrip as unknown as Trip);

    return updatedTrip as unknown as Trip;
  }

  async remove(id: string): Promise<Trip> {
    const deletedTrip = await this.tripModel
      .findByIdAndUpdate(id, { deleted: true }, { new: true })
      .exec();

    if (!deletedTrip) {
      throw new NotFoundException(
        this.i18n.translate('trip.NOT_FOUND', { args: { id } }),
      );
    }

    // Broadcast real-time event
    this.eventsGateway.emitTripDeleted(id);

    return deletedTrip;
  }

  /**
   * Determine if a vehicle is still in the parking lot based on trip status and cancellation
   * Vehicle is in parking lot if:
   * - Trip is not canceled AND status is WAITING, UNLOADING, or UNLOADED
   * - Trip is canceled AND vehicle hasn't left yet
   */
  private isVehicleInParkingLot(
    unloadStatus: UnloadStatus | string | undefined,
    isTripCanceled?: boolean,
  ): boolean {
    if (isTripCanceled) {
      return true; // Canceled vehicles are still in parking lot until removed
    }

    if (!unloadStatus) {
      return true; // Default to true if no status provided (vehicle just arrived)
    }

    const parkingStatuses = [
      UnloadStatus.WAITING,
      UnloadStatus.UNLOADING,
      UnloadStatus.UNLOADED,
    ];
    return parkingStatuses.includes(unloadStatus as UnloadStatus);
  }
}
