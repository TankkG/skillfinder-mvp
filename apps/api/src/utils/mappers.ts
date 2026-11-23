/* eslint-disable @typescript-eslint/no-explicit-any */
import type {
  AvailabilityException,
  Booking,
  BookingMessage,
  ContentEntry,
  DocumentStatus,
  Notification,
  ProfessionalProfile,
  ProfessionalService,
  PublicUser,
  Report,
  Review,
  VerificationDocument,
  WeeklyScheduleDay,
} from '@skillfinder/shared';
import { idOf, isoOrNull, pointToObject } from './serialize';

const valueOf = (value: any): any =>
  value && typeof value === 'object' && '_id' in value ? value._id : value;

export const mapUser = (user: any): PublicUser => ({
  id: idOf(user._id),
  name: user.name,
  email: user.email,
  phone: user.phone,
  role: user.role,
  status: user.status,
  emailVerifiedAt: isoOrNull(user.emailVerifiedAt),
  phoneVerifiedAt: isoOrNull(user.phoneVerifiedAt),
  customerRatingSummary: {
    average: user.customerRatingSummary?.average ?? 0,
    count: user.customerRatingSummary?.count ?? 0,
  },
  createdAt: new Date(user.createdAt).toISOString(),
});

export const mapProfessional = (
  profile: any,
  extras: Partial<ProfessionalProfile> = {},
): ProfessionalProfile => ({
  id: idOf(profile._id),
  userId: idOf(valueOf(profile.userId)),
  displayName: profile.displayName,
  businessName: profile.businessName,
  description: profile.description ?? '',
  categories: profile.categories ?? [],
  specialties: profile.specialties ?? [],
  addressText: profile.addressText ?? '',
  location: pointToObject(profile.location) ?? {
    type: 'Point',
    coordinates: [0, 0],
  },
  photoUrl: profile.photoUrl ?? null,
  verificationStatus: profile.verificationStatus,
  isVisible: Boolean(profile.isVisible),
  ratingSummary: {
    average: profile.ratingSummary?.average ?? 0,
    count: profile.ratingSummary?.count ?? 0,
  },
  distanceMeters: extras.distanceMeters,
  nextAvailability: extras.nextAvailability ?? null,
  serviceAreaId: profile.serviceAreaId ? idOf(profile.serviceAreaId) : null,
  offersHomeService: Boolean(profile.offersHomeService),
  phone: extras.phone,
  email: extras.email,
  services: extras.services,
  weeklySchedule: extras.weeklySchedule,
  createdAt: new Date(profile.createdAt).toISOString(),
});

export const mapService = (
  service: any,
  category?: any,
  specialty?: any,
): ProfessionalService => ({
  id: idOf(service._id),
  professionalId: idOf(valueOf(service.professionalId)),
  categoryId: idOf(valueOf(service.categoryId)),
  categoryCode: service.categoryCode ?? category?.code,
  specialtyId: service.specialtyId ? idOf(valueOf(service.specialtyId)) : null,
  specialtyName: service.specialtyName ?? specialty?.name ?? null,
  name: service.name,
  description: service.description ?? '',
  estimatedDurationMinutes: service.estimatedDurationMinutes,
  estimatedPrice: service.estimatedPrice ?? null,
  active: Boolean(service.active),
});

export const mapSchedule = (schedule: any): WeeklyScheduleDay => ({
  dayOfWeek: schedule.dayOfWeek,
  intervals: (schedule.intervals ?? []).map((item: any) => ({
    start: item.start,
    end: item.end,
  })),
  breaks: (schedule.breaks ?? []).map((item: any) => ({
    start: item.start,
    end: item.end,
  })),
  active: Boolean(schedule.active),
  timezone: schedule.timezone,
});

export const mapException = (exception: any): AvailabilityException => ({
  id: idOf(exception._id),
  professionalId: idOf(valueOf(exception.professionalId)),
  startAt: new Date(exception.startAt).toISOString(),
  endAt: new Date(exception.endAt).toISOString(),
  type: exception.type,
  reason: exception.reason ?? '',
});

export const mapBooking = (
  booking: any,
  extras: Partial<Booking> = {},
): Booking => ({
  id: idOf(booking._id),
  customerId: idOf(valueOf(booking.customerId)),
  professionalId: idOf(valueOf(booking.professionalId)),
  serviceId: idOf(valueOf(booking.serviceId)),
  startAt: new Date(booking.startAt).toISOString(),
  endAt: new Date(booking.endAt).toISOString(),
  timezone: booking.timezone,
  status: booking.status,
  notes: booking.notes ?? '',
  serviceLocationType: booking.serviceLocationType,
  serviceLocation: pointToObject(booking.serviceLocation),
  serviceName: booking.serviceName ?? extras.serviceName,
  professionalName: booking.professionalName ?? extras.professionalName,
  customerName: booking.customerName ?? extras.customerName,
  holdExpiresAt: isoOrNull(booking.holdExpiresAt),
  acceptedAt: isoOrNull(booking.acceptedAt),
  rejectedAt: isoOrNull(booking.rejectedAt),
  cancelledAt: isoOrNull(booking.cancelledAt),
  completedAt: isoOrNull(booking.completedAt),
  createdAt: new Date(booking.createdAt).toISOString(),
  canReview: extras.canReview,
  myReview: extras.myReview ?? null,
  customerRatingSummary: extras.customerRatingSummary,
  professionalRatingSummary: extras.professionalRatingSummary,
});

export const mapReview = (review: any, reviewerName?: string): Review => ({
  id: idOf(review._id),
  bookingId: idOf(valueOf(review.bookingId)),
  reviewerId: idOf(valueOf(review.reviewerId)),
  revieweeId: idOf(valueOf(review.revieweeId)),
  reviewerName: reviewerName ?? review.reviewerName,
  reviewerRole: review.reviewerRole,
  direction: review.direction,
  rating: review.rating,
  comment: review.comment ?? '',
  moderationStatus: review.moderationStatus,
  createdAt: new Date(review.createdAt).toISOString(),
});

export const mapBookingMessage = (message: any): BookingMessage => ({
  id: idOf(message._id),
  bookingId: idOf(valueOf(message.bookingId)),
  senderId: idOf(valueOf(message.senderId)),
  senderName: message.senderName ?? '',
  senderRole: message.senderRole,
  message: message.message,
  createdAt: new Date(message.createdAt).toISOString(),
});

export const mapContentEntry = (entry: any): ContentEntry => ({
  id: idOf(entry._id),
  key: entry.key,
  kind: entry.kind,
  title: entry.title,
  body: entry.body ?? '',
  items: (entry.items ?? []).map((item: any) => ({
    question: item.question,
    answer: item.answer,
  })),
  published: Boolean(entry.published),
  sortOrder: entry.sortOrder ?? 0,
  updatedAt: new Date(entry.updatedAt ?? entry.createdAt).toISOString(),
});

export const mapNotification = (notification: any): Notification => ({
  id: idOf(notification._id),
  type: notification.type,
  title: notification.title,
  message: notification.message,
  entityType: notification.entityType ?? undefined,
  entityId: notification.entityId ?? undefined,
  readAt: isoOrNull(notification.readAt),
  createdAt: new Date(notification.createdAt).toISOString(),
});

export const mapDocument = (document: any): VerificationDocument => ({
  id: idOf(document._id),
  professionalId: idOf(valueOf(document.professionalId)),
  documentType: document.documentType,
  status: document.status as DocumentStatus,
  rejectionReason: document.rejectionReason ?? null,
  reviewedAt: isoOrNull(document.reviewedAt),
  createdAt: new Date(document.createdAt).toISOString(),
});

export const mapReport = (report: any): Report => ({
  id: idOf(report._id),
  reporterId: idOf(valueOf(report.reporterId)),
  targetType: report.targetType,
  targetId: report.targetId,
  reason: report.reason,
  description: report.description ?? '',
  status: report.status,
  resolution: report.resolution ?? undefined,
  createdAt: new Date(report.createdAt).toISOString(),
  resolvedAt: isoOrNull(report.resolvedAt),
});
