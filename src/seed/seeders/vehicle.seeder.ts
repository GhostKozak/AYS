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
    const europeanPrefixes = ['BG', 'NL', 'PL', 'RO', 'GR', 'MK', 'RS', 'HU', 'SK', 'HR'];
    const vehicles: any[] = [];

    const randomFrom = <T>(items: T[]): T => items[Math.floor(Math.random() * items.length)];
    const randomLetter = () => letters[Math.floor(Math.random() * letters.length)];
    const randomNumber = (length: number) =>
      String(Math.floor(Math.random() * Math.pow(10, length))).padStart(length, '0');

    const generateForeignPlate = () => {
      const country = randomFrom(europeanPrefixes);
      switch (country) {
        case 'BG':
          // Bulgarian format: CA 1234 AB or C 1234 AB
          return `${randomLetter()}${randomLetter()} ${randomNumber(4)} ${randomLetter()}${randomLetter()}`;
        case 'NL':
          // Dutch format examples: AB-12-CD, 12-AB-34, AB-123-CD
          const nlFormats = [
            () => `${randomLetter()}${randomLetter()}-${randomNumber(2)}-${randomLetter()}${randomLetter()}`,
            () => `${randomNumber(2)}-${randomLetter()}${randomLetter()}-${randomNumber(2)}`,
            () => `${randomLetter()}${randomLetter()}-${randomNumber(3)}-${randomLetter()}${randomLetter()}`,
          ];
          return randomFrom(nlFormats)();
        case 'PL':
          // Polish format: KR 12345, PO 12345, Warszawa-like example
          const plArea = randomFrom(['KR', 'PO', 'WA', 'DW', 'LU']);
          return `${plArea} ${randomNumber(5)}`;
        case 'RO':
          return `${randomLetter()}${randomLetter()}-${randomNumber(2)}-${randomLetter()}${randomLetter()}${randomLetter()}`;
        case 'GR':
          return `${randomLetter()}${randomLetter()} ${randomNumber(4)}`;
        case 'MK':
          return `${randomLetter()}${randomLetter()}-${randomNumber(4)}`;
        case 'RS':
          return `${randomLetter()}${randomLetter()} ${randomNumber(3)} ${randomLetter()}${randomLetter()}`;
        case 'HU':
          return `${randomLetter()}${randomLetter()}-${randomNumber(3)}-${randomLetter()}${randomLetter()}`;
        case 'SK':
          return `${randomNumber(2)} ${randomLetter()}${randomLetter()} ${randomNumber(3)}`;
        case 'HR':
          return `${randomLetter()}${randomNumber(4)}-${randomLetter()}`;
        default:
          return `${randomLetter()}${randomLetter()}-${randomNumber(3)}-${randomLetter()}${randomLetter()}`;
      }
    };

    for (
      let companyIndex = 0;
      companyIndex < companies.length;
      companyIndex++
    ) {
      const company = companies[companyIndex];
      const vehicleCount = Math.floor(Math.random() * 11) + 5;

      for (let i = 0; i < vehicleCount; i++) {
        const useForeign = Math.random() < 0.4;
        const licencePlate = useForeign
          ? generateForeignPlate()
          : `${randomFrom(cities)}${randomLetter()}${randomLetter()}${randomLetter()}${randomNumber(3)}`;
        const vehicleType =
          Math.random() < 0.7 ? VehicleType.TRUCK : VehicleType.VAN;

        vehicles.push({
          licence_plate: licencePlate,
          vehicle_type: vehicleType,
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
