import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { CreateTripDto } from './dto/create-trip.dto';
import { UpdateTripDto } from './dto/update-trip.dto';
import { Model } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { Trip, TripDocument } from './schema/trips.schema';
import { CompaniesService } from '../companies/companies.service';
import { DriversService } from '../drivers/drivers.service';
import { VehiclesService } from '../vehicles/vehicles.service';

@Injectable()
export class TripsService {
  constructor(
    @InjectModel(Trip.name) private tripModel: Model<TripDocument>,
    private readonly companiesService: CompaniesService,
    private readonly driversService: DriversService,
    private readonly vehiclesService: VehiclesService,
  ) {}

  async create(createTripDto: CreateTripDto): Promise<Trip> {
    const { driver: driverId, company: companyId, licence_plate, vehicle_type, ...tripDetails } = createTripDto;

    await this.driversService.findOne(driverId);
    await this.companiesService.findOne(companyId);

    const vehicle = await this.vehiclesService.findOrCreateByPlate( // TODO: Vehicles service icinde findOrCreateByPlate metodu olustur
      licence_plate,
      vehicle_type,
    );
    if (!vehicle) {
        throw new BadRequestException('Araç oluşturulamadı veya bulunamadı.');
    }

    const newTrip = new this.tripModel({
      ...tripDetails,
      driver: driverId,
      company: companyId,
      vehicle: vehicle._id,
    });

    return newTrip.save();
  }

  async findAll(): Promise<Trip[]> {
    return this.tripModel
      .find({ deleted: false })
      .populate('driver', 'full_name')
      .populate('company', 'name')
      .populate('vehicle', 'licence_plate type')
      .exec();
  }

  async findOne(id: string): Promise<Trip> {
    const trip = await this.tripModel
      .findById(id)
      .populate('driver', 'full_name phone_number')
      .populate('company')
      .populate('vehicle')
      .exec();

    if (!trip || trip.deleted) {
      throw new NotFoundException(`Trip with ID "${id}" not found`);
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
      throw new NotFoundException(`Trip with ID "${id}" not found`);
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
      throw new NotFoundException(`Trip with ID "${id}" not found`);
    }

    return deletedTrip;
  }
}
