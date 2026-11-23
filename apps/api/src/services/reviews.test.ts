import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import {
  MODERATION_STATUSES,
  REVIEW_DIRECTIONS,
  ROLES,
} from '@skillfinder/shared';
import { ProfessionalProfile, Review } from '../models';
import { recalculateProfessionalRating } from './reviews';
import {
  cleanDatabase,
  createClient,
  createCompletedBooking,
  createProfessional,
  createService,
  startTestDatabase,
  stopTestDatabase,
} from '../__tests__/helpers';

describe('recalculo de calificaciones', () => {
  beforeAll(async () => {
    await startTestDatabase();
  });

  afterAll(async () => {
    await stopTestDatabase();
  });

  beforeEach(async () => {
    await cleanDatabase();
  });

  it('promedia solo resenas publicadas cliente-profesional', async () => {
    const { user: professional } = await createProfessional();
    const service = await createService(String(professional._id), 60);
    const [clientA, clientB] = await Promise.all([createClient('A'), createClient('B')]);

    const bookingA = await createCompletedBooking({
      customerId: String(clientA._id),
      professionalId: String(professional._id),
      serviceId: String(service._id),
    });
    const bookingB = await createCompletedBooking({
      customerId: String(clientB._id),
      professionalId: String(professional._id),
      serviceId: String(service._id),
    });

    await Review.create([
      {
        bookingId: bookingA._id,
        reviewerId: clientA._id,
        revieweeId: professional._id,
        reviewerRole: ROLES.CLIENT,
        direction: REVIEW_DIRECTIONS.CUSTOMER_TO_PROFESSIONAL,
        rating: 5,
        moderationStatus: MODERATION_STATUSES.PUBLISHED,
      },
      {
        bookingId: bookingB._id,
        reviewerId: clientB._id,
        revieweeId: professional._id,
        reviewerRole: ROLES.CLIENT,
        direction: REVIEW_DIRECTIONS.CUSTOMER_TO_PROFESSIONAL,
        rating: 3,
        moderationStatus: MODERATION_STATUSES.PUBLISHED,
      },
      {
        bookingId: bookingB._id,
        reviewerId: professional._id,
        revieweeId: clientB._id,
        reviewerRole: ROLES.PROFESSIONAL,
        direction: REVIEW_DIRECTIONS.PROFESSIONAL_TO_CUSTOMER,
        rating: 1,
        moderationStatus: MODERATION_STATUSES.PUBLISHED,
      },
    ]);

    await recalculateProfessionalRating(String(professional._id));

    const profile = await ProfessionalProfile.findOne({
      userId: professional._id,
    }).lean();
    expect(profile?.ratingSummary?.average).toBe(4);
    expect(profile?.ratingSummary?.count).toBe(2);
  });
});
