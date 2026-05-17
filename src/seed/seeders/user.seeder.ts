import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserRole } from '../../users/schemas/user.schema';
import { I18nService } from 'nestjs-i18n';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';

@Injectable()
export class UserSeeder {
  private readonly logger = new Logger(UserSeeder.name);

  constructor(
    @InjectModel(User.name) private userModel: Model<User>,
    private readonly i18n: I18nService,
  ) {}

  async seedAdminUser() {
    const existingAdmin = await this.userModel.findOne({
      email: 'admin@admin.com',
    });

    if (!existingAdmin) {
      const initialPassword =
        process.env.INITIAL_ADMIN_PASSWORD || 'Admin.123.';
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

  async seedSystemUser() {
    const systemEmail = process.env.SYSTEM_USER_EMAIL || 'system@internal';
    const existing = await this.userModel.findOne({ email: systemEmail });

    if (!existing) {
      const password =
        process.env.SYSTEM_USER_PASSWORD ||
        crypto.randomBytes(12).toString('hex');
      const hashedPassword = await bcrypt.hash(password, 10);

      const systemUser = new this.userModel({
        email: systemEmail,
        password: hashedPassword,
        firstName: 'System',
        lastName: 'Internal',
        role: UserRole.ADMIN,
        isActive: true,
      });

      await systemUser.save();
      this.logger.log(`System user created: ${systemEmail}`);
      this.logger.log(`System user password: ${password}`);
    } else {
      this.logger.log(`System user already exists: ${systemEmail}`);
    }
  }

  async seedTestUsers() {
    const users = [
      {
        email: 'editor@test.com',
        password: await bcrypt.hash('Editor.123', 10),
        firstName: 'Editor',
        lastName: 'User',
        role: UserRole.EDITOR,
        isActive: true,
      },
      {
        email: 'viewer@test.com',
        password: await bcrypt.hash('Viewer.123', 10),
        firstName: 'Viewer',
        lastName: 'User',
        role: UserRole.VIEWER,
        isActive: true,
      },
      {
        email: 'inactive@test.com',
        password: await bcrypt.hash('Inactive.123', 10),
        firstName: 'Inactive',
        lastName: 'User',
        role: UserRole.VIEWER,
        isActive: false,
      },
    ];

    for (const userData of users) {
      await this.userModel.create(userData);
    }
    this.logger.log('Users seeded');
  }

  async clearNonProtected() {
    const systemEmail = process.env.SYSTEM_USER_EMAIL || 'system@internal';
    const protectedEmails = ['admin@admin.com', systemEmail];
    await this.userModel.deleteMany({ email: { $nin: protectedEmails } });
  }
}
