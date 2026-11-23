import { Schema } from 'mongoose';

export const pointSchema = new Schema(
  {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point',
      required: true,
    },
    coordinates: {
      type: [Number],
      required: true,
      validate: {
        validator: (value: number[]) =>
          Array.isArray(value) &&
          value.length === 2 &&
          Number.isFinite(value[0]) &&
          Number.isFinite(value[1]) &&
          value[1] >= -90 &&
          value[1] <= 90 &&
          value[0] >= -180 &&
          value[0] <= 180,
        message: 'Coordenadas GeoJSON invalidas (orden [longitud, latitud]).',
      },
    },
  },
  { _id: false },
);

export const intervalSchema = new Schema(
  {
    start: { type: String, required: true, match: /^([01]\d|2[0-3]):[0-5]\d$/ },
    end: { type: String, required: true, match: /^([01]\d|2[0-3]):[0-5]\d$/ },
  },
  { _id: false },
);

export const timestampFields = {
  createdAt: { type: Date, default: () => new Date() },
  updatedAt: { type: Date, default: () => new Date() },
};

export const baseSchemaOptions = {
  timestamps: true,
  versionKey: false,
  toJSON: {
    virtuals: true,
    transform: (_doc: unknown, ret: Record<string, unknown>) => {
      ret.id = ret._id;
      delete ret._id;
      delete ret.__v;
      delete ret.passwordHash;
      delete ret.refreshTokenHash;
      return ret;
    },
  },
} as const;
