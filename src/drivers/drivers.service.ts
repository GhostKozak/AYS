import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateDriverDto } from './dto/create-driver.dto';
import { UpdateDriverDto } from './dto/update-driver.dto';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Driver, DriverDocument } from './schemas/driver.schema';

@Injectable()
export class DriversService {

  constructor(
    @InjectModel(Driver.name) private driverModel: Model<DriverDocument>,
  ) {}

  async create(createDriverDto: CreateDriverDto) {
    const newDriver = new this.driverModel(createDriverDto);
    return newDriver.save();
  }

  async findAll(): Promise<Driver[]> {
    return this.driverModel.find().exec();
  }

  async findOne(id: string): Promise<Driver> {
    const driver = await this.driverModel.findById(id).exec();

    if (!driver) {
      throw new NotFoundException(`Driver with ID "${id}" not found`);
    }

    return driver;
  }

  async update(id: string, updateDriverDto: UpdateDriverDto): Promise<Driver> {
    const updatedDriver = await this.driverModel.findByIdAndUpdate(
      id,
      updateDriverDto,
      { new: true }
    ).exec();

    if (!updatedDriver) {
      throw new NotFoundException(`Driver with ID "${id}" not found`);
    }

    return updatedDriver;
  }

  async remove(id: string): Promise<Driver> {
    const deletedDriver = await this.driverModel.findByIdAndUpdate(
      id,
      { deleted: true },
      { new: true }
    ).exec();

    if (!deletedDriver) {
      throw new NotFoundException(`Driver with ID "${id}" not found`);
    }

    return deletedDriver;
  }
}
