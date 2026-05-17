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
      { name: 'ABC Lojistik Ltd.' },
      { name: 'XYZ Taşımacılık A.Ş.' },
      { name: 'Global Nakliyat Co.' },
      { name: 'Mega Transport Inc.' },
      { name: 'Fast Delivery Ltd.' },
      { name: 'Prime Logistics A.Ş.' },
      { name: 'Elite Cargo Co.' },
      { name: 'Speed Transport Ltd.' },
      { name: 'Reliable Shipping A.Ş.' },
      { name: 'Pro Express Co.' },
      { name: 'Silinen Firma Ltd.', deleted: true },
      { name: 'Eski Firma A.Ş.', deleted: true },
      { name: 'Kapanmış Nakliyat Co.', deleted: true },
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
