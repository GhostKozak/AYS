import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserRole } from '../users/schemas/user.schema';
import * as bcrypt from 'bcryptjs';
import { I18nService } from 'nestjs-i18n';

@Injectable()
export class SeedService {
  constructor(
    @InjectModel(User.name) private userModel: Model<User>,
    private readonly i18n: I18nService,
  ) {}

  async seedAdminUser() {
    const existingAdmin = await this.userModel.findOne({ email: 'admin@admin.com' });
    
    if (!existingAdmin) {
      const hashedPassword = await bcrypt.hash('Admin.123.', 10);
      
      const adminUser = new this.userModel({
        email: 'admin@admin.com',
        password: hashedPassword,
        firstName: 'Admin',
        lastName: 'User',
        role: UserRole.ADMIN,
        isActive: true,
      });

      await adminUser.save();
      console.log(this.i18n.translate('seed.ADMIN_USER_CREATED'));
    } else {
      console.log(this.i18n.translate('seed.ADMIN_USER_ALREADY_EXISTS'));
    }
  }
} 