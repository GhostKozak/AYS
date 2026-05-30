import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Company } from '../../companies/schemas/company.schema';

@Injectable()
export class CompanySeeder {
  private readonly logger = new Logger(CompanySeeder.name);

  constructor(
    @InjectModel(Company.name) private companyModel: Model<Company>,
  ) {}

  async clear() {
    await this.companyModel.deleteMany({});
  }

  async seed(): Promise<any[]> {
    const companies: any[] = [
      { name: 'Alpha Transport Ltd.' },
      { name: 'Beta Logistics A.Ş.' },
      { name: 'Gamma Carriers Co.' },
      { name: 'Delta Freight Inc.' },
      { name: 'Epsilon Express Ltd.' },
      { name: 'Zeta Closed Co.', deleted: true },
    ];

    const createdCompanies: any[] = [];
    for (const companyData of companies) {
      const company = await this.companyModel.create(companyData);
      createdCompanies.push(company);
    }
    this.logger.log('Companies seeded');
    return createdCompanies;
  }
}
