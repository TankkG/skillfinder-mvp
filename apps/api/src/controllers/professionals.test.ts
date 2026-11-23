import mongoose from 'mongoose';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import {
  MODERATION_STATUSES,
  REVIEW_DIRECTIONS,
  ROLES,
} from '@skillfinder/shared';
import app from '../app';
import { Review } from '../models';
import {
  cleanDatabase,
  createClient,
  createProfessional,
  startTestDatabase,
  stopTestDatabase,
} from '../__tests__/helpers';

const publishedReview = (input: {
  reviewerId: string;
  revieweeId: string;
  rating: number;
}) =>
  Review.create({
    bookingId: new mongoose.Types.ObjectId(),
    reviewerId: input.reviewerId,
    revieweeId: input.revieweeId,
    reviewerRole: ROLES.CLIENT,
    direction: REVIEW_DIRECTIONS.CUSTOMER_TO_PROFESSIONAL,
    rating: input.rating,
    comment: 'Resena de prueba',
    moderationStatus: MODERATION_STATUSES.PUBLISHED,
  });

describe('ranking semanal de profesionales', () => {
  beforeAll(async () => {
    await startTestDatabase();
  });

  afterAll(async () => {
    await stopTestDatabase();
  });

  beforeEach(async () => {
    await cleanDatabase();
  });

  it('incluye solo profesionales publicos con al menos dos resenas publicadas', async () => {
    const eligible = await createProfessional();
    const excluded = await createProfessional();
    const firstClient = await createClient();
    const secondClient = await createClient();
    const thirdClient = await createClient();

    await publishedReview({
      reviewerId: String(firstClient._id),
      revieweeId: String(eligible.user._id),
      rating: 5,
    });
    await publishedReview({
      reviewerId: String(secondClient._id),
      revieweeId: String(eligible.user._id),
      rating: 4,
    });
    await publishedReview({
      reviewerId: String(thirdClient._id),
      revieweeId: String(excluded.user._id),
      rating: 5,
    });

    const response = await request(app).get(
      '/api/professionals/leaderboard/weekly',
    );

    expect(response.status).toBe(200);
    expect(response.body.minimumReviews).toBe(2);
    expect(response.body.items).toHaveLength(1);
    expect(response.body.items[0]).toMatchObject({
      id: String(eligible.profile._id),
      weeklyAverage: 4.5,
      weeklyReviews: 2,
      completedBookings: 0,
    });
  });
});
