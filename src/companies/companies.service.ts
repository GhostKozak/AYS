import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Company, CompanyDocument } from './schemas/company.schema';
import { PaginationQueryDto } from 'src/common/dto/pagination-query.dto';
import { FilterCompanyDto } from './dto/filter-company.dto';

@Injectable()
export class CompaniesService {

  constructor(
    @InjectModel(Company.name) private companyModel: Model<CompanyDocument>,
  ) {}

  async searchByName(name: string) {
    return await this.companyModel.find({ name: new RegExp(name, 'i') }).exec();
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
    const newCompany = new this.companyModel(createCompanyDto);
    return newCompany.save();
  }

  async findAll(paginationQuery: PaginationQueryDto, filterCompanyDto: FilterCompanyDto) {
    const { limit, offset } = paginationQuery;
    const { search } = filterCompanyDto;
    const query: any = { deleted: false };

    if (search) { 
      query.name = { $regex: search, $options: 'i' };
    }

    const companies = await this.companyModel
      .find(query)
      .skip(offset ?? 0)
      .limit(limit ?? 10)
      .exec();

    const count = await this.companyModel.countDocuments(query);

    return {
      data: companies,
      count,
    };
  }

  async findOne(id: string): Promise<Company> {
    const company = await this.companyModel.findById(id).exec();
    
    if (!company) {
      throw new NotFoundException(`Company with ID "${id}" not found`);
    }
    
    return company;
  }

  async update(id: string, updateCompanyDto: UpdateCompanyDto): Promise<Company> {
    const updatedCompany = await this.companyModel.findByIdAndUpdate(
      id, 
      updateCompanyDto, 
      { new: true }
    ).exec();

    if (!updatedCompany) {
      throw new NotFoundException(`Company with ID "${id}" not found`);
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
      throw new NotFoundException(`Company with ID "${id}" not found`);
    }

    return deletedCompany;
  }
}