import { Test, TestingModule } from '@nestjs/testing';
import { VehiclesService } from './vehicles.service';
import { getModelToken } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Vehicle } from './schema/vehicles.schema';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { VehicleType } from './enums/vehicleTypes';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { FilterVehicleDto } from './dto/filter-vehicle.dto';

const vehicleModelStatics = {
  findOne: jest.fn(),
  find: jest.fn(),
  findById: jest.fn(),
  findByIdAndUpdate: jest.fn(),
  countDocuments: jest.fn(),
};
const vehicleModelConstructor = jest.fn().mockImplementation(() => ({
  save: jest.fn(),
}));
const vehicleModelMock = Object.assign(vehicleModelConstructor, vehicleModelStatics);

describe('VehiclesService', () => {
  let service: VehiclesService;
  let model: jest.Mocked<Model<Vehicle>>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VehiclesService,
        {
          provide: getModelToken(Vehicle.name),
          useValue: vehicleModelMock,
        },
      ],
    }).compile();

    service = module.get<VehiclesService>(VehiclesService);
    model = module.get(getModelToken(Vehicle.name));
  });

    afterEach(() => {
        jest.clearAllMocks();
    });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return all vehicles', async () => {
        const mockedResult = {
            data: [{ licence_plate: '34ABC123' }],
            count: 1,
        };
        (model.find as jest.Mock).mockReturnValue({
            skip: jest.fn().mockReturnThis(),
            limit: jest.fn().mockReturnThis(),
            exec: jest.fn().mockResolvedValue(mockedResult.data),
        });
        (model.countDocuments as jest.Mock).mockResolvedValue(mockedResult.count);

        const paginationQuery: PaginationQueryDto = {};
        const filterVehicleDto: FilterVehicleDto = {};

        const result = await service.findAll(paginationQuery, filterVehicleDto);
        expect(result).toEqual(mockedResult);
    });
  });
});