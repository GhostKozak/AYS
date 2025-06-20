import { getModelToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { Model, Types } from 'mongoose';
import { CompaniesService } from './companies.service';
import { CreateCompanyDto } from './dto/create-company.dto';
import { Company } from './schemas/company.schema';

const companyModelMock: any = jest.fn().mockImplementation((dto) => ({
  save: jest.fn(),
}));
Object.assign(companyModelMock, {
  create: jest.fn(),
  find: jest.fn(),
  findOne: jest.fn(),
  findById: jest.fn(),
  findByIdAndUpdate: jest.fn(),
  findByIdAndDelete: jest.fn(),
});

const companyDocMock = {
  save: jest.fn(),
};

describe('CompaniesService', () => {
  let service: CompaniesService;
  let model: any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CompaniesService,
        {
          provide: getModelToken('Company'),
          useValue: companyModelMock,
        }
      ],
    }).compile();

    service = module.get(CompaniesService);
    model = module.get(getModelToken('Company')) as any;
    model.mockImplementation((dto: any) => ({
      save: jest.fn().mockResolvedValue(undefined),
    }));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should insert a new company', async () => {
      const mockedCompany: CreateCompanyDto = {
        name: 'Test Company #1'
      };
      model.mockImplementation((dto: any) => ({
        save: jest.fn().mockResolvedValueOnce(mockedCompany),
      }));
      const createCompanyDto = {
        name: 'Test Company #2',
      };
      const result = await service.create(createCompanyDto);

      expect(result).toEqual(mockedCompany);
    });
  });

  describe('findAll', () => {
    it('should return all companies', async () => {
      const mockedCompanies = [
        {
          name: 'New Company #1',
        },
        {
          name: 'New Company #2',
        },
      ];
      model.find.mockReturnValueOnce({
        exec: jest.fn().mockResolvedValueOnce(mockedCompanies),
      } as any);

      const result = await service.findAll();

      expect(result).toEqual(mockedCompanies);
      expect(model.find).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should return one company', async () => {
      const mockedCompany = {
        name: 'Company #1',
      };
      model.findById.mockReturnValueOnce({
        exec: jest.fn().mockResolvedValueOnce(mockedCompany),
      } as any);

      const id = new Types.ObjectId().toString();
      const result = await service.findOne(id);

      expect(result).toEqual(mockedCompany);
      expect(model.findById).toHaveBeenCalledWith(id);
    });
  });

  describe('update', () => {
    it('should update a company', async () => {
      const mockedCompany = {
        name: 'Company #1',
      };
      model.findByIdAndUpdate.mockReturnValueOnce({
        exec: jest.fn().mockResolvedValueOnce(mockedCompany),
      } as any);

      const id = new Types.ObjectId().toString();
      const updateCompanyDto = {
        name: 'Great Company #1',
      };
      const result = await service.update(id, updateCompanyDto);

      expect(result).toEqual(mockedCompany);
      expect(model.findByIdAndUpdate).toHaveBeenCalledWith(
        id,
        updateCompanyDto,
        { new: true },
      );
    });
  });

  describe('remove', () => {
    it('should soft delete a company', async () => {
      const id = new Types.ObjectId().toString();
      const mockedCompany = {
        _id: id,
        name: 'Company To Delete',
        deleted: true,
      };
      model.findByIdAndUpdate.mockReturnValueOnce({
        exec: jest.fn().mockResolvedValueOnce(mockedCompany),
      } as any);

      const result = await service.remove(id);

      expect(result).toEqual(mockedCompany);
      expect(model.findByIdAndUpdate).toHaveBeenCalledWith(
        id,
        { deleted: true },
        { new: true },
      );
    });

    it('should throw NotFoundException if company does not exist', async () => {
      const id = new Types.ObjectId().toString();
      model.findByIdAndUpdate.mockReturnValueOnce({
        exec: jest.fn().mockResolvedValueOnce(null),
      } as any);

      await expect(service.remove(id)).rejects.toThrow('Company with ID "' + id + '" not found');
    });
  });

});
