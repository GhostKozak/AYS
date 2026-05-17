import { BadRequestException, Injectable } from '@nestjs/common';
import { I18nService } from 'nestjs-i18n';
import { CompaniesService } from '../companies/companies.service';
import { DriversService } from '../drivers/drivers.service';
import { VehiclesService } from '../vehicles/vehicles.service';
import { CreateTripDto } from './dto/create-trip.dto';

/**
 * TripsService.create() içindeki cross-domain varlık çözümleme (resolve)
 * mantığını TripsService'den ayırır.
 *
 * Sorumlulukları:
 * - Şirket: ID ile bul veya isim ile bul/oluştur
 * - Sürücü: ID ile bul, telefon ile bul veya yeni oluştur
 * - Araç: ID ile bul veya plaka ile bul/oluştur
 */
@Injectable()
export class TripEntityResolverService {
  constructor(
    private readonly companiesService: CompaniesService,
    private readonly driversService: DriversService,
    private readonly vehiclesService: VehiclesService,
    private readonly i18n: I18nService,
  ) {}

  async resolveCompany(
    dto: CreateTripDto,
  ): Promise<{ _id: any }> {
    if (dto.company) {
      return (await this.companiesService.findOne(dto.company)) as any;
    }

    if (!dto.company_name) {
      throw new BadRequestException(
        this.i18n.translate('validation.COMPANY_NAME_REQUIRED'),
      );
    }

    return (await this.companiesService.findOrCreateByName(
      dto.company_name,
    )) as any;
  }

  async resolveDriver(
    dto: CreateTripDto,
    companyId: any,
  ): Promise<{ _id: any }> {
    if (dto.driver) {
      return (await this.driversService.findOne(dto.driver)) as any;
    }

    if (!dto.driver_phone_number) {
      throw new BadRequestException(
        this.i18n.translate('validation.DRIVER_PHONE_NUMBER_REQUIRED'),
      );
    }

    const existing = await this.driversService.findByPhone(
      dto.driver_phone_number,
    );
    if (existing) return existing as any;

    if (!dto.driver_full_name) {
      throw new BadRequestException(
        this.i18n.translate('validation.NEW_DRIVER_NAME_REQUIRED'),
      );
    }

    return (await this.driversService.create({
      full_name: dto.driver_full_name,
      phone_number: dto.driver_phone_number,
      company: companyId.toString(),
    })) as any;
  }

  async resolveVehicle(
    dto: CreateTripDto,
  ): Promise<{ _id: any } | null> {
    if (dto.vehicle) {
      return (await this.vehiclesService.findOne(dto.vehicle)) as any;
    }

    if (dto.licence_plate) {
      return (await this.vehiclesService.findOrCreateByPlate(
        dto.licence_plate,
        dto.vehicle_type,
      )) as any;
    }

    return null;
  }
}
