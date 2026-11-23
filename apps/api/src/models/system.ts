import { Schema, model, type InferSchemaType } from 'mongoose';
import { CONTENT_KINDS } from '@skillfinder/shared';
import { baseSchemaOptions, timestampFields } from './schemaHelpers';

const auditLogSchema = new Schema(
  {
    actorId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    action: { type: String, required: true, index: true },
    entityType: { type: String, required: true, index: true },
    entityId: { type: String, default: null, index: true },
    result: {
      type: String,
      enum: ['SUCCESS', 'FAILURE'],
      default: 'SUCCESS',
    },
    metadata: { type: Schema.Types.Mixed, default: {} },
    ipAddress: { type: String, default: null },
    userAgent: { type: String, default: null },
    ...timestampFields,
  },
  baseSchemaOptions,
);

auditLogSchema.index({ createdAt: -1 });

export type AuditLogDoc = InferSchemaType<typeof auditLogSchema>;
export const AuditLog = model('AuditLog', auditLogSchema);

const serviceAreaSchema = new Schema(
  {
    code: { type: String, required: true, unique: true, uppercase: true },
    name: { type: String, required: true },
    municipality: { type: String, default: '' },
    department: { type: String, default: '' },
    country: { type: String, default: 'Bolivia' },
    boundary: {
      type: {
        type: String,
        enum: ['Polygon'],
        required: true,
      },
      coordinates: {
        type: [[[Number]]],
        required: true,
        validate: {
          validator: (rings: number[][][]) =>
            Array.isArray(rings) &&
            rings.length > 0 &&
            Array.isArray(rings[0]) &&
            rings[0].length >= 4,
          message: 'El poligono debe tener al menos 4 puntos.',
        },
      },
    },
    active: { type: Boolean, default: true, index: true },
    sourceReference: { type: String, default: '' },
    ...timestampFields,
  },
  baseSchemaOptions,
);

serviceAreaSchema.index({ boundary: '2dsphere' });

export type ServiceAreaDoc = InferSchemaType<typeof serviceAreaSchema>;
export const ServiceArea = model('ServiceArea', serviceAreaSchema);

const contentFaqItemSchema = new Schema(
  {
    question: { type: String, required: true, maxlength: 300 },
    answer: { type: String, required: true, maxlength: 4000 },
  },
  { _id: false },
);

const contentEntrySchema = new Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      maxlength: 80,
    },
    kind: {
      type: String,
      enum: Object.values(CONTENT_KINDS),
      default: CONTENT_KINDS.INFO,
      index: true,
    },
    title: { type: String, required: true, trim: true, maxlength: 160 },
    body: { type: String, default: '', maxlength: 12000 },
    items: { type: [contentFaqItemSchema], default: [] },
    published: { type: Boolean, default: true, index: true },
    sortOrder: { type: Number, default: 0 },
    ...timestampFields,
  },
  baseSchemaOptions,
);

export type ContentEntryDoc = InferSchemaType<typeof contentEntrySchema>;
export const ContentEntry = model('ContentEntry', contentEntrySchema);
