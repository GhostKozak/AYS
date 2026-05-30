import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model, FilterQuery, isValidObjectId, Types } from 'mongoose';
import { AuditLog, AuditLogDocument } from './schemas/audit-log.schema';
import { User } from '../users/schemas/user.schema';

@Injectable()
export class AuditService implements OnModuleInit {
  private cachedSystemUserId: string | null = null;

  constructor(
    @InjectModel(AuditLog.name) private auditLogModel: Model<AuditLogDocument>,
    @InjectModel(User.name) private userModel: Model<User>,
    private configService: ConfigService,
  ) {}

  async onModuleInit() {
    const systemEmail =
      this.configService.get<string>('SYSTEM_USER_EMAIL') || 'system@internal';
    try {
      const systemUser = await this.userModel
        .findOne({ email: systemEmail })
        .select('_id')
        .lean()
        .exec();
      if (systemUser) {
        this.cachedSystemUserId = String(systemUser._id);
      }
    } catch {
      // System user not yet seeded — cache stays null
    }
  }

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
    let userField: string | null = null;

    const u = data.user;
    if (!u) {
      userField = null;
    } else if (typeof u === 'string') {
      userField = isValidObjectId(u) ? u : null;
    } else if (typeof u === 'object') {
      const userObj = u as { _id?: unknown; id?: unknown; userId?: unknown };
      const candidate = userObj._id || userObj.id || userObj.userId;
      let candidateStr: string | null = null;
      if (typeof candidate === 'string') {
        candidateStr = candidate;
      } else if (candidate instanceof Types.ObjectId) {
        candidateStr = candidate.toHexString();
      }

      if (candidateStr && isValidObjectId(candidateStr)) {
        userField = candidateStr;
      } else {
        userField = null;
      }
    } else {
      userField = null;
    }

    const payload = {
      action: data.action,
      entity: data.entity,
      entityId: data.entityId,
      oldValue: data.oldValue,
      newValue: data.newValue,
      ipAddress: data.ipAddress,
      userAgent: data.userAgent,
      user: userField,
      userLabel: undefined as string | undefined,
    };

    // If we couldn't resolve an ObjectId, always keep the original label
    if (userField === null) {
      payload.userLabel = this.getUserLabel(u);
      if (this.cachedSystemUserId) {
        payload.user = this.cachedSystemUserId;
      }
    }

    const log = new this.auditLogModel(payload);
    return log.save();
  }

  private getUserLabel(u: unknown): string | undefined {
    if (!u) {
      return 'SYSTEM';
    }
    if (typeof u === 'string') {
      return u;
    }
    if (typeof u === 'object') {
      const userObj = u as { firstName?: unknown; lastName?: unknown };
      const firstName =
        typeof userObj.firstName === 'string' ? userObj.firstName : '';
      const lastName =
        typeof userObj.lastName === 'string' ? userObj.lastName : '';
      return `${firstName} ${lastName}`.trim() || undefined;
    }
    return 'SYSTEM';
  }

  async findAll(
    query: FilterQuery<AuditLogDocument> = {},
    limit = 100,
    offset = 0,
  ) {
    const [logs, count] = await Promise.all([
      this.auditLogModel
        .find(query)
        .populate('user', 'firstName lastName email role')
        .sort({ createdAt: -1 })
        .skip(offset)
        .limit(limit)
        .exec(),
      this.auditLogModel.countDocuments(query).exec(),
    ]);
    return { data: logs, count };
  }
}
