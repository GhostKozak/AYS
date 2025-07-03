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
    const {
      driver_phone_number,
      driver_full_name,
      company_name,
      licence_plate,
      vehicle_type,
      ...tripDetails
    } = createTripDto;

    // ADIM 1: Firma var mı? Yoksa oluştur.
    const company = await this.companiesService.findOrCreateByName(company_name);

    // ADIM 2: Şoför var mı? Yoksa oluştur.
    let driver = await this.driversService.findByPhone(driver_phone_number);
    if (!driver) {
      // Eğer şoför yoksa ve DTO'da ismi gönderilmediyse bu bir hatadır.
      if (!driver_full_name) {
        throw new BadRequestException(
          'Yeni şoför için "driver_full_name" alanı zorunludur.',
        );
      }
      // Yeni şoförü, bulunan veya oluşturulan şirkete bağlayarak yarat.
      driver = await this.driversService.create({
        full_name: driver_full_name,
        phone_number: driver_phone_number,
        company: company._id.toString(),
      });
    }

    // ADIM 3: Araç var mı? Yoksa oluştur.
    const vehicle = await this.vehiclesService.findOrCreateByPlate(
      licence_plate,
      vehicle_type,
    );

    // ADIM 4: Tüm parçalar hazır, şimdi seferi oluştur.
    const newTrip = new this.tripModel({
      ...tripDetails,
      driver: driver!._id,
      company: company._id,
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
