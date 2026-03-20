import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserRole } from '../users/schemas/user.schema';
import * as bcrypt from 'bcryptjs';
import { I18nService } from 'nestjs-i18n';

@Injectable()
export class SeedService {
  private readonly logger = new Logger(SeedService.name);

  constructor(
    @InjectModel(User.name) private userModel: Model<User>,
    private readonly i18n: I18nService,
  ) { }

  async seedAdminUser() {
    const existingAdmin = await this.userModel.findOne({ email: 'admin@admin.com' });

    if (!existingAdmin) {
      const initialPassword = process.env.INITIAL_ADMIN_PASSWORD || 'Admin.123.';
      const hashedPassword = await bcrypt.hash(initialPassword, 10);

      const adminUser = new this.userModel({
        email: 'admin@admin.com',
        password: hashedPassword,
        firstName: 'Admin',
        lastName: 'User',
        role: UserRole.ADMIN,
        isActive: true,
      });

      await adminUser.save();
      this.logger.log(this.i18n.translate('seed.ADMIN_USER_CREATED'));
    } else {
      this.logger.log(this.i18n.translate('seed.ADMIN_USER_ALREADY_EXISTS'));
    }
  }
} 