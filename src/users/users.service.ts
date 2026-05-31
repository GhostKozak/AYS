import {
  Injectable,
  ConflictException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { createHash } from 'crypto';
import * as bcrypt from 'bcryptjs';
import { User } from './schemas/user.schema';
import { UserSession } from './schemas/user-session.schema';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { I18nService } from 'nestjs-i18n';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);
  constructor(
    @InjectModel(User.name) private userModel: Model<User>,
    @InjectModel(UserSession.name) private userSessionModel: Model<UserSession>,
    private readonly i18n: I18nService,
    private readonly auditService: AuditService,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<User> {
    const normalizedEmail = createUserDto.email.toLowerCase().trim();
    const existingUser = await this.userModel
      .findOne({
        email: new RegExp(
          `^${normalizedEmail.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`,
          'i',
        ),
      })
      .setOptions({ skipSoftDelete: true })
      .lean();
    if (existingUser) {
      throw new ConflictException(
        this.i18n.translate('user.EMAIL_ALREADY_EXISTS'),
      );
    }

    const hashedPassword = await bcrypt.hash(createUserDto.password, 10);
    const createdUser = new this.userModel({
      ...createUserDto,
      email: normalizedEmail,
      password: hashedPassword,
    });
    const savedUser = await createdUser.save();
    const userObj = savedUser.toObject() as unknown as User;
    delete (userObj as any).password;
    return userObj;
  }

  async findAll(showDeleted = false): Promise<User[]> {
    const query = this.userModel.find({}, { password: 0 });
    if (showDeleted) {
      query.setOptions({ skipSoftDelete: true });
    }
    return query.lean().exec();
  }

  async findOne(id: string, showDeleted = false): Promise<User> {
    const query = this.userModel.findById(id, { password: 0 });
    if (showDeleted) {
      query.setOptions({ skipSoftDelete: true });
    }
    const user = await query.lean().exec();
    if (!user) {
      throw new NotFoundException(this.i18n.translate('user.NOT_FOUND'));
    }
    return user;
  }

  async findByEmail(email: string): Promise<User> {
    const normalized = email.toLowerCase().trim();
    const user = await this.userModel
      .findOne({ email: new RegExp(`^${normalized.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') })
      .lean()
      .exec();
    if (!user) {
      throw new NotFoundException(this.i18n.translate('user.NOT_FOUND'));
    }
    return user;
  }

  async findForAuth(email: string): Promise<User | null> {
    const normalized = email.toLowerCase().trim();
    return this.userModel
      .findOne({ email: new RegExp(`^${normalized.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') })
      .lean()
      .exec();
  }

  async findByIdForJwt(id: string): Promise<{ isActive: boolean; role: string } | null> {
    return this.userModel
      .findById(id, { isActive: 1, role: 1 })
      .lean()
      .exec();
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

    const updateData = updateUserDto.password
      ? { ...updateUserDto, password: await bcrypt.hash(updateUserDto.password, 10) }
      : updateUserDto;

    const updatedUser = await this.userModel
      .findOneAndUpdate({ _id: id }, updateData, { new: true, select: '-password' })
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
          .catch((err) => this.logger.error('Audit log failed', err instanceof Error ? err.stack : err));
      });
    }

    return updatedUser as unknown as User;
  }

  async remove(id: string): Promise<void> {
    const result = await this.userModel
      .findOneAndUpdate({ _id: id }, { deleted: true })
      .exec();
    if (!result) {
      throw new NotFoundException(this.i18n.translate('user.NOT_FOUND'));
    }
  }

  async updateLastLogin(id: string): Promise<void> {
    await this.userModel
      .findOneAndUpdate({ _id: id }, { lastLoginAt: new Date() })
      .exec();
  }

  async incrementFailedLogins(id: string): Promise<void> {
    const updated = await this.userModel
      .findByIdAndUpdate(
        id,
        { $inc: { failedLoginAttempts: 1 } },
        { new: true, select: 'failedLoginAttempts lockedUntil' },
      )
      .exec();

    if (!updated) return;

    if (updated.failedLoginAttempts >= 5 && !updated.lockedUntil) {
      await this.userModel
        .findByIdAndUpdate(id, {
          lockedUntil: new Date(Date.now() + 15 * 60 * 1000),
        })
        .exec();
    }
  }

  async resetFailedLogins(id: string): Promise<void> {
    await this.userModel
      .findOneAndUpdate({ _id: id }, {
        failedLoginAttempts: 0,
        $unset: { lockedUntil: 1 },
      })
      .exec();
  }

  async storeRefreshToken(
    id: string,
    refreshTokenHash: string,
    expiresAt: Date,
    deviceInfo?: string,
  ): Promise<void> {
    await this.userSessionModel.create({
      userId: new Types.ObjectId(id),
      refreshTokenHash,
      expiresAt,
      deviceInfo,
    });
  }

  async findByRefreshToken(token: string): Promise<User | null> {
    const hash = createHash('sha256').update(token).digest('hex');
    const session = await this.userSessionModel
      .findOne({
        refreshTokenHash: hash,
        expiresAt: { $gt: new Date() },
      })
      .lean()
      .exec();
    if (!session) return null;
    return this.userModel.findById(session.userId).lean().exec();
  }

  async clearRefreshToken(id: string): Promise<void> {
    await this.userSessionModel
      .deleteMany({ userId: new Types.ObjectId(id) })
      .exec();
  }
}
