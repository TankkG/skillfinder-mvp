import type {
  BookingStatus,
  ContentKind,
  DayStatus,
  DocumentStatus,
  ExceptionType,
  ModerationStatus,
  ReviewDirection,
  Role,
  ServiceLocationType,
  UserStatus,
  VerificationChannel,
  VerificationStatus,
} from './constants';

export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
    details?: unknown;
    requestId?: string;
  };
}

export interface GeoPoint {
  type: 'Point';
  coordinates: [number, number];
}

export interface PublicUser {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: Role;
  status: UserStatus;
  emailVerifiedAt?: string | null;
  phoneVerifiedAt?: string | null;
  customerRatingSummary?: RatingSummary;
  createdAt: string;
}

export interface RatingSummary {
  average: number;
  count: number;
}

export interface ServiceCategory {
  id: string;
  code: string;
  name: string;
  description?: string;
  parentId?: string | null;
  isSpecialty?: boolean;
  active: boolean;
  sortOrder: number;
}

export interface ProfessionalService {
  id: string;
  professionalId: string;
  categoryId: string;
  categoryCode?: string;
  specialtyId?: string | null;
  specialtyName?: string | null;
  name: string;
  description?: string;
  estimatedDurationMinutes: number;
  estimatedPrice?: number | null;
  active: boolean;
}

export interface ScheduleInterval {
  start: string;
  end: string;
}

export interface WeeklyScheduleDay {
  dayOfWeek: number;
  intervals: ScheduleInterval[];
  breaks: ScheduleInterval[];
  active: boolean;
  timezone: string;
}

export interface AvailabilityException {
  id: string;
  professionalId: string;
  startAt: string;
  endAt: string;
  type: ExceptionType;
  reason?: string;
}

export interface ProfessionalSummary {
  id: string;
  userId: string;
  displayName: string;
  businessName: string;
  description?: string;
  categories: string[];
  specialties: string[];
  addressText?: string;
  location: GeoPoint;
  photoUrl?: string | null;
  verificationStatus: VerificationStatus;
  isVisible: boolean;
  ratingSummary: RatingSummary;
  distanceMeters?: number;
  nextAvailability?: string | null;
  serviceAreaId?: string | null;
  offersHomeService?: boolean;
  createdAt: string;
}

export interface ProfessionalProfile extends ProfessionalSummary {
  phone?: string;
  email?: string;
  services?: ProfessionalService[];
  weeklySchedule?: WeeklyScheduleDay[];
}

export interface AvailabilityDay {
  date: string;
  status: DayStatus;
  slots: string[];
  bookedCount: number;
}

export interface AvailabilityResponse {
  professionalId: string;
  serviceId?: string | null;
  timezone: string;
  slotMinutes: number;
  days: AvailabilityDay[];
}

export interface CalendarItem {
  id: string;
  status: BookingStatus;
  startAt: string;
  endAt: string;
  serviceName?: string;
  customerName?: string;
  professionalName?: string;
  scale?: number;
}

export interface Booking {
  id: string;
  customerId: string;
  professionalId: string;
  serviceId: string;
  startAt: string;
  endAt: string;
  timezone: string;
  status: BookingStatus;
  notes?: string;
  serviceLocationType: ServiceLocationType;
  serviceLocation?: GeoPoint | null;
  serviceName?: string;
  professionalName?: string;
  customerName?: string;
  holdExpiresAt?: string | null;
  acceptedAt?: string | null;
  rejectedAt?: string | null;
  cancelledAt?: string | null;
  completedAt?: string | null;
  createdAt: string;
  canReview?: boolean;
  myReview?: Review | null;
  customerRatingSummary?: RatingSummary;
  professionalRatingSummary?: RatingSummary;
}

export interface BookingMessage {
  id: string;
  bookingId: string;
  senderId: string;
  senderName?: string;
  senderRole: Role;
  message: string;
  createdAt: string;
}

export interface VerificationRequestResult {
  channel: VerificationChannel;
  target: string;
  expiresAt: string;
  devCode?: string;
}

export interface WeeklyLeaderboardEntry extends ProfessionalSummary {
  weeklyAverage: number;
  weeklyReviews: number;
  completedBookings: number;
}

export interface WeeklyLeaderboard {
  items: WeeklyLeaderboardEntry[];
  minimumReviews: number;
  periodStart: string;
  periodEnd: string;
  message?: string;
}

export interface ContentFaqItem {
  question: string;
  answer: string;
}

export interface ContentEntry {
  id: string;
  key: string;
  kind: ContentKind;
  title: string;
  body: string;
  items: ContentFaqItem[];
  published: boolean;
  sortOrder: number;
  updatedAt: string;
}

export interface Review {
  id: string;
  bookingId: string;
  reviewerId: string;
  revieweeId: string;
  reviewerName?: string;
  reviewerRole: Role;
  direction: ReviewDirection;
  rating: number;
  comment?: string;
  moderationStatus: ModerationStatus;
  createdAt: string;
}

export interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  entityType?: string;
  entityId?: string;
  readAt?: string | null;
  createdAt: string;
}

export interface VerificationDocument {
  id: string;
  professionalId: string;
  documentType: string;
  status: DocumentStatus;
  rejectionReason?: string | null;
  reviewedAt?: string | null;
  createdAt: string;
}

export interface Report {
  id: string;
  reporterId: string;
  targetType: string;
  targetId: string;
  reason: string;
  description?: string;
  status: string;
  resolution?: string;
  createdAt: string;
  resolvedAt?: string | null;
}

export interface AuthResult {
  user: PublicUser;
  accessToken: string;
  refreshToken: string;
  professionalProfile?: ProfessionalProfile | null;
}

export interface Paginated<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface AdminDashboard {
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

export interface ProfessionalRegistrationPayload {
  name: string;
  email: string;
  phone: string;
  password: string;
  businessName: string;
  description?: string;
  addressText: string;
  categories: string[];
  specialties: string[];
  location: { latitude: number; longitude: number };
  offersHomeService?: boolean;
}
