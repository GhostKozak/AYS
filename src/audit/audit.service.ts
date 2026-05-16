import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, FilterQuery, isValidObjectId } from 'mongoose';
import { AuditLog, AuditLogDocument } from './schemas/audit-log.schema';
import { User } from '../users/schemas/user.schema';

@Injectable()
export class AuditService {
  constructor(
    @InjectModel(AuditLog.name) private auditLogModel: Model<AuditLogDocument>,
    @InjectModel(User.name) private userModel: Model<User>,
  ) {}

  async log(data: {
    user: string | Record<string, unknown> | undefined | null;
    action: string;
    entity: string;
    entityId: string;
    oldValue?: unknown;
    newValue?: unknown;
    ipAddress?: string;
    userAgent?: string;
  }) {
    // Normalize user to an ObjectId string when possible. For system actions
    // or invalid IDs, store `user` as `null` so schema validation doesn't fail.
    let userField: string | undefined | null = undefined;

    const u = data.user as any;
    if (!u) {
      userField = null;
    } else if (typeof u === 'string') {
      userField = isValidObjectId(u) ? u : null;
    } else if (typeof u === 'object') {
      const candidate = u._id || u.id || u.userId;
      if (typeof candidate === 'string' && isValidObjectId(candidate)) {
        userField = candidate;
      } else {
        userField = null;
      }
    } else {
      userField = null;
    }

    const payload: any = { ...data, user: userField };

    // If we couldn't resolve an ObjectId, attempt to use the persistent
    // system user (if created), otherwise capture a human-readable label.
    if (userField === null) {
      const systemEmail = process.env.SYSTEM_USER_EMAIL || 'system@internal';
      try {
        const systemUser = await this.userModel
          .findOne({ email: systemEmail })
          .exec();
        if (systemUser) {
          payload.user = systemUser._id;
        } else {
          if (typeof u === 'string') {
            payload.userLabel = u;
          } else if (typeof u === 'object') {
            payload.userLabel =
              `${u.firstName || ''} ${u.lastName || ''}`.trim() || undefined;
          } else {
            payload.userLabel = 'SYSTEM';
          }
        }
      } catch (err) {
        if (typeof u === 'string') {
          payload.userLabel = u;
        } else if (typeof u === 'object') {
          payload.userLabel =
            `${u.firstName || ''} ${u.lastName || ''}`.trim() || undefined;
        } else {
          payload.userLabel = 'SYSTEM';
        }
      }
    }

    const log = new this.auditLogModel(payload);
    return log.save();
  }

  async findAll(query: FilterQuery<AuditLogDocument> = {}) {
    return this.auditLogModel
      .find(query)
      .populate('user', 'firstName lastName email role')
      .sort({ createdAt: -1 })
      .limit(100)
      .exec();
  }
}
