import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateDriverDto } from './dto/create-driver.dto';
import { UpdateDriverDto } from './dto/update-driver.dto';
import { InjectModel } from '@nestjs/mongoose';
import { Model, FilterQuery } from 'mongoose';
import { Driver, DriverDocument } from './schemas/driver.schema';
import { CompaniesService } from '../companies/companies.service';
import { PaginationQueryDto } from 'src/common/dto/pagination-query.dto';
import { FilterDriverDto } from './dto/filter-driver.dto';
import { I18nService } from 'nestjs-i18n';
import { AuditService } from '../audit/audit.service';
import { EventsGateway } from '../events/events.gateway';

@Injectable()
export class DriversService {
  constructor(
    @InjectModel(Driver.name) private driverModel: Model<DriverDocument>,
    private readonly companiesService: CompaniesService,
    private readonly i18n: I18nService,
    private readonly auditService: AuditService,
    private readonly eventsGateway: EventsGateway,
  ) {}

  async findByPhone(phone: string): Promise<DriverDocument | null> {
    const normalizedPhone = phone.replace(/[^\d+]/g, '');
    const driver = await this.driverModel
      .findOne({ phone_number: normalizedPhone })
      .populate('company')
      .lean()
      .exec();

    if (driver && driver.deleted) {
      return (await this.driverModel
        .findByIdAndUpdate(driver._id, { deleted: false }, { new: true })
        .populate('company')) as DriverDocument;
    }

    return driver;
  }

  async findDriverByNameOrPhone(
    query: string,
  ): Promise<{ data: DriverDocument[]; count: number | null }> {
    const queryPayload: FilterQuery<DriverDocument> = {};

    const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const normalizedQuery = query.replace(/[^\d+]/g, '');
    const escapedNormalizedQuery = normalizedQuery.replace(
      /[.*+?^${}()|[\]\\]/g,
      '\\$&',
    );

    queryPayload.$or = [
      { full_name: new RegExp(escapedQuery, 'i') },
      { phone_number: new RegExp(escapedNormalizedQuery, 'i') },
    ];

    const drivers = await this.driverModel
      .find(queryPayload)
      .populate('company')
      .lean()
      .exec();
    const count = await this.driverModel.countDocuments(queryPayload);

    return {
      data: drivers,
      count,
    };
  }

  async create(createDriverDto: CreateDriverDto): Promise<DriverDocument> {
    const normalizedPhone = createDriverDto.phone_number?.replace(
      /[^\d+]/g,
      '',
    );
    const existingDriver = normalizedPhone
      ? await this.driverModel
          .findOne({
            phone_number: normalizedPhone,
          })
          .lean()
          .exec()
      : null;

    if (existingDriver) {
      if (existingDriver.deleted) {
        const savedDriver = await this.driverModel.findByIdAndUpdate(
          existingDriver._id,
          { deleted: false },
          { new: true },
        );
        return savedDriver as DriverDocument;
      }

      throw new ConflictException(
        this.i18n.translate('database.DUPLICATE_KEY', {
          args: { field: 'phone_number', value: createDriverDto.phone_number },
        }),
      );
    }

    await this.companiesService.findOne(createDriverDto.company);

    const newDriver = new this.driverModel({
      ...createDriverDto,
      phone_number: normalizedPhone,
    });
    const savedDriver = await newDriver.save();
    return savedDriver;
  }

  async findAll(
    paginationQuery: PaginationQueryDto,
    filterDriverDto: FilterDriverDto,
    showDeleted = false,
  ) {
    const { limit, offset } = paginationQuery;
    const { companyId, search } = filterDriverDto;
    const query: FilterQuery<DriverDocument> = {};

    if (companyId) {
      query.company = companyId;
    }

    if (search) {
      const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const normalizedSearch = search.replace(/[^\d+]/g, '');
      const escapedNormalizedSearch = normalizedSearch.replace(
        /[.*+?^${}()|[\]\\]/g,
        '\\$&',
      );

      query.$or = [
        { full_name: { $regex: escapedSearch, $options: 'i' } },
        { phone_number: { $regex: escapedNormalizedSearch, $options: 'i' } },
      ];
    }

    const drivers = await this.driverModel
      .find(query)
      .setOptions({ skipSoftDelete: showDeleted })
      .skip(offset ?? 0)
      .limit(limit ?? 10)
      .populate('company', 'name')
      .lean()
      .exec();

    const count = await this.driverModel
      .countDocuments(query)
      .setOptions({ skipSoftDelete: showDeleted });

    return {
      data: drivers,
      count,
    };
  }

  async findOne(id: string, showDeleted = false): Promise<DriverDocument> {
    const driver = await this.driverModel
      .findOne({ _id: id })
      .setOptions({ skipSoftDelete: showDeleted })
      .lean()
      .exec();

    if (!driver) {
      throw new NotFoundException(
        this.i18n.translate('driver.NOT_FOUND', { args: { id } }),
      );
    }

    return driver;
  }

  async update(
    id: string,
    updateDriverDto: UpdateDriverDto,
    user?: { userId?: string; _id?: string },
  ): Promise<DriverDocument> {
    if (updateDriverDto.phone_number) {
      updateDriverDto.phone_number = updateDriverDto.phone_number.replace(
        /[^\d+]/g,
        '',
      );
    }

    const existingDriver = await this.driverModel
      .findOne({ _id: id })
      .setOptions({ skipSoftDelete: false })
      .lean()
      .exec();

    if (!existingDriver) {
      throw new NotFoundException(
        this.i18n.translate('driver.NOT_FOUND', { args: { id } }),
      );
    }

    const updatedDriver = await this.driverModel
      .findOneAndUpdate({ _id: id }, updateDriverDto, {
        new: true,
        returnDocument: 'after',
      })
      .setOptions({ skipSoftDelete: false })
      .lean()
      .exec();

    if (!updatedDriver) {
      throw new NotFoundException(
        this.i18n.translate('driver.NOT_FOUND', { args: { id } }),
      );
    }

    if (user) {
      setImmediate(() => {
        this.auditService
          .log({
            user: user.userId || user._id || 'SYSTEM',
            action: 'UPDATE',
            entity: 'Driver',
            entityId: id,
            oldValue: existingDriver,
            newValue: updatedDriver,
          })
          .catch((err) => console.error('Audit log failed', err));
      });
    }

    this.eventsGateway.emitDriverUpdated(updatedDriver);
    return updatedDriver;
  }

  async remove(id: string): Promise<Driver> {
    const deletedDriver = await this.driverModel
      .findOneAndUpdate({ _id: id }, { deleted: true }, { new: true })
      .exec();

    if (!deletedDriver) {
      throw new NotFoundException(
        this.i18n.translate('driver.NOT_FOUND', { args: { id } }),
      );
    }

    return deletedDriver;
  }
}
