import { Test, TestingModule } from '@nestjs/testing';
import { Types } from 'mongoose';
import { DriversController } from './drivers.controller';
import { DriversService } from './drivers.service';
import { CreateDriverDto } from './dto/create-driver.dto';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { FilterDriverDto } from './dto/filter-driver.dto';

const driversServiceMock = {
  create: jest.fn(),
  findAll: jest.fn(),
  findOne: jest.fn(),
  update: jest.fn(),
  remove: jest.fn(),
};

describe('DriversController', () => {
  let controller: DriversController;
  let service: jest.Mocked<DriversService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DriversController],
      providers: [
        {
          provide: DriversService,
          useValue: driversServiceMock,
        },
      ],
    }).compile();

    controller = module.get(DriversController);
    service = module.get(DriversService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create a new driver', async () => {
      const mockedCompany = { _id: new Types.ObjectId().toString(), name: 'Test Company', deleted: false };
      const mockedDriver = {
        company: mockedCompany,
        full_name: 'Driver #1',
        phone_number: '5551234567',
        deleted: false,
      };
      service.create.mockResolvedValueOnce(mockedDriver as any);

      const createDriverDto: CreateDriverDto = {
        company: mockedDriver.company._id,
        full_name: mockedDriver.full_name,
        phone_number: mockedDriver.phone_number,
      };
      const result = await controller.create(createDriverDto);

      expect(result).toEqual(mockedDriver);
      expect(service.create).toHaveBeenCalledWith(createDriverDto);
    });
  });

  describe('findAll', () => {
    it('should return all drivers', async () => {
      const mockedCompany = { _id: new Types.ObjectId().toString(), name: 'Test Company', deleted: false };
      const mockedResult = {
          data: [
            { company: mockedCompany, full_name: 'Driver #1', phone_number: '5551111111', deleted: false },
            { company: mockedCompany, full_name: 'Driver #2', phone_number: '5552222222', deleted: false },
          ],
          count: 2
      };
      service.findAll.mockResolvedValueOnce(mockedResult as any);
      
      const paginationQuery: PaginationQueryDto = {};
      const filterDriverDto: FilterDriverDto = {};

      const result = await controller.findAll(paginationQuery, filterDriverDto);

      expect(result).toEqual(mockedResult);
      expect(service.findAll).toHaveBeenCalledWith(paginationQuery, filterDriverDto);
    });
  });
});