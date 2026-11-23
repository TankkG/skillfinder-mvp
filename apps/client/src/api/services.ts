import type {
  AuthResult,
  AvailabilityResponse,
  Booking,
  BookingMessage,
  Notification,
  Paginated,
  ProfessionalProfile,
  ProfessionalService,
  PublicUser,
  Review,
  ServiceCategory,
  VerificationChannel,
  VerificationRequestResult,
  WeeklyLeaderboard,
  WeeklyScheduleDay,
} from '@skillfinder/shared';
import { api } from './client';
import type {
  ActiveServiceAreaResponse,
  AdminDashboardResponse,
  AdminProfessionalDetail,
  AdminProfessionalRow,
  AdminReportRow,
  AdminReviewRow,
  AdminUserRow,
  AuditLogRow,
  BookingPayload,
  BookingsOverview,
  CategoryResponse,
  ContentListResponse,
  ContentResponse,
  CreateServicePayload,
  FaqResponse,
  MeResponse,
  NotificationList,
  ProfessionalCalendarResponse,
  ServiceAreaInfo,
} from './types';

export interface LoginPayload {
  email: string;
  password: string;
}

export interface ClientRegistrationPayload {
  name: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
  acceptTerms: true;
  acceptPrivacy: true;
  locationConsent?: boolean;
}

export interface ProfessionalRegistrationPayload {
  name: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
  acceptTerms: true;
  acceptPrivacy: true;
  businessName: string;
  description?: string;
  addressText: string;
  categories: string[];
  specialties: string[];
  location: { latitude: number; longitude: number };
  offersHomeService?: boolean;
  weeklySchedule?: {
    dayOfWeek: number;
    intervals: { start: string; end: string }[];
    breaks: { start: string; end: string }[];
    active: boolean;
  }[];
}

export const authApi = {
  login: (payload: LoginPayload) => api.post<AuthResult>('/auth/login', payload),
  registerClient: (payload: ClientRegistrationPayload) =>
    api.post<AuthResult>('/auth/register/client', payload),
  registerProfessional: (payload: ProfessionalRegistrationPayload) =>
    api.post<AuthResult>('/auth/register/professional', payload),
  me: () => api.get<MeResponse>('/auth/me'),
  logout: (refreshToken: string) =>
    api.post<void>('/auth/logout', { refreshToken }),
  forgotPassword: (email: string) =>
    api.post<{ message: string }>('/auth/forgot-password', { email }),
  resetPassword: (payload: {
    token: string;
    newPassword: string;
    confirmPassword: string;
  }) => api.post<{ message: string }>('/auth/reset-password', payload),
  changePassword: (payload: {
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
  }) => api.post<{ message: string }>('/auth/change-password', payload),
  requestVerification: (channel: VerificationChannel) =>
    api.post<VerificationRequestResult>('/auth/verification/request', {
      channel,
    }),
  confirmVerification: (channel: VerificationChannel, code: string) =>
    api.post<{ user: PublicUser }>('/auth/verification/confirm', {
      channel,
      code,
    }),
};

export const catalogApi = {
  categories: () => api.get<CategoryResponse>('/service-categories'),
  activeArea: () => api.get<ActiveServiceAreaResponse>('/service-areas/active'),
  faq: () => api.get<FaqResponse>('/help/faq'),
  content: (key: string) =>
    api.get<ContentResponse>(`/content/${encodeURIComponent(key)}`),
};

export interface ProfessionalListParams {
  page?: number;
  pageSize?: number;
  category?: string;
  specialty?: string;
  search?: string;
  minRating?: number;
  sort?: 'rating' | 'name' | 'createdAt';
}

export interface NearbyParams {
  page?: number;
  pageSize?: number;
  category?: string;
  specialty?: string;
  search?: string;
  minRating?: number;
  latitude?: number;
  longitude?: number;
  radiusMeters?: number;
  sort?: 'distance' | 'rating' | 'availability';
  includeNextAvailability?: 'true' | 'false';
}

export const professionalsApi = {
  list: (params: ProfessionalListParams = {}) =>
    api.get<Paginated<ProfessionalProfile>>('/professionals', params),
  nearby: (params: NearbyParams = {}) =>
    api.get<Paginated<ProfessionalProfile>>('/professionals/nearby', params),
  weeklyLeaderboard: () =>
    api.get<WeeklyLeaderboard>('/professionals/leaderboard/weekly'),
  get: (id: string) =>
    api.get<ProfessionalProfile>(`/professionals/${id}`),
  services: (id: string) =>
    api.get<ProfessionalService[]>(`/professionals/${id}/services`),
  availability: (
    id: string,
    params: { from: string; to: string; serviceId?: string; timezone?: string },
  ) =>
    api.get<AvailabilityResponse>(`/professionals/${id}/availability`, params),
  reviews: (id: string, page = 1, pageSize = 20) =>
    api.get<Paginated<Review>>(`/professionals/${id}/reviews`, {
      page,
      pageSize,
    }),
  me: () => api.get<ProfessionalProfile>('/professionals/me'),
  updateMe: (payload: Partial<ProfessionalProfile>) =>
    api.put<ProfessionalProfile>('/professionals/me', payload),
  updateLocation: (payload: {
    latitude: number;
    longitude: number;
    addressText?: string;
  }) => api.post<ProfessionalProfile>('/professionals/me/location', payload),
  uploadPhoto: (form: FormData) =>
    api.upload<{ photoUrl: string }>('/professionals/me/photo', form),
  myServices: () => api.get<ProfessionalService[]>('/professionals/me/services'),
  createService: (payload: CreateServicePayload) =>
    api.post<ProfessionalService>('/professionals/me/services', payload),
  updateService: (serviceId: string, payload: Partial<CreateServicePayload>) =>
    api.put<ProfessionalService>(
      `/professionals/me/services/${serviceId}`,
      payload,
    ),
  myDocuments: () =>
    api.get<import('@skillfinder/shared').VerificationDocument[]>(
      '/professionals/me/documents',
    ),
  uploadDocument: (form: FormData) =>
    api.upload<{ id: string; documentType: string; status: string }>(
      '/professionals/me/documents',
      form,
    ),
  getSchedule: () =>
    api.get<WeeklyScheduleDay[]>('/professionals/me/schedule'),
  saveSchedule: (days: WeeklyScheduleDay[]) =>
    api.put<WeeklyScheduleDay[]>('/professionals/me/schedule', { days }),
  getExceptions: () =>
    api.get<import('@skillfinder/shared').AvailabilityException[]>(
      '/professionals/me/exceptions',
    ),
  createException: (payload: {
    startAt: string;
    endAt: string;
    type: string;
    reason?: string;
  }) =>
    api.post<import('@skillfinder/shared').AvailabilityException>(
      '/professionals/me/exceptions',
      payload,
    ),
  deleteException: (id: string) =>
    api.delete<void>(`/professionals/me/exceptions/${id}`),
  calendar: (from?: string, to?: string) =>
    api.get<ProfessionalCalendarResponse>('/professionals/me/calendar', {
      from,
      to,
    }),
};

export const bookingsApi = {
  create: (payload: BookingPayload, idempotencyKey: string) =>
    api.post<{ booking: Booking; reused: boolean }>('/bookings', {
      ...payload,
      idempotencyKey,
    }),
  myBookings: (params: {
    scope?: 'upcoming' | 'history' | 'all';
    status?: string;
    page?: number;
    pageSize?: number;
  } = {}) => api.get<Paginated<Booking>>('/bookings/me', params),
  overview: () => api.get<BookingsOverview>('/bookings/overview'),
  get: (id: string) => api.get<Booking>(`/bookings/${id}`),
  accept: (id: string) => api.patch<Booking>(`/bookings/${id}/accept`),
  reject: (id: string, reason?: string) =>
    api.patch<Booking>(`/bookings/${id}/reject`, { reason }),
  cancel: (id: string, reason?: string) =>
    api.patch<Booking>(`/bookings/${id}/cancel`, { reason }),
  start: (id: string) => api.patch<Booking>(`/bookings/${id}/start`),
  complete: (id: string) => api.patch<Booking>(`/bookings/${id}/complete`),
  noShow: (id: string, reason?: string) =>
    api.patch<Booking>(`/bookings/${id}/no-show`, { reason }),
  review: (id: string, payload: { rating: number; comment?: string }) =>
    api.post<Review>(`/bookings/${id}/reviews`, payload),
  messages: (id: string) =>
    api.get<{ items: BookingMessage[] }>(`/bookings/${id}/messages`),
  sendMessage: (id: string, message: string) =>
    api.post<{ message: BookingMessage }>(`/bookings/${id}/messages`, {
      message,
    }),
};

export const notificationsApi = {
  list: (params: { unreadOnly?: 'true'; page?: number; pageSize?: number } = {}) =>
    api.get<NotificationList>('/notifications/me', params),
  markRead: (id: string) =>
    api.patch<Notification>(`/notifications/${id}/read`),
  markAllRead: () => api.patch<{ updated: number }>('/notifications/read-all'),
};

export const favoritesApi = {
  list: () => api.get<ProfessionalProfile[]>('/favorites'),
  add: (professionalId: string) =>
    api.post<{ id: string; alreadyFavorite: boolean }>(
      `/favorites/${professionalId}`,
    ),
  remove: (professionalId: string) =>
    api.delete<void>(`/favorites/${professionalId}`),
};

export const reportsApi = {
  create: (payload: {
    targetType: 'PROFILE' | 'REVIEW' | 'BOOKING' | 'USER' | 'OTHER';
    targetId: string;
    reason: string;
    description?: string;
  }) => api.post<AdminReportRow>('/reports', payload),
  reportReview: (reviewId: string, reason?: string, description?: string) =>
    api.post<{ message: string }>(`/reviews/${reviewId}/report`, {
      reason,
      description,
    }),
};

export const adminApi = {
  dashboard: () => api.get<AdminDashboardResponse>('/admin/dashboard'),
  pendingProfessionals: (page = 1) =>
    api.get<Paginated<ProfessionalProfile>>('/admin/professionals/pending', {
      page,
      pageSize: 20,
    }),
  professionals: (params: { status?: string; search?: string; page?: number } = {}) =>
    api.get<Paginated<AdminProfessionalRow>>('/admin/professionals', {
      pageSize: 20,
      ...params,
    }),
  professional: (id: string) =>
    api.get<AdminProfessionalDetail>(`/admin/professionals/${id}`),
  documents: (id: string) =>
    api.get<import('@skillfinder/shared').VerificationDocument[]>(
      `/admin/professionals/${id}/documents`,
    ),
  setVerification: (
    id: string,
    payload: { status: 'APPROVED' | 'REJECTED' | 'REQUIRES_CORRECTION'; reason?: string },
  ) => api.patch<ProfessionalProfile>(`/admin/professionals/${id}/verification`, payload),
  reviewDocument: (
    id: string,
    payload: {
      status: 'APPROVED' | 'REJECTED' | 'REQUIRES_CORRECTION';
      rejectionReason?: string;
    },
  ) =>
    api.patch<import('@skillfinder/shared').VerificationDocument>(
      `/admin/documents/${id}`,
      payload,
    ),
  users: (params: { role?: string; status?: string; search?: string; page?: number } = {}) =>
    api.get<Paginated<AdminUserRow>>('/admin/users', { pageSize: 20, ...params }),
  setUserStatus: (
    id: string,
    payload: { status: 'ACTIVE' | 'SUSPENDED' | 'BLOCKED'; reason?: string },
  ) => api.patch<PublicUser>(`/admin/users/${id}/status`, payload),
  reports: (params: { status?: string; page?: number } = {}) =>
    api.get<Paginated<AdminReportRow>>('/admin/reports', {
      pageSize: 20,
      ...params,
    }),
  resolveReport: (
    id: string,
    payload: { status: 'IN_REVIEW' | 'RESOLVED' | 'DISMISSED'; resolution?: string },
  ) => api.patch<AdminReportRow>(`/admin/reports/${id}`, payload),
  reportedReviews: (page = 1) =>
    api.get<Paginated<AdminReviewRow>>('/admin/reviews', {
      page,
      pageSize: 20,
    }),
  moderateReview: (
    id: string,
    payload: { status: 'PUBLISHED' | 'HIDDEN'; note?: string },
  ) => api.patch<Review>(`/admin/reviews/${id}`, payload),
  categories: () => api.get<CategoryResponse>('/service-categories'),
  createCategory: (payload: {
    name: string;
    description?: string;
    parentId: string;
    sortOrder?: number;
  }) => api.post<ServiceCategory>('/admin/service-categories', payload),
  updateCategory: (
    id: string,
    payload: {
      name?: string;
      description?: string;
      active?: boolean;
      sortOrder?: number;
    },
  ) => api.put<ServiceCategory>(`/admin/service-categories/${id}`, payload),
  serviceAreas: () => api.get<ServiceAreaInfo[]>('/admin/service-areas'),
  updateServiceArea: (
    id: string,
    payload: {
      name?: string;
      boundary?: { type: 'Polygon'; coordinates: number[][][] };
      sourceReference?: string;
      active?: boolean;
    },
  ) => api.put<ServiceAreaInfo>(`/admin/service-areas/${id}`, payload),
  auditLogs: (params: { action?: string; entityType?: string; page?: number } = {}) =>
    api.get<Paginated<AuditLogRow>>('/admin/audit-logs', {
      pageSize: 20,
      ...params,
    }),
  content: () => api.get<ContentListResponse>('/admin/content'),
  createContent: (payload: {
    key: string;
    kind: 'FAQ' | 'POLICY' | 'INFO';
    title: string;
    body?: string;
    items?: { question: string; answer: string }[];
    published?: boolean;
    sortOrder?: number;
  }) => api.post<ContentResponse>('/admin/content', payload),
  updateContent: (
    id: string,
    payload: Partial<{
      kind: 'FAQ' | 'POLICY' | 'INFO';
      title: string;
      body: string;
      items: { question: string; answer: string }[];
      published: boolean;
      sortOrder: number;
    }>,
  ) => api.patch<ContentResponse>(`/admin/content/${id}`, payload),
  deleteContent: (id: string) => api.delete<void>(`/admin/content/${id}`),
};

