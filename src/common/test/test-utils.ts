import { getModelToken } from '@nestjs/mongoose';

export const mockI18nService = () => ({
  translate: jest.fn().mockImplementation((key: string, options?: any) => {
    return Promise.resolve(key); // Just return the key for testing
  }),
});

export const mockAuditService = () => ({
  log: jest.fn().mockResolvedValue({}),
  findAll: jest.fn().mockResolvedValue([]),
});

export const mockQuery = (resolvedValue: any = []) => {
  const query: any = {
    setOptions: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    populate: jest.fn().mockReturnThis(),
    sort: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    lean: jest.fn().mockReturnThis(),
    exec: jest.fn().mockResolvedValue(resolvedValue),
    then(onFulfilled: any, onRejected: any) {
      return this.exec().then(onFulfilled, onRejected);
    },
    catch(onRejected: any) {
      return this.exec().catch(onRejected);
    },
    finally(onFinally: any) {
      return this.exec().finally(onFinally);
    }
  };
  return query;
};

export const mockModel = () => {
  const model: any = jest.fn().mockImplementation((dto) => ({
    ...dto,
    save: jest.fn().mockResolvedValue({ _id: 'mock-id', ...dto }),
  }));

  model.find = jest.fn().mockReturnValue(mockQuery([]));
  model.findOne = jest.fn().mockReturnValue(mockQuery(null));
  model.findById = jest.fn().mockReturnValue(mockQuery(null));
  model.findByIdAndUpdate = jest.fn().mockReturnValue(mockQuery(null));
  model.findByIdAndDelete = jest.fn().mockReturnValue(mockQuery(null));
  model.findOneAndUpdate = jest.fn().mockReturnValue(mockQuery(null));
  model.countDocuments = jest.fn().mockReturnValue(mockQuery(0));
  model.create = jest.fn().mockResolvedValue({});
  
  return model;
};

export const getMockProvider = (provide: any, mock: any) => ({
  provide,
  useValue: mock,
});

export const getModelMockProvider = (modelName: string) => ({
  provide: getModelToken(modelName),
  useValue: mockModel(),
});
