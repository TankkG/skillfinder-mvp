import mongoose from 'mongoose';
import { logger } from '../config/logger';
import { env } from '../config/env';
import {
  AuditLog,
  Booking,
  ProfessionalProfile,
  Review,
  Service,
  ServiceArea,
  User,
} from '../models';
import {
  auditEventsTotal,
  bidirectionalReviewRatio,
  bookingConfirmationRatio,
  bookingDemandByDistrict,
  bookingEventsTotal,
  bookingsByStatus,
  bookingsCreatedByWeek,
  bookingsMonthly,
  clientRanking,
  databaseConnected,
  metricsLastRefreshTimestamp,
  metricsRefreshErrors,
  moderationBlockedUsers,
  moderationHiddenReviews,
  postServiceFeedbackAverage,
  professionalRanking,
  professionalsByVerification,
  professionalsVerifiedRatio,
  reviewAverage,
  reviewCount,
  reviewRatingDistribution,
  reviewRatingDistributionByCategory,
  servicesCompletedByCategory,
  serviceCategoryInfo,
  userRegistrationTarget,
  usersRegistered,
} from './registry';

type CountRow = { _id: string; count: number };
type MonthlyRow = { _id: { month: string; status: string }; count: number };
type WeeklyBookingRow = { week: string; count: number };
type ServiceRow = { _id: { category: string; subservice: string }; count: number };
const asCount = (value: unknown): number =>
  typeof value === 'number' && Number.isFinite(value) ? value : 0;

const VERIFICATION_STATUSES = [
  'INCOMPLETE',
  'PENDING_VERIFICATION',
  'APPROVED',
  'REJECTED',
  'REQUIRES_CORRECTION',
  'SUSPENDED',
] as const;
const BOOKING_STATUSES = [
  'PENDING_PROFESSIONAL',
  'CONFIRMED',
  'IN_PROGRESS',
  'COMPLETED',
  'REJECTED',
  'CANCELLED_BY_CLIENT',
  'CANCELLED_BY_PROFESSIONAL',
  'EXPIRED',
  'NO_SHOW',
] as const;
const REVIEW_DIRECTIONS = [
  'CUSTOMER_TO_PROFESSIONAL',
  'PROFESSIONAL_TO_CUSTOMER',
] as const;
const CATEGORY_CODES = ['MEC', 'CHA', 'GOM', 'ELA'] as const;
const RATINGS = [1, 2, 3, 4, 5] as const;

/**
 * Escribe una serie por cada valor esperado y usa 0 cuando la base aun no
 * tiene registros. Asi Grafana no muestra "No data" en los paneles.
 */
const setCounterRowsWithZeros = (
  metric: { set: (value: number, labels?: Record<string, string | number>) => void },
  rows: Array<{ _id: string; count: number }>,
  labelName: string,
  expectedValues: readonly string[],
): void => {
  const counts = new Map(rows.map((row) => [row._id, asCount(row.count)]));
  for (const value of expectedValues) {
    metric.set(counts.get(value) ?? 0, { [labelName]: value });
  }
  for (const [value, count] of counts) {
    if (!expectedValues.includes(value)) metric.set(count, { [labelName]: value });
  }
};

const monthStart = (): Date => {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 11, 1));
};

const pseudonymFor = (index: number): string => {
  let n = index;
  let result = '';
  do {
    result = String.fromCharCode(65 + (n % 26)) + result;
    n = Math.floor(n / 26) - 1;
  } while (n >= 0);
  return `Cliente ${result}`;
};

export const refreshBusinessMetrics = async (): Promise<void> => {
  if (mongoose.connection.readyState !== 1) {
    databaseConnected.set(0);
    return;
  }

  try {
    const [
      registeredClients,
      registeredProfessionals,
      verificationRows,
      bookingStatusRows,
      totalBookings,
      confirmedBookings,
      monthlyRows,
      weeklyBookingRows,
      reviewRows,
      completedBookingCount,
      bidirectionalRows,
      feedbackRows,
      blockedUsers,
      hiddenReviews,
      auditRows,
      districtRows,
      categoryServiceRows,
      professionalCompletionRows,
      professionalRankingRows,
      completedByCustomerRows,
      customerReviewRows,
      ratingDistributionRows,
      categoryRatingDistributionRows,
    ] = await Promise.all([
      User.countDocuments({ role: 'CLIENT' }),
      User.countDocuments({ role: 'PROFESSIONAL' }),
      ProfessionalProfile.aggregate([
        { $group: { _id: '$verificationStatus', count: { $sum: 1 } } },
      ]) as Promise<CountRow[]>,
      Booking.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]) as Promise<CountRow[]>,
      Booking.countDocuments(),
      Booking.countDocuments({
        status: { $in: ['CONFIRMED', 'IN_PROGRESS', 'COMPLETED'] },
      }),
      Booking.aggregate([
        {
          $project: {
            status: 1,
            eventDate: {
              $switch: {
                branches: [
                  {
                    case: { $eq: ['$status', 'COMPLETED'] },
                    then: { $ifNull: ['$completedAt', '$updatedAt'] },
                  },
                  {
                    case: {
                      $in: [
                        '$status',
                        ['CANCELLED_BY_CLIENT', 'CANCELLED_BY_PROFESSIONAL'],
                      ],
                    },
                    then: { $ifNull: ['$cancelledAt', '$updatedAt'] },
                  },
                ],
                default: '$createdAt',
              },
            },
          },
        },
        { $match: { eventDate: { $gte: monthStart() } } },
        {
          $match: {
            status: {
              $in: [
                'COMPLETED',
                'CANCELLED_BY_CLIENT',
                'CANCELLED_BY_PROFESSIONAL',
              ],
            },
          },
        },
        {
          $project: {
            status: {
              $cond: [
                { $eq: ['$status', 'COMPLETED'] },
                'COMPLETED',
                'CANCELLED',
              ],
            },
            month: {
              $dateToString: {
                format: '%Y-%m',
                date: '$eventDate',
                timezone: env.DEFAULT_TIMEZONE,
              },
            },
          },
        },
        {
          $group: {
            _id: { month: '$month', status: '$status' },
            count: { $sum: 1 },
          },
        },
        { $sort: { '_id.month': 1 } },
      ]) as Promise<MonthlyRow[]>,
      Booking.aggregate([
        {
          $match: {
            createdAt: { $gte: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000) },
          },
        },
        {
          $group: {
            _id: {
              $dateTrunc: {
                date: '$createdAt',
                unit: 'week',
                startOfWeek: 'monday',
                timezone: env.DEFAULT_TIMEZONE,
              },
            },
            count: { $sum: 1 },
          },
        },
        {
          $project: {
            _id: 0,
            week: {
              $dateToString: {
                format: '%G-W%V',
                date: '$_id',
                timezone: env.DEFAULT_TIMEZONE,
              },
            },
            count: 1,
          },
        },
        { $sort: { week: 1 } },
      ]) as Promise<WeeklyBookingRow[]>,
      Review.aggregate([
        { $match: { moderationStatus: 'PUBLISHED' } },
        {
          $group: {
            _id: '$direction',
            average: { $avg: '$rating' },
            count: { $sum: 1 },
          },
        },
      ]) as Promise<Array<{ _id: string; average: number; count: number }>>,
      Booking.countDocuments({ status: 'COMPLETED' }),
      Review.aggregate([
        {
          $match: {
            moderationStatus: 'PUBLISHED',
            direction: {
              $in: ['CUSTOMER_TO_PROFESSIONAL', 'PROFESSIONAL_TO_CUSTOMER'],
            },
          },
        },
        {
          $group: {
            _id: '$bookingId',
            directions: { $addToSet: '$direction' },
          },
        },
        {
          $match: {
            directions: {
              $all: ['CUSTOMER_TO_PROFESSIONAL', 'PROFESSIONAL_TO_CUSTOMER'],
            },
          },
        },
        { $count: 'count' },
      ]) as Promise<Array<{ count: number }>>,
      Review.aggregate([
        { $match: { moderationStatus: 'PUBLISHED' } },
        {
          $lookup: {
            from: Booking.collection.name,
            localField: 'bookingId',
            foreignField: '_id',
            as: 'booking',
          },
        },
        { $unwind: '$booking' },
        { $match: { 'booking.status': 'COMPLETED' } },
        { $group: { _id: null, average: { $avg: '$rating' }, count: { $sum: 1 } } },
      ]) as Promise<Array<{ average: number; count: number }>>,
      User.countDocuments({ status: 'BLOCKED' }),
      Review.countDocuments({ moderationStatus: 'HIDDEN' }),
      AuditLog.aggregate([
        { $group: { _id: '$action', count: { $sum: 1 } } },
      ]) as Promise<CountRow[]>,
      Booking.aggregate([
        { $lookup: {
          from: ProfessionalProfile.collection.name,
          localField: 'professionalId',
          foreignField: 'userId',
          as: 'profile',
        } },
        { $unwind: '$profile' },
        { $lookup: {
          from: ServiceArea.collection.name,
          localField: 'profile.serviceAreaId',
          foreignField: '_id',
          as: 'area',
        } },
        { $unwind: '$area' },
        { $group: { _id: '$area.code', count: { $sum: 1 } } },
        { $match: { count: { $gte: env.GRAFANA_MIN_DISTRICT_RECORDS } } },
      ]) as Promise<CountRow[]>,
      Booking.aggregate([
        { $match: { status: 'COMPLETED' } },
        { $lookup: {
          from: Service.collection.name,
          localField: 'serviceId',
          foreignField: '_id',
          as: 'service',
        } },
        { $unwind: '$service' },
        {
          $group: {
            _id: {
              category: '$service.categoryCode',
              subservice: {
                $ifNull: ['$service.specialtyName', '$service.name'],
              },
            },
            count: { $sum: 1 },
          },
        },
        { $sort: { count: -1 } },
      ]) as Promise<ServiceRow[]>,
      Booking.aggregate([
        { $match: { status: 'COMPLETED' } },
        { $group: { _id: '$professionalId', completions: { $sum: 1 } } },
      ]) as Promise<Array<{ _id: mongoose.Types.ObjectId; completions: number }>>,
      Review.aggregate([
        {
          $match: {
            direction: 'CUSTOMER_TO_PROFESSIONAL',
            moderationStatus: 'PUBLISHED',
          },
        },
        {
          $group: {
            _id: '$revieweeId',
            average: { $avg: '$rating' },
            reviews: { $sum: 1 },
          },
        },
        { $match: { reviews: { $gte: 3 } } },
        { $lookup: {
          from: ProfessionalProfile.collection.name,
          localField: '_id',
          foreignField: 'userId',
          as: 'profile',
        } },
        { $unwind: '$profile' },
        { $unwind: '$profile.categories' },
        { $sort: { average: -1, reviews: -1 } },
        {
          $group: {
            _id: '$profile.categories',
            rows: {
              $push: {
                businessName: '$profile.businessName',
                average: '$average',
                reviews: '$reviews',
                professionalId: '$_id',
              },
            },
          },
        },
        { $project: { rows: { $slice: ['$rows', 10] } } },
      ]) as Promise<Array<{
        _id: string;
        rows: Array<{
          businessName: string;
          average: number;
          reviews: number;
          professionalId: mongoose.Types.ObjectId;
        }>;
      }>>,
      Booking.aggregate([
        { $match: { status: 'COMPLETED' } },
        { $group: { _id: '$customerId', services: { $sum: 1 } } },
        { $match: { services: { $gte: 2 } } },
        { $sort: { services: -1 } },
      ]) as Promise<Array<{ _id: mongoose.Types.ObjectId; services: number }>>,
      Review.aggregate([
        {
          $match: {
            direction: 'PROFESSIONAL_TO_CUSTOMER',
            moderationStatus: 'PUBLISHED',
          },
        },
        {
          $group: {
            _id: '$revieweeId',
            average: { $avg: '$rating' },
            reviews: { $sum: 1 },
          },
        },
      ]) as Promise<Array<{
        _id: mongoose.Types.ObjectId;
        average: number;
        reviews: number;
      }>>,
      Review.aggregate([
        { $match: { moderationStatus: 'PUBLISHED' } },
        {
          $group: {
            _id: { direction: '$direction', rating: '$rating' },
            count: { $sum: 1 },
          },
        },
      ]) as Promise<Array<{
        _id: { direction: string; rating: number };
        count: number;
      }>>,
      Review.aggregate([
        {
          $match: {
            moderationStatus: 'PUBLISHED',
            direction: 'CUSTOMER_TO_PROFESSIONAL',
          },
        },
        { $lookup: {
          from: ProfessionalProfile.collection.name,
          localField: 'revieweeId',
          foreignField: 'userId',
          as: 'profile',
        } },
        { $unwind: '$profile' },
        { $unwind: '$profile.categories' },
        {
          $group: {
            _id: { category: '$profile.categories', rating: '$rating' },
            count: { $sum: 1 },
          },
        },
      ]) as Promise<Array<{
        _id: { category: string; rating: number };
        count: number;
      }>>,
    ]);

    usersRegistered.set(registeredClients, { role: 'CLIENT' });
    usersRegistered.set(registeredProfessionals, { role: 'PROFESSIONAL' });
    userRegistrationTarget.set(20, { role: 'CLIENT' });
    userRegistrationTarget.set(10, { role: 'PROFESSIONAL' });

    const approvedProfessionals = verificationRows.find((row) => row._id === 'APPROVED')?.count ?? 0;
    professionalsVerifiedRatio.set(
      registeredProfessionals > 0 ? approvedProfessionals / registeredProfessionals : 0,
    );
    professionalsByVerification.reset();
    setCounterRowsWithZeros(
      professionalsByVerification,
      verificationRows,
      'status',
      VERIFICATION_STATUSES,
    );

    bookingsByStatus.reset();
    setCounterRowsWithZeros(
      bookingsByStatus,
      bookingStatusRows,
      'status',
      BOOKING_STATUSES,
    );
    bookingConfirmationRatio.set(totalBookings > 0 ? confirmedBookings / totalBookings : 0);
    bookingEventsTotal.set(totalBookings, { event: 'created' });
    bookingEventsTotal.set(confirmedBookings, { event: 'confirmed_or_attended' });
    bookingEventsTotal.set(bookingStatusRows.find((row) => row._id === 'COMPLETED')?.count ?? 0, { event: 'completed' });
    bookingEventsTotal.set(
      bookingStatusRows
        .filter((row) => row._id === 'CANCELLED_BY_CLIENT' || row._id === 'CANCELLED_BY_PROFESSIONAL')
        .reduce((sum, row) => sum + row.count, 0),
      { event: 'cancelled' },
    );

    bookingsMonthly.reset();
    const monthlyCounts = new Map(
      monthlyRows.map((row) => [`${row._id.month}|${row._id.status}`, row.count]),
    );
    const now = new Date();
    for (let offset = 11; offset >= 0; offset -= 1) {
      const monthDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - offset, 1));
      const month = `${monthDate.getUTCFullYear()}-${String(monthDate.getUTCMonth() + 1).padStart(2, '0')}`;
      for (const status of ['COMPLETED', 'CANCELLED'] as const) {
        bookingsMonthly.set(monthlyCounts.get(`${month}|${status}`) ?? 0, { month, status });
      }
    }
    for (const row of monthlyRows) {
      if (!row._id.month) continue;
      bookingsMonthly.set(row.count, {
        month: row._id.month,
        status: row._id.status,
      });
    }

    bookingsCreatedByWeek.reset();
    for (const row of weeklyBookingRows) {
      bookingsCreatedByWeek.set(row.count, { week: row.week });
    }

    reviewAverage.set(0, { recipient_role: 'PROFESSIONAL' });
    reviewAverage.set(0, { recipient_role: 'CLIENT' });
    reviewCount.set(0, { recipient_role: 'PROFESSIONAL' });
    reviewCount.set(0, { recipient_role: 'CLIENT' });
    for (const row of reviewRows) {
      const recipientRole =
        row._id === 'CUSTOMER_TO_PROFESSIONAL' ? 'PROFESSIONAL' : 'CLIENT';
      reviewAverage.set(row.average ?? 0, { recipient_role: recipientRole });
      reviewCount.set(row.count, { recipient_role: recipientRole });
    }

    const bidirectionalCount = bidirectionalRows[0]?.count ?? 0;
    bidirectionalReviewRatio.set(
      completedBookingCount > 0 ? bidirectionalCount / completedBookingCount : 0,
    );
    postServiceFeedbackAverage.set(feedbackRows[0]?.average ?? 0);

    moderationBlockedUsers.set(blockedUsers);
    moderationHiddenReviews.set(hiddenReviews);
    auditEventsTotal.reset();
    if (auditRows.length === 0) {
      auditEventsTotal.set(0, { action: 'sin_eventos' });
    } else {
      for (const row of auditRows) auditEventsTotal.set(row.count, { action: row._id });
    }

    bookingDemandByDistrict.reset();
    for (const row of districtRows) {
      bookingDemandByDistrict.set(row.count, { district_code: row._id });
    }

    serviceCategoryInfo.reset();
    for (const category of CATEGORY_CODES) {
      serviceCategoryInfo.set(1, { category });
    }

    servicesCompletedByCategory.reset();
    for (const row of categoryServiceRows) {
      servicesCompletedByCategory.set(row.count, {
        category: row._id.category,
        subservice: row._id.subservice || 'Sin subservicio',
      });
    }

    const completionsByProfessional = new Map(
      professionalCompletionRows.map((row) => [String(row._id), row.completions]),
    );
    professionalRanking.reset();
    for (const category of professionalRankingRows) {
      category.rows.forEach((row, index) => {
        professionalRanking.set(row.average, {
          category: category._id,
          business_name: row.businessName,
          position: index + 1,
          reviews: row.reviews,
          completed_services: completionsByProfessional.get(String(row.professionalId)) ?? 0,
        });
      });
    }

    const customerRatingById = new Map(
      customerReviewRows.map((row) => [String(row._id), row.average]),
    );
    clientRanking.reset();
    completedByCustomerRows
      .map((row) => ({
        id: String(row._id),
        services: row.services,
        average: customerRatingById.get(String(row._id)) ?? 0,
      }))
      .sort((a, b) => b.average - a.average || b.services - a.services)
      .slice(0, 10)
      .forEach((row, index) => {
        clientRanking.set(row.average, {
          customer_alias: pseudonymFor(index),
          position: index + 1,
          completed_services: row.services,
        });
      });

    reviewRatingDistribution.reset();
    const ratingCounts = new Map(
      ratingDistributionRows.map((row) => [
        `${row._id.direction}|${row._id.rating}`,
        row.count,
      ]),
    );
    for (const direction of REVIEW_DIRECTIONS) {
      for (const rating of RATINGS) {
        reviewRatingDistribution.set(ratingCounts.get(`${direction}|${rating}`) ?? 0, {
          direction,
          rating,
        });
      }
    }
    reviewRatingDistributionByCategory.reset();
    const categoryRatingCounts = new Map(
      categoryRatingDistributionRows.map((row) => [
        `${row._id.category}|${row._id.rating}`,
        row.count,
      ]),
    );
    for (const category of CATEGORY_CODES) {
      for (const rating of RATINGS) {
        reviewRatingDistributionByCategory.set(
          categoryRatingCounts.get(`${category}|${rating}`) ?? 0,
          { category, rating },
        );
      }
    }

    databaseConnected.set(1);
    metricsLastRefreshTimestamp.set(Date.now() / 1000);
  } catch (error) {
    databaseConnected.set(0);
    metricsRefreshErrors.inc({ source: 'business_collector' });
    logger.error('Error actualizando las metricas para Grafana', {
      message: (error as Error).message,
    });
    throw error;
  }
};

export const startMetricsCollector = (): (() => void) => {
  const refresh = () => {
    void refreshBusinessMetrics().catch(() => undefined);
  };
  refresh();
  const timer = setInterval(refresh, env.GRAFANA_METRICS_REFRESH_MS);
  timer.unref();
  return () => clearInterval(timer);
};
