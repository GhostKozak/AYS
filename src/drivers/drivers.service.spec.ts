import { getModelToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { Model, Types } from 'mongoose';
import { DriversService } from './drivers.service';
import { CreateDriverDto } from './dto/create-driver.dto';
import { Driver } from './schemas/driver.schema';

// Statik fonksiyonlar için mock
const driverModelStatics = {
  findById: jest.fn(),
  find: jest.fn(),
  findOne: jest.fn(),
  findByIdAndUpdate: jest.fn(),
  create: jest.fn(),
};
// Constructor mock
const driverModelConstructor = jest.fn().mockImplementation(() => ({
  save: jest.fn(),
}));

// Statik ve constructor fonksiyonlarını birleştir
const driverModelMock = Object.assign(driverModelConstructor, driverModelStatics);

const companyModelStatics = {
  findById: jest.fn(),
  find: jest.fn(),
  findOne: jest.fn(),
  findByIdAndUpdate: jest.fn(),
  create: jest.fn(),
};
const companyModelConstructor = jest.fn().mockImplementation(() => ({
  save: jest.fn(),
}));
const companyModelMock = Object.assign(companyModelConstructor, companyModelStatics);

describe('DriversService', () => {
  let service: DriversService;
  let driverModel: jest.Mocked<Model<Driver>>;
  let companyModel: any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DriversService,
        { provide: getModelToken('Driver'), useValue: driverModelMock },
        { provide: getModelToken('Company'), useValue: companyModelMock },
      ],
    }).compile();

    service = module.get(DriversService);
    driverModel = module.get(getModelToken('Driver'));
    companyModel = module.get(getModelToken('Company'));
  });

  it('tanımlı olmalı', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('yeni bir sürücü eklemeli', async () => {
      const mockedDriver = {
        company: new Types.ObjectId().toString(),
        full_name: 'Test Sürücü',
        phone_number: '5550000000',
        deleted: false,
      };
      companyModel.findById.mockResolvedValueOnce({ _id: mockedDriver.company });

      // Burada constructor ve save mock'u ayarlanıyor!
      const saveMock = jest.fn().mockResolvedValueOnce(mockedDriver);
      (driverModelMock as jest.Mock).mockImplementation(() => ({
        save: saveMock,
      }));

      const createDriverDto = {
        company: mockedDriver.company,
        full_name: mockedDriver.full_name,
        phone_number: mockedDriver.phone_number,
      };
      const result = await service.create(createDriverDto);

      expect(result).toEqual(mockedDriver);
      expect(companyModel.findById).toHaveBeenCalledWith(createDriverDto.company);
    });
  });

  describe('findAll', () => {
    it('tüm sürücüleri döndürmeli', async () => {
      const mockedDrivers = [
        { company: new Types.ObjectId().toString(), full_name: 'Sürücü #1', phone_number: '5551111111', deleted: false },
        { company: new Types.ObjectId().toString(), full_name: 'Sürücü #2', phone_number: '5552222222', deleted: false },
      ];
      driverModel.find.mockReturnValueOnce({
        exec: jest.fn().mockResolvedValueOnce(mockedDrivers),
      } as any);

      const result = await service.findAll();

      expect(result).toEqual(mockedDrivers);
      expect(driverModel.find).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('tek bir sürücüyü döndürmeli', async () => {
      const mockedDriver = { company: new Types.ObjectId().toString(), full_name: 'Sürücü #1', phone_number: '5553333333', deleted: false };
      driverModel.findById.mockReturnValueOnce({
        exec: jest.fn().mockResolvedValueOnce(mockedDriver),
      } as any);

      const id = new Types.ObjectId().toString();
      const result = await service.findOne(id);

      expect(result).toEqual(mockedDriver);
      expect(driverModel.findById).toHaveBeenCalledWith(id);
    });
  });

  describe('update', () => {
    it('bir sürücüyü güncellemeli', async () => {
      const mockedDriver = { company: new Types.ObjectId().toString(), full_name: 'Güncel Sürücü', phone_number: '5554444444', deleted: false };
      driverModel.findByIdAndUpdate.mockReturnValueOnce({
        exec: jest.fn().mockResolvedValueOnce(mockedDriver),
      } as any);

      const id = new Types.ObjectId().toString();
      const updateDriverDto = { full_name: mockedDriver.full_name, phone_number: mockedDriver.phone_number };
      const result = await service.update(id, updateDriverDto);

      expect(result).toEqual(mockedDriver);
      expect(driverModel.findByIdAndUpdate).toHaveBeenCalledWith(
        id,
        updateDriverDto,
        { new: true },
      );
    });
  });

  describe('remove', () => {
    it('bir sürücüyü soft silmeli', async () => {
      const id = new Types.ObjectId().toString();
      const mockedDriver = {
        _id: id,
        company: new Types.ObjectId().toString(),
        full_name: 'Silinecek Sürücü',
        phone_number: '5555555555',
        deleted: true,
      };
      driverModel.findByIdAndUpdate.mockReturnValueOnce({
        exec: jest.fn().mockResolvedValueOnce(mockedDriver),
      } as any);

      const result = await service.remove(id);

      expect(result).toEqual(mockedDriver);
      expect(driverModel.findByIdAndUpdate).toHaveBeenCalledWith(
        id,
        { deleted: true },
        { new: true },
      );
    });

    it('sürücü yoksa NotFoundException fırlatmalı', async () => {
      const id = new Types.ObjectId().toString();
      driverModel.findByIdAndUpdate.mockReturnValueOnce({
        exec: jest.fn().mockResolvedValueOnce(null),
      } as any);

      await expect(service.remove(id)).rejects.toThrow('Driver with ID "' + id + '" not found');
    });
  });
});
