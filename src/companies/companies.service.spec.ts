import { getModelToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { Model, Types } from 'mongoose';
import { CompaniesService } from './companies.service';
import { CreateCompanyDto } from './dto/create-company.dto';
import { Company } from './schemas/company.schema';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { FilterCompanyDto } from './dto/filter-company.dto';

const companyModelStatics = {
  find: jest.fn(),
  findOne: jest.fn(),
  findById: jest.fn(),
  findByIdAndUpdate: jest.fn(),
  findByIdAndDelete: jest.fn(),
  countDocuments: jest.fn(),
};
const companyModelConstructor = jest.fn().mockImplementation((dto) => ({
  save: jest.fn().mockResolvedValue({ _id: new Types.ObjectId(), ...dto }),
}));
const companyModelMock = Object.assign(companyModelConstructor, companyModelStatics);


describe('CompaniesService', () => {
  let service: CompaniesService;
  let model: jest.Mocked<Model<Company>>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CompaniesService,
        {
          provide: getModelToken('Company'),
          useValue: companyModelMock,
        },
      ],
    }).compile();

    service = module.get(CompaniesService);
    model = module.get(getModelToken('Company'));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should insert a new company', async () => {
      const createCompanyDto: CreateCompanyDto = {
        name: 'Test Company #1'
      };
      
      const result = await service.create(createCompanyDto);
      
      expect(companyModelConstructor).toHaveBeenCalledWith(createCompanyDto);
      expect(result.name).toEqual(createCompanyDto.name);
    });
  });

  describe('findAll', () => {
    it('should return all companies', async () => {
      const mockedResult = {
        data: [
          { name: 'New Company #1' },
          { name: 'New Company #2' },
        ],
        count: 2,
      };
      (model.find as jest.Mock).mockReturnValue({
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockedResult.data),
      });
      (model.countDocuments as jest.Mock).mockResolvedValue(mockedResult.count);
      
      const paginationQuery: PaginationQueryDto = {};
      const filterCompanyDto: FilterCompanyDto = {};
      
      const result = await service.findAll(paginationQuery, filterCompanyDto);

      expect(result).toEqual(mockedResult);
      expect(model.find).toHaveBeenCalled();
    });
  });
});