/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User } from './schemas/user.schema';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import * as bcrypt from 'bcryptjs';
import { I18nService } from 'nestjs-i18n';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private userModel: Model<User>,
    private readonly i18n: I18nService,
    private readonly auditService: AuditService,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<User> {
    const existingUser = await this.userModel
      .findOne({ email: createUserDto.email })
      .lean();
    if (existingUser) {
      throw new ConflictException(
        this.i18n.translate('user.EMAIL_ALREADY_EXISTS'),
      );
    }

    const hashedPassword = await bcrypt.hash(createUserDto.password, 10);
    const createdUser = new this.userModel({
      ...createUserDto,
      password: hashedPassword,
    });
    const savedUser = await createdUser.save();
    const userObj = savedUser.toObject() as unknown as User;
    delete (userObj as any).password;
    return userObj;
  }

  async findAll(): Promise<User[]> {
    return this.userModel.find({}, { password: 0 }).lean().exec();
  }

  async findOne(id: string): Promise<User> {
    const user = await this.userModel
      .findById(id, { password: 0 })
      .lean()
      .exec();
    if (!user) {
      throw new NotFoundException(this.i18n.translate('user.NOT_FOUND'));
    }
    return user;
  }

  async findByEmail(email: string): Promise<User> {
    const user = await this.userModel.findOne({ email }).lean().exec();
    if (!user) {
      throw new NotFoundException(this.i18n.translate('user.NOT_FOUND'));
    }
    return user;
  }

  async findForAuth(email: string): Promise<User | null> {
    return this.userModel.findOne({ email }).lean().exec();
  }

  async update(
    id: string,
    updateUserDto: UpdateUserDto,
    actor?: { userId: string },
  ): Promise<User> {
    const existingUser = await this.userModel.findById(id).lean().exec();
    if (!existingUser) {
      throw new NotFoundException(this.i18n.translate('user.NOT_FOUND'));
    }

    if (updateUserDto.password) {
      updateUserDto.password = await bcrypt.hash(updateUserDto.password, 10);
    }

    const updatedUser = await this.userModel
      .findByIdAndUpdate(id, updateUserDto, { new: true, select: '-password' })
      .lean()
      .exec();

    if (!updatedUser) {
      throw new NotFoundException(this.i18n.translate('user.NOT_FOUND'));
    }

    if (actor) {
      setImmediate(() => {
        const sanitizedExisting = { ...existingUser };
        delete (sanitizedExisting as any).password;

        const sanitizedUpdated = { ...updatedUser };
        delete (sanitizedUpdated as any).password;

        this.auditService
          .log({
            user: actor.userId,

            action: 'UPDATE',
            entity: 'User',
            entityId: id,
            oldValue: sanitizedExisting,
            newValue: sanitizedUpdated,
          })
          .catch((err) => console.error('Audit log failed', err));
      });
    }

    return updatedUser as unknown as User;
  }

  async remove(id: string): Promise<void> {
    const result = await this.userModel
      .findByIdAndUpdate(id, { deleted: true })
      .exec();
    if (!result) {
      throw new NotFoundException(this.i18n.translate('user.NOT_FOUND'));
    }
  }

  async updateLastLogin(id: string): Promise<void> {
    await this.userModel
      .findByIdAndUpdate(id, { lastLoginAt: new Date() })
      .exec();
  }

  async incrementFailedLogins(id: string): Promise<User | null> {
    const user = await this.userModel.findById(id).exec();
    if (!user) return null;

    user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;
    if (user.failedLoginAttempts >= 5) {
      user.lockedUntil = new Date(Date.now() + 15 * 60 * 1000); // 15 dakika kilit
    }
    return user.save();
  }

  async resetFailedLogins(id: string): Promise<void> {
    await this.userModel
      .findByIdAndUpdate(id, {
        failedLoginAttempts: 0,
        $unset: { lockedUntil: 1 },
      })
      .exec();
  }
}
