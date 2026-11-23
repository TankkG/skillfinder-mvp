import { Schema, model, type InferSchemaType } from 'mongoose';
import {
  DOCUMENT_STATUSES,
  EXCEPTION_TYPES,
  VERIFICATION_STATUSES,
} from '@skillfinder/shared';
import {
  baseSchemaOptions,
  intervalSchema,
  pointSchema,
  timestampFields,
} from './schemaHelpers';

const serviceCategorySchema = new Schema(
  {
    code: { type: String, required: true, unique: true, uppercase: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    parentId: {
      type: Schema.Types.ObjectId,
      ref: 'ServiceCategory',
      default: null,
      index: true,
    },
    isSpecialty: { type: Boolean, default: false, index: true },
    active: { type: Boolean, default: true, index: true },
    sortOrder: { type: Number, default: 0 },
    ...timestampFields,
  },
  baseSchemaOptions,
);

export type ServiceCategoryDoc = InferSchemaType<
  typeof serviceCategorySchema
>;
export const ServiceCategory = model(
  'ServiceCategory',
  serviceCategorySchema,
);

const ratingSummarySchema = new Schema(
  {
    average: { type: Number, default: 0, min: 0, max: 5 },
    count: { type: Number, default: 0, min: 0 },
  },
  { _id: false },
);

const professionalProfileSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    displayName: { type: String, required: true, trim: true, maxlength: 120 },
    businessName: { type: String, required: true, trim: true, maxlength: 160 },
    description: { type: String, default: '', maxlength: 2000 },
    categories: {
      type: [String],
      default: [],
      validate: {
        validator: (values: string[]) =>
          values.every((value) => ['MEC', 'CHA', 'GOM', 'ELA'].includes(value)),
        message: 'Solo se permiten las cuatro categorias automotrices del MVP.',
      },
    },
    specialties: { type: [String], default: [] },
    addressText: { type: String, default: '', maxlength: 300 },
    location: { type: pointSchema, required: true },
    serviceAreaId: {
      type: Schema.Types.ObjectId,
      ref: 'ServiceArea',
      default: null,
      index: true,
    },
    scheduleSummary: { type: String, default: '' },
    verificationStatus: {
      type: String,
      enum: Object.values(VERIFICATION_STATUSES),
      default: VERIFICATION_STATUSES.PENDING_VERIFICATION,
      index: true,
    },
    isVisible: { type: Boolean, default: false, index: true },
    ratingSummary: { type: ratingSummarySchema, default: () => ({}) },
    photoUrl: { type: String, default: null },
    offersHomeService: { type: Boolean, default: false },
    verificationNotes: { type: String, default: '' },
    approvedAt: { type: Date, default: null },
    ...timestampFields,
  },
  baseSchemaOptions,
);

professionalProfileSchema.index({ location: '2dsphere' });
professionalProfileSchema.index({
  categories: 1,
  verificationStatus: 1,
  isVisible: 1,
});
professionalProfileSchema.index({ 'ratingSummary.average': -1 });

export type ProfessionalProfileDoc = InferSchemaType<
  typeof professionalProfileSchema
>;
export const ProfessionalProfile = model(
  'ProfessionalProfile',
  professionalProfileSchema,
);

const serviceSchema = new Schema(
  {
    professionalId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    categoryId: {
      type: Schema.Types.ObjectId,
      ref: 'ServiceCategory',
      required: true,
      index: true,
    },
    categoryCode: { type: String, required: true, uppercase: true },
    specialtyId: {
      type: Schema.Types.ObjectId,
      ref: 'ServiceCategory',
      default: null,
    },
    specialtyName: { type: String, default: null },
    name: { type: String, required: true, trim: true, maxlength: 160 },
    description: { type: String, default: '', maxlength: 1000 },
    estimatedDurationMinutes: {
      type: Number,
      required: true,
      min: 15,
      max: 480,
      validate: {
        validator: (value: number) => value % 15 === 0,
        message: 'La duracion debe ser multiple de 15 minutos.',
      },
    },
    estimatedPrice: { type: Number, default: null, min: 0 },
    active: { type: Boolean, default: true, index: true },
    ...timestampFields,
  },
  baseSchemaOptions,
);

serviceSchema.index({ professionalId: 1, active: 1 });

export type ServiceDoc = InferSchemaType<typeof serviceSchema>;
export const Service = model('Service', serviceSchema);

const weeklyScheduleSchema = new Schema(
  {
    professionalId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    dayOfWeek: { type: Number, required: true, min: 0, max: 6 },
    intervals: { type: [intervalSchema], default: [] },
    breaks: { type: [intervalSchema], default: [] },
    active: { type: Boolean, default: true },
    timezone: { type: String, default: 'America/La_Paz' },
    ...timestampFields,
  },
  baseSchemaOptions,
);

weeklyScheduleSchema.index(
  { professionalId: 1, dayOfWeek: 1 },
  { unique: true },
);

export type WeeklyScheduleDoc = InferSchemaType<typeof weeklyScheduleSchema>;
export const WeeklySchedule = model(
  'WeeklySchedule',
  weeklyScheduleSchema,
);

const availabilityExceptionSchema = new Schema(
  {
    professionalId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    startAt: { type: Date, required: true, index: true },
    endAt: { type: Date, required: true },
    type: {
      type: String,
      enum: Object.values(EXCEPTION_TYPES),
      default: EXCEPTION_TYPES.BLOCKED,
    },
    reason: { type: String, default: '', maxlength: 300 },
    ...timestampFields,
  },
  baseSchemaOptions,
);

availabilityExceptionSchema.index({ professionalId: 1, startAt: 1, endAt: 1 });

export type AvailabilityExceptionDoc = InferSchemaType<
  typeof availabilityExceptionSchema
>;
export const AvailabilityException = model(
  'AvailabilityException',
  availabilityExceptionSchema,
);

const verificationDocumentSchema = new Schema(
  {
    professionalId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    documentType: { type: String, required: true, trim: true, maxlength: 80 },
    storageReference: { type: String, required: true },
    originalName: { type: String, default: '' },
    mimeType: { type: String, default: '' },
    size: { type: Number, default: 0 },
    status: {
      type: String,
      enum: Object.values(DOCUMENT_STATUSES),
      default: DOCUMENT_STATUSES.PENDING,
      index: true,
    },
    reviewedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    reviewedAt: { type: Date, default: null },
    rejectionReason: { type: String, default: null },
    ...timestampFields,
  },
  baseSchemaOptions,
);

verificationDocumentSchema.index({ professionalId: 1, createdAt: -1 });

export type VerificationDocumentDoc = InferSchemaType<
  typeof verificationDocumentSchema
>;
export const VerificationDocument = model(
  'VerificationDocument',
  verificationDocumentSchema,
);
