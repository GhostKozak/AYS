import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Company, CompanyDocument } from './schemas/company.schema';
import slugify from 'slugify';

@Injectable()
export class CompaniesService {

  constructor(
    @InjectModel(Company.name) private companyModel: Model<CompanyDocument>,
  ) {}

  private normalizeName(name: string): string {
    return slugify(name, {
      lower: true,
      strict: true,
      remove: /[*+~.()'"!:@]/g,
      replacement: '',
    });
  }

  async create(createCompanyDto: CreateCompanyDto): Promise<Company> {
    const normalizedName = this.normalizeName(createCompanyDto.name);

    const companyToCreate = {
      ...createCompanyDto,
      name_normalized: normalizedName,
    };

    const newCompany = new this.companyModel(companyToCreate);
    return newCompany.save();
  }

  async findAll(): Promise<Company[]> {
    return this.companyModel.find({ deleted: false }).exec();
  }

  async findOne(id: string): Promise<Company> {
    const company = await this.companyModel.findById(id).exec();
    
    if (!company) {
      throw new NotFoundException(`Company with ID "${id}" not found`);
    }
    
    return company;
  }

  async update(id: string, updateCompanyDto: UpdateCompanyDto): Promise<Company> {
    const updatePayload: any = { ...updateCompanyDto };

    if (updateCompanyDto.name) {
      updatePayload.name_normalized = this.normalizeName(updateCompanyDto.name);
    }
    
    const updatedCompany = await this.companyModel.findByIdAndUpdate(
      id, 
      updatePayload, 
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