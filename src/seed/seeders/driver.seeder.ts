import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Driver } from '../../drivers/schemas/driver.schema';

const COUNTRIES = [
  { name: 'TURKEY', value: '+90', code: 'TR' },
  { name: 'ALBANIA', value: '+355', code: 'AL' },
  { name: 'ARMENIA', value: '+374', code: 'AM' },
  { name: 'AZERBAIJAN', value: '+994', code: 'AZ' },
  { name: 'BULGARIA', value: '+359', code: 'BG' },
  { name: 'CYPRUS', value: '+357', code: 'CY' },
  { name: 'EGYPT', value: '+20', code: 'EG' },
  { name: 'FRANCE', value: '+33', code: 'FR' },
  { name: 'GEORGIA', value: '+995', code: 'GE' },
  { name: 'GERMANY', value: '+49', code: 'DE' },
  { name: 'GREECE', value: '+30', code: 'GR' },
  { name: 'IRAN', value: '+98', code: 'IR' },
  { name: 'IRAQ', value: '+964', code: 'IQ' },
  { name: 'ISRAEL', value: '+972', code: 'IL' },
  { name: 'JORDAN', value: '+962', code: 'JO' },
  { name: 'KAZAKHSTAN', value: '+7', code: 'KZ' },
  { name: 'KYRGYZSTAN', value: '+996', code: 'KG' },
  { name: 'LEBANON', value: '+961', code: 'LB' },
  { name: 'NETHERLANDS', value: '+31', code: 'NL' },
  { name: 'NORTH_MACEDONIA', value: '+389', code: 'MK' },
  { name: 'ROMANIA', value: '+40', code: 'RO' },
  { name: 'RUSSIA', value: '+7', code: 'RU' },
  { name: 'SERBIA', value: '+381', code: 'RS' },
  { name: 'SYRIA', value: '+963', code: 'SY' },
  { name: 'TAJIKISTAN', value: '+992', code: 'TJ' },
  { name: 'TURKMENISTAN', value: '+993', code: 'TM' },
  { name: 'UKRAINE', value: '+380', code: 'UA' },
  { name: 'UNITED_KINGDOM', value: '+44', code: 'GB' },
  { name: 'USA', value: '+1', code: 'US' },
  { name: 'UZBEKISTAN', value: '+998', code: 'UZ' },
];

const DRIVER_NAMES = [
  'Ahmet Yılmaz', 'Mehmet Kaya', 'Ali Demir', 'Ayşe Yıldız',
  'Fatma Çelik', 'Hasan Öztürk', 'Emine Şahin', 'Mustafa Aydın',
  'Zeynep Kara', 'Hüseyin Yıldırım', 'Elif Demir', 'İbrahim Çelik',
  'Sevgi Aydın', 'Osman Yıldız', 'Gülşen Kaya', 'Ramazan Öztürk',
  'Hatice Şahin', 'Yusuf Kara', 'Merve Yıldırım', 'Halil Demir',
  'Sultan Çelik', 'Recep Aydın', 'Nur Yıldız', 'Salih Kaya',
  'Zehra Öztürk', 'Kemal Şahin', 'Filiz Kara', 'İsmail Yıldırım',
  'Hacer Demir', 'Fatih Çelik', 'Dilek Aydın', 'Orhan Yıldız',
  'Gizem Kaya', 'Burak Öztürk', 'Esra Şahin',
];

@Injectable()
export class DriverSeeder {
  private readonly logger = new Logger(DriverSeeder.name);

  constructor(
    @InjectModel(Driver.name) private driverModel: Model<Driver>,
  ) {}

  async clear() {
    await this.driverModel.deleteMany({});
  }

  async seed(companies: any[]): Promise<any[]> {
    const drivers: any[] = [];
    let driverIndex = 0;

    for (let companyIndex = 0; companyIndex < companies.length; companyIndex++) {
      const company = companies[companyIndex];
      const driverCount = Math.floor(Math.random() * 16) + 15;

      for (let i = 0; i < driverCount && driverIndex < DRIVER_NAMES.length * 3; i++) {
        const isDeleted = company.deleted || Math.random() < 0.1;

        let country;
        if (Math.random() < 0.7) {
          country = COUNTRIES.find((c) => c.code === 'TR');
        } else {
          country = COUNTRIES[Math.floor(Math.random() * COUNTRIES.length)];
        }

        let randomDigits = '';
        if (country!.code === 'TR') {
          randomDigits =
            '5' +
            Math.floor(Math.random() * 1000000000)
              .toString()
              .padStart(9, '0');
        } else {
          randomDigits = Math.floor(
            1000000000 + Math.random() * 9000000000,
          ).toString();
        }

        drivers.push({
          full_name:
            DRIVER_NAMES[driverIndex % DRIVER_NAMES.length] +
            (driverIndex >= DRIVER_NAMES.length
              ? ` ${Math.floor(driverIndex / DRIVER_NAMES.length) + 1}`
              : ''),
          phone_number: `${country!.value}${randomDigits}`,
          company: company._id,
          ...(isDeleted && { deleted: true }),
        });
        driverIndex++;
      }
    }

    const createdDrivers: any[] = [];
    for (const driverData of drivers) {
      const driver = await this.driverModel.create(driverData);
      createdDrivers.push(driver);
    }
    this.logger.log(`Drivers seeded: ${createdDrivers.length}`);
    return createdDrivers;
  }
}
