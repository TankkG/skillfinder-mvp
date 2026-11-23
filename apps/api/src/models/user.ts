import { Schema, model, type InferSchemaType } from 'mongoose';
import {
  ROLES,
  USER_STATUSES,
  VERIFICATION_CHANNELS,
} from '@skillfinder/shared';
import { baseSchemaOptions, timestampFields } from './schemaHelpers';

const customerRatingSummarySchema = new Schema(
  {
    average: { type: Number, default: 0, min: 0, max: 5 },
    count: { type: Number, default: 0, min: 0 },
  },
  { _id: false },
);

const userSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    email: { type: String, required: true, trim: true, lowercase: true },
    emailNormalized: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
      lowercase: true,
    },
    phone: { type: String, required: true, trim: true, maxlength: 30 },
    passwordHash: { type: String, required: true, select: false },
    role: {
      type: String,
      enum: Object.values(ROLES),
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: Object.values(USER_STATUSES),
      default: USER_STATUSES.ACTIVE,
      index: true,
    },
    emailVerifiedAt: { type: Date, default: null },
    phoneVerifiedAt: { type: Date, default: null },
    customerRatingSummary: {
      type: customerRatingSummarySchema,
      default: () => ({}),
    },
    termsAcceptedAt: { type: Date, default: null },
    privacyAcceptedAt: { type: Date, default: null },
    lastLoginAt: { type: Date, default: null },
    failedLoginAttempts: { type: Number, default: 0 },
    lockedUntil: { type: Date, default: null },
    ...timestampFields,
  },
  baseSchemaOptions,
);

userSchema.index({ role: 1, status: 1 });

export type UserDoc = InferSchemaType<typeof userSchema>;
export const User = model('User', userSchema);

const verificationCodeSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    channel: {
      type: String,
      enum: Object.values(VERIFICATION_CHANNELS),
      required: true,
    },
    codeHash: { type: String, required: true },
    expiresAt: { type: Date, required: true },
    consumedAt: { type: Date, default: null },
    attempts: { type: Number, default: 0, min: 0 },
    ...timestampFields,
  },
  baseSchemaOptions,
);

verificationCodeSchema.index({ userId: 1, channel: 1, createdAt: -1 });
verificationCodeSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export type VerificationCodeDoc = InferSchemaType<
  typeof verificationCodeSchema
>;
export const VerificationCode = model('VerificationCode', verificationCodeSchema);

const sessionSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    tokenHash: { type: String, required: true, unique: true },
    expiresAt: { type: Date, required: true },
    revokedAt: { type: Date, default: null },
    ipAddress: { type: String, default: null },
    userAgent: { type: String, default: null },
    ...timestampFields,
  },
  baseSchemaOptions,
);

sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export type SessionDoc = InferSchemaType<typeof sessionSchema>;
export const Session = model('Session', sessionSchema);

const passwordResetTokenSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    tokenHash: { type: String, required: true, unique: true },
    expiresAt: { type: Date, required: true },
    usedAt: { type: Date, default: null },
    ...timestampFields,
  },
  baseSchemaOptions,
);

passwordResetTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export type PasswordResetTokenDoc = InferSchemaType<
  typeof passwordResetTokenSchema
>;
export const PasswordResetToken = model(
  'PasswordResetToken',
  passwordResetTokenSchema,
);
