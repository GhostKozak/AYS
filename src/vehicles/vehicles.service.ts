import { Injectable, Logger } from '@nestjs/common';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';
import { InjectModel } from '@nestjs/mongoose';
import { Vehicle, VehicleDocument } from './schema/vehicles.schema';
import { Model } from 'mongoose';
import { VehicleType } from './enums/vehicleTypes';
import { PaginationQueryDto } from 'src/common/dto/pagination-query.dto';
import { FilterVehicleDto } from './dto/filter-vehicle.dto';

@Injectable()
export class VehiclesService {
  private readonly logger = new Logger(VehiclesService.name);

  constructor(
    @InjectModel(Vehicle.name) private vehicleModel: Model<VehicleDocument>
  ) {}

  create(createVehicleDto: CreateVehicleDto) {
    const normalizedPlate = createVehicleDto.licence_plate.replace(/\s+/g, '').toUpperCase();

    const vehicleToCreate = {
        ...createVehicleDto,
        licence_plate: normalizedPlate,
    };
    
    const createdVehicle = new this.vehicleModel(vehicleToCreate);
    return createdVehicle.save();
  }

  /**
   * Verilen plakaya sahip bir araç bulur. Eğer bulamazsa,
   * yeni bir tane oluşturur ve onu döndürür.
   * Bu metod, TripsService tarafından akıcı bir kullanıcı deneyimi için kullanılır.
   * @param licencePlate Aranacak veya oluşturulacak plaka
   * @param type Eğer araç yeni oluşturulacaksa kullanılacak tip
   * @returns {Promise<VehicleDocument>} Bulunan veya yeni oluşturulan araç dokümanı
   */
  async findOrCreateByPlate(
    licencePlate: string,
    type?: VehicleType,
  ): Promise<VehicleDocument> {
    
    // Plakayı arama ve kaydetme için standart bir formata getiriyoruz
    // Örnek: " 34 ABC 123 " -> "34ABC123"
    const normalizedPlate = licencePlate.replace(/\s+/g, '').toUpperCase();

    // 1. Bu normalize plakaya sahip bir araç var mı diye ara
    const existingVehicle = await this.vehicleModel.findOne({ licence_plate: normalizedPlate }).exec();

    // 2. Eğer araç zaten varsa, onu geri döndür
    if (existingVehicle) {
      this.logger.log(`Mevcut araç bulundu: ${normalizedPlate}`);
      return existingVehicle;
    }

    // 3. Eğer araç yoksa, yeni bir tane oluştur
    this.logger.log(`Yeni araç oluşturuluyor: ${normalizedPlate}, Tipi: ${type || VehicleType.TRUCK}`);
    const newVehicle = new this.vehicleModel({
      licence_plate: normalizedPlate,
      // Eğer DTO'dan bir tip gelmediyse, varsayılan olarak TIR ata
      type: type || VehicleType.TRUCK,
    });

    return newVehicle.save();
  }

  async findAll(paginationQuery: PaginationQueryDto, filterVehicleDto: FilterVehicleDto) {
    const { limit, offset } = paginationQuery;
    const { vehicle_type, search } = filterVehicleDto;
    const query: any = { deleted: false };

    if (vehicle_type) {
      query.vehicle_type = vehicle_type;
    }

    if (search) {
      query.licence_plate = { $regex: search.replace(/\s+/g, ''), $options: 'i' };
    }

    const vehicles = await this.vehicleModel
      .find(query)
      .skip(offset ?? 0)
      .limit(limit ?? 10)
      .exec();

    const count = await this.vehicleModel.countDocuments(query);

    return {
      data: vehicles,
      count,
    };
  }

  async findOne(id: string) {
    return await this.vehicleModel.findById(id).exec()
  }

  async update(id: string, updateVehicleDto: UpdateVehicleDto) {
    return await this.vehicleModel.findByIdAndUpdate(
      id,
      updateVehicleDto,
      { new: true }
    ).exec()
  }

  async remove(id: string) {
    return await this.vehicleModel.findByIdAndUpdate(
      id,
      { deleted: true },
      { new: true }
    ).exec()
  }
}
