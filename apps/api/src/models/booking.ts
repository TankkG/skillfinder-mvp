import { Schema, model, type InferSchemaType } from 'mongoose';
import {
  BOOKING_STATUSES,
  LOCATION_TYPES,
} from '@skillfinder/shared';
import {
  baseSchemaOptions,
  pointSchema,
  timestampFields,
} from './schemaHelpers';

const bookingSchema = new Schema(
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
    serviceId: {
      type: Schema.Types.ObjectId,
      ref: 'Service',
      required: true,
      index: true,
    },
    startAt: { type: Date, required: true, index: true },
    endAt: { type: Date, required: true },
    timezone: { type: String, default: 'America/La_Paz' },
    status: {
      type: String,
      enum: Object.values(BOOKING_STATUSES),
      default: BOOKING_STATUSES.PENDING_PROFESSIONAL,
      index: true,
    },
    notes: { type: String, default: '', maxlength: 1000 },
    serviceLocationType: {
      type: String,
      enum: Object.values(LOCATION_TYPES),
      default: LOCATION_TYPES.AT_BUSINESS,
    },
    serviceLocation: { type: pointSchema, default: null },
    serviceName: { type: String, default: '' },
    customerName: { type: String, default: '' },
    professionalName: { type: String, default: '' },
    idempotencyKey: { type: String, default: null },
    holdExpiresAt: { type: Date, default: null, index: true },
    acceptedAt: { type: Date, default: null },
    rejectedAt: { type: Date, default: null },
    cancelledAt: { type: Date, default: null },
    cancelledBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    cancellationReason: { type: String, default: null },
    startedAt: { type: Date, default: null },
    completedAt: { type: Date, default: null },
    noShowAt: { type: Date, default: null },
    expiredAt: { type: Date, default: null },
    reminder24hSentAt: { type: Date, default: null },
    reminder1hSentAt: { type: Date, default: null },
    ...timestampFields,
  },
  baseSchemaOptions,
);

bookingSchema.index({ professionalId: 1, startAt: 1, status: 1 });
bookingSchema.index({ customerId: 1, startAt: -1, status: 1 });
bookingSchema.index(
  { customerId: 1, idempotencyKey: 1 },
  {
    unique: true,
    partialFilterExpression: { idempotencyKey: { $type: 'string' } },
  },
);
bookingSchema.index({ status: 1, holdExpiresAt: 1 });

export type BookingDoc = InferSchemaType<typeof bookingSchema>;
export const Booking = model('Booking', bookingSchema);

export const LOCK_STATUSES = {
  PENDING: 'PENDING',
  CONFIRMED: 'CONFIRMED',
} as const;
export type LockStatus = (typeof LOCK_STATUSES)[keyof typeof LOCK_STATUSES];

const bookingSlotLockSchema = new Schema(
  {
    professionalId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    slotStartAt: { type: Date, required: true },
    bookingId: {
      type: Schema.Types.ObjectId,
      ref: 'Booking',
      required: true,
      index: true,
    },
    lockStatus: {
      type: String,
      enum: Object.values(LOCK_STATUSES),
      default: LOCK_STATUSES.PENDING,
    },
    expiresAt: { type: Date, default: null, index: true },
    ...timestampFields,
  },
  baseSchemaOptions,
);

bookingSlotLockSchema.index(
  { professionalId: 1, slotStartAt: 1 },
  { unique: true },
);

export type BookingSlotLockDoc = InferSchemaType<
  typeof bookingSlotLockSchema
>;
export const BookingSlotLock = model(
  'BookingSlotLock',
  bookingSlotLockSchema,
);
