import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { User } from '../../users/schemas/user.schema';

export type AuditLogDocument = AuditLog & Document;

@Schema({ timestamps: true })
export class AuditLog {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: false })
  user!: User | null;

  @Prop()
  userLabel?: string;

  @Prop({ required: true })
  action!: string; // CREATE, UPDATE, DELETE, RESTORE

  @Prop({ required: true })
  entity!: string; // Company, Driver, Vehicle, Trip

  @Prop({ required: true })
  entityId!: string;

  @Prop({ type: Object })
  oldValue?: any;

  @Prop({ type: Object })
  newValue?: any;

  @Prop()
  ipAddress?: string;

  @Prop()
  userAgent?: string;
}

export const AuditLogSchema = SchemaFactory.createForClass(AuditLog);
AuditLogSchema.index({ entity: 1, entityId: 1 });
AuditLogSchema.index({ user: 1 });
