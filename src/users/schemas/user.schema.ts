import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
@Schema({ timestamps: true })
export class User extends Document {
  @Prop({ required: true, unique: true })
  email: string;

  @Prop({ required: true })
  password: string;

  @Prop({ required: true })
  firstName: string;

  @Prop({ required: true })
  lastName: string;

  @Prop({ type: String, enum: UserRole, default: UserRole.USER })
  role: UserRole;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ default: 0 })
  failedLoginAttempts: number;

  @Prop({ type: Date })
  lockedUntil?: Date;

  @Prop({ type: Date })
  lastLoginAt?: Date;

  @Prop({ type: String })
  refreshTokenHash?: string;

  @Prop({ type: Date })
  refreshTokenExpiresAt?: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);
