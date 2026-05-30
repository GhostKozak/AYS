import {
  ConflictException,
  Injectable,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';
import { InjectModel } from '@nestjs/mongoose';
import { Model, FilterQuery } from 'mongoose';
import { Company, CompanyDocument } from './schemas/company.schema';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { FilterCompanyDto } from './dto/filter-company.dto';
import { I18nService } from 'nestjs-i18n';
import { AuditService } from '../audit/audit.service';
import { EventsGateway } from '../events/events.gateway';
import { SearchCacheRegistryService } from '../search/search-cache-registry.service';

@Injectable()
export class CompaniesService {
  private readonly logger = new Logger(CompaniesService.name);
  constructor(
    @InjectModel(Company.name) private companyModel: Model<CompanyDocument>,
    private readonly i18n: I18nService,
    private readonly auditService: AuditService,
    private readonly eventsGateway: EventsGateway,
    private readonly searchCacheRegistry: SearchCacheRegistryService,
  ) {}

  async searchByName(name: string) {
    const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const query = {
      name: new RegExp(escapedName, 'i'),
      deleted: false,
    };

    const [companies, count] = await Promise.all([
      this.companyModel.find(query).limit(100).lean().exec(),
      this.companyModel.countDocuments(query).exec(),
    ]);

    return {
      data: companies,
      count,
    };
  }

  async findOrCreateByName(name: string): Promise<CompanyDocument> {
    const existingCompany = await this.companyModel
      .findOne({ name })
      .lean()
      .exec();

    if (existingCompany) {
      if (existingCompany.deleted) {
        const restored = await this.companyModel
          .findOneAndUpdate(
            { _id: existingCompany._id },
            { deleted: false },
            { new: true },
          )
          .exec();
        void this.searchCacheRegistry.invalidateSearchCache();
        return restored as CompanyDocument;
      }
      return existingCompany as CompanyDocument;
    }

    try {
      const newCompany = new this.companyModel({ name });
      return await newCompany.save();
    } catch (error: unknown) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      if ((error as any).code === 11000) {
        const raceConditionCompany = await this.companyModel
          .findOne({ name })
          .lean()
          .exec();
        if (!raceConditionCompany) {
          throw error;
        }
        if (raceConditionCompany.deleted) {
          return (await this.companyModel
            .findOneAndUpdate(
              { _id: raceConditionCompany._id },
              { deleted: false },
              { new: true },
            )
            .exec()) as CompanyDocument;
        }
        return raceConditionCompany as CompanyDocument;
      }
      throw error;
    }
  }

  async create(createCompanyDto: CreateCompanyDto): Promise<Company> {
    const existingCompany = await this.companyModel
      .findOne({
        name: createCompanyDto.name,
      })
      .lean()
      .exec();

    if (existingCompany) {
      if (existingCompany.deleted) {
        const savedCompany = await this.companyModel
          .findOneAndUpdate(
            { _id: existingCompany._id },
            { deleted: false },
            { new: true },
          )
          .exec();
        void this.searchCacheRegistry.invalidateSearchCache();
        return savedCompany as Company;
      }
    }

    const newCompany = new this.companyModel(createCompanyDto);
    const savedCompany = await newCompany.save();
    void this.searchCacheRegistry.invalidateSearchCache();
    return savedCompany;
  }

  async findAll(
    paginationQuery: PaginationQueryDto,
    filterCompanyDto: FilterCompanyDto,
    showDeleted = false,
  ) {
    const { limit, offset } = paginationQuery;
    const { search } = filterCompanyDto;
    const query: FilterQuery<CompanyDocument> = {};

    if (search) {
      const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      query.name = { $regex: escapedSearch, $options: 'i' };
    }

    const [companies, count] = await Promise.all([
      this.companyModel
        .find(query)
        .setOptions({ skipSoftDelete: showDeleted })
        .skip(offset ?? 0)
        .limit(limit ?? 10)
        .lean()
        .exec(),
      this.companyModel
        .countDocuments(query)
        .setOptions({ skipSoftDelete: showDeleted })
        .exec(),
    ]);

    return {
      data: companies,
      count,
    };
  }

  async findOne(id: string, showDeleted = false): Promise<Company> {
    const company = await this.companyModel
      .findOne({ _id: id })
      .setOptions({ skipSoftDelete: showDeleted })
      .lean()
      .exec();

    if (!company) {
      throw new NotFoundException(
        this.i18n.translate('company.NOT_FOUND', { args: { id } }),
      );
    }

    return company;
  }

  async update(
    id: string,
    updateCompanyDto: UpdateCompanyDto,
    user?: { userId?: string; _id?: string },
  ): Promise<Company> {
    const existingCompany = await this.companyModel
      .findOne({ _id: id })
      .setOptions({ skipSoftDelete: false })
      .lean()
      .exec();

    if (!existingCompany) {
      throw new NotFoundException(
        this.i18n.translate('company.NOT_FOUND', { args: { id } }),
      );
    }

    const updatedCompany = await this.companyModel
      .findOneAndUpdate({ _id: id }, updateCompanyDto, {
        new: true,
        returnDocument: 'after',
      })
      .setOptions({ skipSoftDelete: false })
      .lean()
      .exec();

    if (!updatedCompany) {
      throw new NotFoundException(
        this.i18n.translate('company.NOT_FOUND', { args: { id } }),
      );
    }

    if (user) {
      setImmediate(() => {
        this.auditService
          .log({
            user: user.userId || user._id || 'SYSTEM',
            action: 'UPDATE',
            entity: 'Company',
            entityId: id,
            oldValue: existingCompany,
            newValue: updatedCompany,
          })
          .catch((err) => this.logger.error('Audit log failed', err instanceof Error ? err.stack : err));
      });
    }

    this.eventsGateway.emitCompanyUpdated(updatedCompany);
    void this.searchCacheRegistry.invalidateSearchCache();
    return updatedCompany;
  }

  async remove(id: string): Promise<Company> {
    const deletedCompany = await this.companyModel
      .findOneAndUpdate({ _id: id }, { deleted: true }, { new: true })
      .exec();

    if (!deletedCompany) {
      throw new NotFoundException(
        this.i18n.translate('company.NOT_FOUND', { args: { id } }),
      );
    }

    void this.searchCacheRegistry.invalidateSearchCache();
    return deletedCompany;
  }
}
