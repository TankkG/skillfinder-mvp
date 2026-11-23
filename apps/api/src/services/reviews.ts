import mongoose from 'mongoose';
import {
  BOOKING_STATUSES,
  MODERATION_STATUSES,
  REVIEW_DIRECTIONS,
  ROLES,
  type ReviewDirection,
} from '@skillfinder/shared';
import { Booking, ProfessionalProfile, Review, User } from '../models';
import { notifyUser } from './notifications';
import { ApiError } from '../utils/errors';

export const createReview = async (input: {
  userId: string;
  role: 'CLIENT' | 'PROFESSIONAL' | 'ADMIN';
  bookingId: string;
  rating: number;
  comment?: string;
}) => {
  if (!mongoose.isValidObjectId(input.bookingId)) {
    throw ApiError.badRequest('Identificador de reserva invalido.');
  }
  const booking = await Booking.findById(input.bookingId);
  if (!booking) throw ApiError.notFound('La reserva no existe.');

  if (booking.status !== BOOKING_STATUSES.COMPLETED) {
    throw ApiError.unprocessable(
      'Solo se puede calificar una reserva con el servicio finalizado.',
    );
  }

  const isCustomer = String(booking.customerId) === input.userId;
  const isProfessional = String(booking.professionalId) === input.userId;
  if (!isCustomer && !isProfessional) {
    throw ApiError.forbidden('No participaste en esta reserva.');
  }

  const direction: ReviewDirection = isCustomer
    ? REVIEW_DIRECTIONS.CUSTOMER_TO_PROFESSIONAL
    : REVIEW_DIRECTIONS.PROFESSIONAL_TO_CUSTOMER;
  const revieweeId = isCustomer
    ? String(booking.professionalId)
    : String(booking.customerId);

  const existing = await Review.findOne({
    bookingId: booking._id,
    reviewerId: input.userId,
  });
  if (existing) {
    throw ApiError.conflict('Ya calificaste esta reserva.');
  }

  let review;
  try {
    review = await Review.create({
      bookingId: booking._id,
      reviewerId: input.userId,
      revieweeId,
      reviewerRole: isCustomer ? ROLES.CLIENT : ROLES.PROFESSIONAL,
      direction,
      rating: input.rating,
      comment: input.comment ?? '',
      moderationStatus: MODERATION_STATUSES.PUBLISHED,
    });
  } catch (error) {
    if (
      error &&
      typeof error === 'object' &&
      (error as { code?: number }).code === 11000
    ) {
      throw ApiError.conflict('Ya calificaste esta reserva.');
    }
    throw error;
  }

  const reviewer = await User.findById(input.userId).select('name');

  await notifyUser({
    userId: revieweeId,
    type: 'REVIEW_RECEIVED',
    title: 'Nueva calificacion recibida',
    message: `${reviewer?.name ?? 'Un usuario'} califico la reserva del ${booking.startAt.toISOString()} con ${input.rating} estrellas.`,
    entityType: 'BOOKING',
    entityId: String(booking._id),
  });

  if (direction === REVIEW_DIRECTIONS.CUSTOMER_TO_PROFESSIONAL) {
    await recalculateProfessionalRating(String(booking.professionalId));
  } else {
    await recalculateCustomerRating(String(booking.customerId));
  }

  return review;
};

export const recalculateProfessionalRating = async (
  professionalId: string,
): Promise<void> => {
  const [stats] = await Review.aggregate<{ average: number; count: number }>([
    {
      $match: {
        revieweeId: new mongoose.Types.ObjectId(professionalId),
        direction: REVIEW_DIRECTIONS.CUSTOMER_TO_PROFESSIONAL,
        moderationStatus: MODERATION_STATUSES.PUBLISHED,
      },
    },
    {
      $group: {
        _id: null,
        average: { $avg: '$rating' },
        count: { $sum: 1 },
      },
    },
  ]);

  const average = stats ? Math.round(stats.average * 100) / 100 : 0;
  const count = stats?.count ?? 0;

  await ProfessionalProfile.updateOne(
    { userId: professionalId },
    { $set: { 'ratingSummary.average': average, 'ratingSummary.count': count } },
  );
};

export const recalculateCustomerRating = async (
  customerId: string,
): Promise<void> => {
  const [stats] = await Review.aggregate<{ average: number; count: number }>([
    {
      $match: {
        revieweeId: new mongoose.Types.ObjectId(customerId),
        direction: REVIEW_DIRECTIONS.PROFESSIONAL_TO_CUSTOMER,
        moderationStatus: MODERATION_STATUSES.PUBLISHED,
      },
    },
    {
      $group: {
        _id: null,
        average: { $avg: '$rating' },
        count: { $sum: 1 },
      },
    },
  ]);

  const average = stats ? Math.round(stats.average * 100) / 100 : 0;
  const count = stats?.count ?? 0;

  await User.updateOne(
    { _id: customerId },
    {
      $set: {
        'customerRatingSummary.average': average,
        'customerRatingSummary.count': count,
      },
    },
  );
};

export const refreshRatingForReviewee = async (
  direction: ReviewDirection,
  revieweeId: string,
): Promise<void> => {
  if (direction === REVIEW_DIRECTIONS.CUSTOMER_TO_PROFESSIONAL) {
    await recalculateProfessionalRating(revieweeId);
  } else {
    await recalculateCustomerRating(revieweeId);
  }
};

export const refreshProfessionalRatingForReviewee = async (
  revieweeId: string,
): Promise<void> => {
  await recalculateProfessionalRating(revieweeId);
};
