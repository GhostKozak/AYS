import { Test, TestingModule } from '@nestjs/testing';
import { Types } from 'mongoose';
import { DriversController } from './drivers.controller';
import { DriversService } from './drivers.service';
import { CreateDriverDto } from './dto/create-driver.dto';

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
        DriversService,
        {
          provide: DriversService,
          useValue: driversServiceMock,
        }
      ],
    }).compile();

    controller = module.get(DriversController);
    service = module.get(DriversService);
  });

  it('tanımlı olmalı', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('yeni bir sürücü oluşturmalı', async () => {
      const mockedCompany = { _id: new Types.ObjectId().toString(), name: 'Test Şirketi', deleted: false };
      const mockedDriver = {
        company: mockedCompany,
        full_name: 'Sürücü #1',
        phone_number: '5551234567',
        deleted: false,
      };
      service.create.mockResolvedValueOnce(mockedDriver);

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
    it('tüm sürücüleri döndürmeli', async () => {
      const mockedCompany = { _id: new Types.ObjectId().toString(), name: 'Test Şirketi', deleted: false };
      const mockedDrivers = [
        { company: mockedCompany, full_name: 'Sürücü #1', phone_number: '5551111111', deleted: false },
        { company: mockedCompany, full_name: 'Sürücü #2', phone_number: '5552222222', deleted: false },
      ];
      service.findAll.mockResolvedValueOnce(mockedDrivers);

      const result = await controller.findAll();

      expect(result).toEqual(mockedDrivers);
      expect(service.findAll).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('tek bir sürücüyü döndürmeli', async () => {
      const mockedCompany = { _id: new Types.ObjectId().toString(), name: 'Test Şirketi', deleted: false };
      const mockedDriver = {
        company: mockedCompany,
        full_name: 'Sürücü #1',
        phone_number: '5553333333',
        deleted: false
      };
      service.findOne.mockResolvedValueOnce(mockedDriver);

      const id = new Types.ObjectId().toString();
      const result = await controller.findOne(id);

      expect(result).toEqual(mockedDriver);
      expect(service.findOne).toHaveBeenCalledWith(id);
    });
  });

  describe('update', () => {
    it('bir sürücüyü güncellemeli', async () => {
      const mockedCompany = { _id: new Types.ObjectId().toString(), name: 'Test Şirketi', deleted: false };
      const mockedDriver = {
        company: mockedCompany,
        full_name: 'Güncel Sürücü',
        phone_number: '5554444444',
        deleted: false
      };
      service.update.mockResolvedValueOnce(mockedDriver);

      const id = new Types.ObjectId().toString();
      const updateDriverDto = {
        full_name: mockedDriver.full_name,
        phone_number: mockedDriver.phone_number,
      };
      const result = await controller.update(id, updateDriverDto);

      expect(result).toEqual(mockedDriver);
      expect(service.update).toHaveBeenCalledWith(id, updateDriverDto);
    });
  });

  describe('soft delete', () => {
    it('bir sürücüyü soft silmeli', async () => {
      const id = new Types.ObjectId().toString();
      const mockedCompany = { _id: new Types.ObjectId().toString(), name: 'Test Şirketi', deleted: false };
      const mockedDriver = {
        _id: id,
        company: mockedCompany,
        full_name: 'Silinecek Sürücü',
        phone_number: '5555555555',
        deleted: true,
      };
      service.remove.mockResolvedValueOnce(mockedDriver);

      const result = await controller.remove(id);

      expect(result).toEqual(mockedDriver);
      expect(service.remove).toHaveBeenCalledWith(id);
    });
  });
});
