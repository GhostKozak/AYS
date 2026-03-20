import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Company, CompanyDocument } from './schemas/company.schema';
import { PaginationQueryDto } from 'src/common/dto/pagination-query.dto';
import { FilterCompanyDto } from './dto/filter-company.dto';
import { I18nService } from 'nestjs-i18n';

@Injectable()
export class CompaniesService {

  constructor(
    @InjectModel(Company.name) private companyModel: Model<CompanyDocument>,
    private readonly i18n: I18nService,
  ) {}

  async searchByName(name: string) {
    const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const query = { 
      name: new RegExp(escapedName, 'i'),
      deleted: false 
    };

    const companies = await this.companyModel.find(query).exec();
    const count = await this.companyModel.countDocuments(query);

    return {
      data: companies,
      count,
    };
  }

  async findOrCreateByName(name: string): Promise<CompanyDocument> {
    const existingCompany = await this.companyModel.findOne({ name }).exec();

    if (existingCompany) {
      return existingCompany;
    }

    const newCompany = new this.companyModel({ name });
    return newCompany.save();
  }

  async create(createCompanyDto: CreateCompanyDto): Promise<Company> {
    const existingCompany = await this.companyModel.findOne({
      name: createCompanyDto.name
    }).exec();

    if (existingCompany) {
      if (existingCompany.deleted) {
        existingCompany.deleted = false;
        return existingCompany.save();
      }

      throw new ConflictException(
        await this.i18n.translate('database.DUPLICATE_KEY', {
          args: { field: 'name', value: createCompanyDto.name }
        })
      )
    }

    const newCompany = new this.companyModel(createCompanyDto);
    return newCompany.save();
  }

  async findAll(paginationQuery: PaginationQueryDto, filterCompanyDto: FilterCompanyDto, showDeleted = false) {
    const { limit, offset } = paginationQuery;
    const { search } = filterCompanyDto;
    const query: any = {};

    if (search) { 
      const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      query.name = { $regex: escapedSearch, $options: 'i' };
    }

    const companies = await this.companyModel
      .find(query)
      .setOptions({ skipSoftDelete: showDeleted })
      .skip(offset ?? 0)
      .limit(limit ?? 10)
      .exec();

    const count = await this.companyModel.countDocuments(query).setOptions({ skipSoftDelete: showDeleted });

    return {
      data: companies,
      count,
    };
  }

  async findOne(id: string, showDeleted = false): Promise<Company> {
    const company = await this.companyModel.findById(id).setOptions({ skipSoftDelete: showDeleted }).exec();
    
    if (!company) {
      throw new NotFoundException(
        await this.i18n.translate('company.NOT_FOUND', { args: { id } }),
      );
    }
    
    return company;
  }

  async update(id: string, updateCompanyDto: UpdateCompanyDto): Promise<Company> {
    const updatedCompany = await this.companyModel.findByIdAndUpdate(
      id, 
      updateCompanyDto, 
      { new: true }
    ).setOptions({ skipSoftDelete: false }).exec();

    if (!updatedCompany) {
      throw new NotFoundException(
        await this.i18n.translate('company.NOT_FOUND', { args: { id } }),
      );
    }

    return updatedCompany;
  }

  async remove(id: string): Promise<Company> {
    const deletedCompany = await this.companyModel.findByIdAndUpdate(
      id, 
      { deleted: true }, 
      { new: true }
    ).exec();
    
    if (!deletedCompany) {
      throw new NotFoundException(
        await this.i18n.translate('company.NOT_FOUND', { args: { id } }),
      );
    }

    return deletedCompany;
  }
}