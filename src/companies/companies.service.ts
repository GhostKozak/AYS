import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Company, CompanyDocument } from './schemas/company.schema';

@Injectable()
export class CompaniesService {

  constructor(
    @InjectModel(Company.name) private companyModel: Model<CompanyDocument>,
  ) {}

  private normalizeName(name: string): string {
    return name
      .toLocaleLowerCase('tr-TR') // Türkçe'ye özgü doğru küçültme
      .replace(/[\s\-_]/g, '')    // Boşluk, tire gibi karakterleri kaldır
      .replace(/[^a-z0-9]/g, ''); // Harf ve rakam dışındaki her şeyi kaldır
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
    return this.companyModel.find().exec();
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