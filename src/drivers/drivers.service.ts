import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { CreateDriverDto } from './dto/create-driver.dto';
import { UpdateDriverDto } from './dto/update-driver.dto';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Driver, DriverDocument } from './schemas/driver.schema';
import { CompaniesService } from '../companies/companies.service';
import { PaginationQueryDto } from 'src/common/dto/pagination-query.dto';
import { FilterDriverDto } from './dto/filter-driver.dto';
import { I18nService } from 'nestjs-i18n';

@Injectable()
export class DriversService {

  constructor(
    @InjectModel(Driver.name) private driverModel: Model<DriverDocument>,
    private readonly companiesService: CompaniesService,
    private readonly i18n: I18nService
  ) {}

  async findByPhone(phone: string): Promise<DriverDocument | null> {
    return this.driverModel.findOne({ phone_number: phone, deleted: false }).populate('company').exec();
  }

  async findDriverByNameOrPhone(query: string): Promise<{data:DriverDocument[]; count: number | null}> {
    const queryPayload: any = { 
      deleted: false 
    };

    const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    queryPayload.$or = [
      { full_name: new RegExp(escapedQuery, 'i') },
      { phone_number: new RegExp(escapedQuery, 'i') }
    ];

    const drivers = await this.driverModel.find(queryPayload).populate('company').exec();
    const count = await this.driverModel.countDocuments(queryPayload);

    return {
      data: drivers,
      count,
    };
  }

  async create(createDriverDto: CreateDriverDto): Promise<DriverDocument> {
    const existingDriver = await this.driverModel.findOne({
      phone_number: createDriverDto.phone_number
    }).exec();

    if (existingDriver) {
      if (existingDriver.deleted) {
        existingDriver.deleted = false;
        return existingDriver.save();
      }

      throw new ConflictException(
        await this.i18n.translate('database.DUPLICATE_KEY', {
          args: { field: 'phone_number', value: createDriverDto.phone_number }
        })
      )
    }

    await this.companiesService.findOne(createDriverDto.company);
    
    const newDriver = new this.driverModel(createDriverDto);
    return newDriver.save();
  }

  async findAll(paginationQuery: PaginationQueryDto, filterDriverDto: FilterDriverDto) {
    const { limit, offset } = paginationQuery;
    const { companyId, search } = filterDriverDto;
    const query: any = { deleted: false };

    if (companyId) {
      query.company = companyId;
    }

    if (search) {
      const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      query.$or = [
        { full_name: { $regex: escapedSearch, $options: 'i' } },
        { phone_number: { $regex: escapedSearch, $options: 'i' } }
      ];
    }

    const drivers = await this.driverModel
      .find(query)
      .skip(offset ?? 0)
      .limit(limit ?? 10)
      .populate('company', 'name')
      .exec();

    const count = await this.driverModel.countDocuments(query);

    return {
      data: drivers,
      count,
    };
  }

  async findOne(id: string): Promise<DriverDocument> {
    const driver = await this.driverModel.findOne({ _id: id, deleted: false }).exec();

    if (!driver) {
      throw new NotFoundException(
        await this.i18n.translate('driver.NOT_FOUND', { args: { id } }),
      );
    }

    return driver;
  }

  async update(id: string, updateDriverDto: UpdateDriverDto): Promise<DriverDocument> {
    const updatedDriver = await this.driverModel.findOneAndUpdate(
      { _id: id, deleted: false },
      updateDriverDto,
      { new: true }
    ).exec();

    if (!updatedDriver) {
      throw new NotFoundException(
        await this.i18n.translate('driver.NOT_FOUND', { args: { id } }),
      );
    }

    return updatedDriver;
  }

  async remove(id: string): Promise<Driver> {
    const deletedDriver = await this.driverModel.findOneAndUpdate(
      { _id: id, deleted: false },
      { deleted: true },
      { new: true }
    ).exec();

    if (!deletedDriver) {
      throw new NotFoundException(
        await this.i18n.translate('driver.NOT_FOUND', { args: { id } }),
      );
    }

    return deletedDriver;
  }
}
