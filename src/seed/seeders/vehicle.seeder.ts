import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Vehicle } from '../../vehicles/schema/vehicles.schema';
import { VehicleType } from '../../vehicles/enums/vehicleTypes';

@Injectable()
export class VehicleSeeder {
  private readonly logger = new Logger(VehicleSeeder.name);

  constructor(
    @InjectModel(Vehicle.name) private vehicleModel: Model<Vehicle>,
  ) {}

  async clear() {
    await this.vehicleModel.deleteMany({});
  }

  async seed(companies: any[]): Promise<any[]> {
    const cities = ['34', '35', '06', '16', '07', '01', '26', '31', '41', '33'];
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const vehicles: any[] = [];

    for (let companyIndex = 0; companyIndex < companies.length; companyIndex++) {
      const company = companies[companyIndex];
      const vehicleCount = Math.floor(Math.random() * 11) + 5;

      for (let i = 0; i < vehicleCount; i++) {
        const city = cities[Math.floor(Math.random() * cities.length)];
        const letter1 = letters[Math.floor(Math.random() * letters.length)];
        const letter2 = letters[Math.floor(Math.random() * letters.length)];
        const letter3 = letters[Math.floor(Math.random() * letters.length)];
        const number = String(Math.floor(Math.random() * 900) + 100).padStart(3, '0');
        const licencePlate = `${city}${letter1}${letter2}${letter3}${number}`;
        const vehicleType = Math.random() < 0.7 ? VehicleType.TRUCK : VehicleType.VAN;

        vehicles.push({
          licence_plate: licencePlate,
          vehicle_type: vehicleType,
          company: company._id,
        });
      }
    }

    const createdVehicles: any[] = [];
    for (const vehicleData of vehicles) {
      const vehicle = await this.vehicleModel.create(vehicleData);
      createdVehicles.push(vehicle);
    }
    this.logger.log(`Vehicles seeded: ${createdVehicles.length}`);
    return createdVehicles;
  }
}
