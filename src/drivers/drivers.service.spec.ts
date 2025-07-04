import { getModelToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { Model, Types } from 'mongoose';
import { DriversService } from './drivers.service';
import { Driver } from './schemas/driver.schema';
import { CompaniesService } from '../companies/companies.service';
import { Company } from '../companies/schemas/company.schema';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { FilterDriverDto } from './dto/filter-driver.dto';

const driverModelStatics = {
  findById: jest.fn(),
  find: jest.fn(),
  findOne: jest.fn(),
  findByIdAndUpdate: jest.fn(),
  create: jest.fn(),
  countDocuments: jest.fn(),
};
const driverModelConstructor = jest.fn().mockImplementation(() => ({
  save: jest.fn(),
}));
const driverModelMock = Object.assign(driverModelConstructor, driverModelStatics);

const companiesServiceMock = {
  findOne: jest.fn(),
};

describe('DriversService', () => {
  let service: DriversService;
  let driverModel: jest.Mocked<Model<Driver>>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DriversService,
        { provide: getModelToken(Driver.name), useValue: driverModelMock },
        { provide: CompaniesService, useValue: companiesServiceMock },
      ],
    }).compile();

    service = module.get(DriversService);
    driverModel = module.get(getModelToken(Driver.name));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return all drivers', async () => {
      const mockedDrivers = {
        data: [
          { company: new Types.ObjectId().toString(), full_name: 'Driver #1', phone_number: '5551111111', deleted: false },
          { company: new Types.ObjectId().toString(), full_name: 'Driver #2', phone_number: '5552222222', deleted: false },
        ],
        count: 2
      };

      (driverModel.find as jest.Mock).mockReturnValue({
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        populate: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockedDrivers.data),
      });
      (driverModel.countDocuments as jest.Mock).mockResolvedValue(mockedDrivers.count);
      
      const paginationQuery: PaginationQueryDto = {};
      const filterDriverDto: FilterDriverDto = {};
      const result = await service.findAll(paginationQuery, filterDriverDto);

      expect(result).toEqual(mockedDrivers);
      expect(driverModel.find).toHaveBeenCalled();
    });
  });
});