import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AuditLog, AuditLogDocument } from './schemas/audit-log.schema';

@Injectable()
export class AuditService {
  constructor(
    @InjectModel(AuditLog.name) private auditLogModel: Model<AuditLogDocument>,
  ) {}

  async log(data: {
    user: any;
    action: string;
    entity: string;
    entityId: string;
    oldValue?: any;
    newValue?: any;
    ipAddress?: string;
    userAgent?: string;
  }) {
    const log = new this.auditLogModel(data);
    return log.save();
  }

  async findAll(query: any = {}) {
    return this.auditLogModel
      .find(query)
      .populate('user', 'full_name email role')
      .sort({ createdAt: -1 })
      .limit(100)
      .exec();
  }
}
