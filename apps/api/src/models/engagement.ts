import { Schema, model, type InferSchemaType } from 'mongoose';
import { ROLES } from '@skillfinder/shared';
import { baseSchemaOptions, timestampFields } from './schemaHelpers';

const notificationSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    type: { type: String, required: true, maxlength: 80 },
    title: { type: String, required: true, maxlength: 160 },
    message: { type: String, required: true, maxlength: 500 },
    entityType: { type: String, default: null },
    entityId: { type: String, default: null },
    readAt: { type: Date, default: null },
    deliveryStatus: {
      type: String,
      enum: ['PENDING', 'DELIVERED', 'FAILED', 'SKIPPED'],
      default: 'DELIVERED',
    },
    ...timestampFields,
  },
  baseSchemaOptions,
);

notificationSchema.index({ userId: 1, createdAt: -1 });

export type NotificationDoc = InferSchemaType<typeof notificationSchema>;
export const Notification = model('Notification', notificationSchema);

const favoriteSchema = new Schema(
  {
    customerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    professionalId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    ...timestampFields,
  },
  baseSchemaOptions,
);

favoriteSchema.index(
  { customerId: 1, professionalId: 1 },
  { unique: true },
);

export type FavoriteDoc = InferSchemaType<typeof favoriteSchema>;
export const Favorite = model('Favorite', favoriteSchema);

const bookingMessageSchema = new Schema(
  {
    bookingId: {
      type: Schema.Types.ObjectId,
      ref: 'Booking',
      required: true,
      index: true,
    },
    senderId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    senderName: { type: String, default: '' },
    senderRole: {
      type: String,
      enum: Object.values(ROLES),
      required: true,
    },
    message: { type: String, required: true, maxlength: 1000 },
    ...timestampFields,
  },
  baseSchemaOptions,
);

bookingMessageSchema.index({ bookingId: 1, createdAt: 1 });

export type BookingMessageDoc = InferSchemaType<typeof bookingMessageSchema>;
export const BookingMessage = model('BookingMessage', bookingMessageSchema);

const reportSchema = new Schema(
  {
    reporterId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    targetType: {
      type: String,
      enum: ['PROFILE', 'REVIEW', 'BOOKING', 'USER', 'OTHER'],
      required: true,
    },
    targetId: { type: String, required: true, index: true },
    reason: { type: String, required: true, maxlength: 160 },
    description: { type: String, default: '', maxlength: 1000 },
    status: {
      type: String,
      enum: ['OPEN', 'IN_REVIEW', 'RESOLVED', 'DISMISSED'],
      default: 'OPEN',
      index: true,
    },
    assignedAdminId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    resolution: { type: String, default: null },
    resolvedAt: { type: Date, default: null },
    ...timestampFields,
  },
  baseSchemaOptions,
);

reportSchema.index({ status: 1, createdAt: -1 });

export type ReportDoc = InferSchemaType<typeof reportSchema>;
export const Report = model('Report', reportSchema);
