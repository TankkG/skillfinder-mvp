import type {
  AvailabilityException,
  Booking,
  ContentEntry,
  ProfessionalProfile,
  ProfessionalService,
  PublicUser,
  Report,
  Review,
  ServiceCategory,
  WeeklyScheduleDay,
} from '@skillfinder/shared';

export interface MeResponse {
  user: PublicUser;
  professionalProfile: ProfessionalProfile | null;
}

export interface CategoryTreeItem extends ServiceCategory {
  specialties: ServiceCategory[];
}

export interface CategoryResponse {
  items: ServiceCategory[];
  tree: CategoryTreeItem[];
}

export interface ServiceAreaBoundary {
  type: 'Polygon';
  coordinates: number[][][];
}

export interface ServiceAreaInfo {
  id: string;
  code: string;
  name: string;
  municipality?: string;
  department?: string;
  country?: string;
  boundary: ServiceAreaBoundary;
  active?: boolean;
  sourceReference?: string;
  updatedAt?: string;
}

export interface ActiveServiceAreaResponse {
  area: ServiceAreaInfo | null;
  usingPlaceholder: boolean;
}

export interface FaqResponse {
  items: { question: string; answer: string }[];
}

export interface ContentResponse {
  entry: ContentEntry;
}

export interface ContentListResponse {
  items: ContentEntry[];
}

export interface ProfessionalCalendarResponse {
  timezone: string;
  from: string;
  to: string;
  bookings: Booking[];
  exceptions: AvailabilityException[];
  schedule: WeeklyScheduleDay[];
  pendingCount: number;
  upcoming: Booking[];
}

export interface BookingsOverview {
  pendingRequests: number;
  todayBookings: number;
  completedTotal: number;
  upcoming: Booking[];
}

export interface NotificationList {
  items: import('@skillfinder/shared').Notification[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  unread: number;
}

export interface AdminProfessionalRow extends ProfessionalProfile {
  accountName?: string;
  accountEmail?: string;
  accountPhone?: string;
}

export interface AdminProfessionalDetail {
  profile: ProfessionalProfile;
  user: PublicUser | null;
  documents: import('@skillfinder/shared').VerificationDocument[];
  verificationNotes?: string;
}

export interface AdminDashboardResponse {
  clients: number;
  professionals: number;
  pendingProfessionals: number;
  approvedProfessionals: number;
  suspendedProfessionals: number;
  rejectedProfessionals: number;
  bookingsByStatus: Record<string, number>;
  recentBookings: Booking[];
  pendingReports: number;
  distributionByCategory: Record<string, number>;
}

export interface AuditLogRow {
  id: string;
  actorId: string | null;
  action: string;
  entityType: string;
  entityId: string;
  result: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface BookingPayload {
  professionalId: string;
  serviceId: string;
  startAt: string;
  notes?: string;
  serviceLocationType?: 'AT_BUSINESS' | 'AT_CUSTOMER';
  serviceLocation?: { latitude: number; longitude: number };
  idempotencyKey?: string;
}

export interface CreateServicePayload {
  categoryCode: string;
  specialtyId?: string | null;
  specialtyName?: string | null;
  name: string;
  description?: string;
  estimatedDurationMinutes: number;
  estimatedPrice?: number | null;
  active?: boolean;
}

export type AdminReviewRow = Review;
export type AdminReportRow = Report;
export type AdminUserRow = PublicUser;
export type { ProfessionalService };
