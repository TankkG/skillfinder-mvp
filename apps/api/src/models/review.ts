import { Schema, model, type InferSchemaType } from 'mongoose';
import {
  MODERATION_STATUSES,
  REVIEW_DIRECTIONS,
  ROLES,
} from '@skillfinder/shared';
import { baseSchemaOptions, timestampFields } from './schemaHelpers';

const reviewSchema = new Schema(
  {
    bookingId: {
      type: Schema.Types.ObjectId,
      ref: 'Booking',
      required: true,
      index: true,
    },
    reviewerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    revieweeId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    reviewerRole: {
      type: String,
      enum: Object.values(ROLES),
      required: true,
    },
    direction: {
      type: String,
      enum: Object.values(REVIEW_DIRECTIONS),
      required: true,
    },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, default: '', maxlength: 1000 },
    moderationStatus: {
      type: String,
      enum: Object.values(MODERATION_STATUSES),
      default: MODERATION_STATUSES.PUBLISHED,
      index: true,
    },
    moderationNote: { type: String, default: null },
    reportCount: { type: Number, default: 0 },
    ...timestampFields,
  },
  baseSchemaOptions,
);

reviewSchema.index({ bookingId: 1, reviewerId: 1 }, { unique: true });
reviewSchema.index({ revieweeId: 1, moderationStatus: 1, createdAt: -1 });

export type ReviewDoc = InferSchemaType<typeof reviewSchema>;
export const Review = model('Review', reviewSchema);
