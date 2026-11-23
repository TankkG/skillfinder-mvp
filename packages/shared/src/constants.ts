export const ROLES = {
  CLIENT: 'CLIENT',
  PROFESSIONAL: 'PROFESSIONAL',
  ADMIN: 'ADMIN',
} as const;
export type Role = (typeof ROLES)[keyof typeof ROLES];

export const USER_STATUSES = {
  ACTIVE: 'ACTIVE',
  PENDING_VERIFICATION: 'PENDING_VERIFICATION',
  SUSPENDED: 'SUSPENDED',
  BLOCKED: 'BLOCKED',
} as const;
export type UserStatus = (typeof USER_STATUSES)[keyof typeof USER_STATUSES];

export const VERIFICATION_STATUSES = {
  INCOMPLETE: 'INCOMPLETE',
  PENDING_VERIFICATION: 'PENDING_VERIFICATION',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  REQUIRES_CORRECTION: 'REQUIRES_CORRECTION',
  SUSPENDED: 'SUSPENDED',
} as const;
export type VerificationStatus =
  (typeof VERIFICATION_STATUSES)[keyof typeof VERIFICATION_STATUSES];

export const DOCUMENT_STATUSES = {
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  REQUIRES_CORRECTION: 'REQUIRES_CORRECTION',
} as const;
export type DocumentStatus =
  (typeof DOCUMENT_STATUSES)[keyof typeof DOCUMENT_STATUSES];

export const BOOKING_STATUSES = {
  PENDING_PROFESSIONAL: 'PENDING_PROFESSIONAL',
  CONFIRMED: 'CONFIRMED',
  REJECTED: 'REJECTED',
  CANCELLED_BY_CLIENT: 'CANCELLED_BY_CLIENT',
  CANCELLED_BY_PROFESSIONAL: 'CANCELLED_BY_PROFESSIONAL',
  EXPIRED: 'EXPIRED',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
  NO_SHOW: 'NO_SHOW',
} as const;
export type BookingStatus =
  (typeof BOOKING_STATUSES)[keyof typeof BOOKING_STATUSES];

export const ACTIVE_BOOKING_STATUSES: BookingStatus[] = [
  BOOKING_STATUSES.PENDING_PROFESSIONAL,
  BOOKING_STATUSES.CONFIRMED,
  BOOKING_STATUSES.IN_PROGRESS,
];

export const CLOSED_BOOKING_STATUSES: BookingStatus[] = [
  BOOKING_STATUSES.REJECTED,
  BOOKING_STATUSES.CANCELLED_BY_CLIENT,
  BOOKING_STATUSES.CANCELLED_BY_PROFESSIONAL,
  BOOKING_STATUSES.EXPIRED,
  BOOKING_STATUSES.NO_SHOW,
];

export const EXCEPTION_TYPES = {
  BLOCKED: 'BLOCKED',
  SPECIAL_HOURS: 'SPECIAL_HOURS',
  VACATION: 'VACATION',
  BREAK: 'BREAK',
} as const;
export type ExceptionType =
  (typeof EXCEPTION_TYPES)[keyof typeof EXCEPTION_TYPES];

export const REVIEW_DIRECTIONS = {
  CUSTOMER_TO_PROFESSIONAL: 'CUSTOMER_TO_PROFESSIONAL',
  PROFESSIONAL_TO_CUSTOMER: 'PROFESSIONAL_TO_CUSTOMER',
} as const;
export type ReviewDirection =
  (typeof REVIEW_DIRECTIONS)[keyof typeof REVIEW_DIRECTIONS];

export const MODERATION_STATUSES = {
  PUBLISHED: 'PUBLISHED',
  HIDDEN: 'HIDDEN',
  PENDING: 'PENDING',
} as const;
export type ModerationStatus =
  (typeof MODERATION_STATUSES)[keyof typeof MODERATION_STATUSES];

export const LOCATION_TYPES = {
  AT_BUSINESS: 'AT_BUSINESS',
  AT_CUSTOMER: 'AT_CUSTOMER',
} as const;
export type ServiceLocationType =
  (typeof LOCATION_TYPES)[keyof typeof LOCATION_TYPES];

export const VERIFICATION_CHANNELS = {
  EMAIL: 'EMAIL',
  PHONE: 'PHONE',
} as const;
export type VerificationChannel =
  (typeof VERIFICATION_CHANNELS)[keyof typeof VERIFICATION_CHANNELS];

export const CONTENT_KINDS = {
  FAQ: 'FAQ',
  POLICY: 'POLICY',
  INFO: 'INFO',
} as const;
export type ContentKind = (typeof CONTENT_KINDS)[keyof typeof CONTENT_KINDS];

export const CONTENT_KEYS = {
  FAQ: 'faq',
  CANCELLATION_POLICY: 'cancellation-policy',
} as const;

export const LEADERBOARD_MIN_REVIEWS = 2;
export const LEADERBOARD_WINDOW_DAYS = 7;

export const DAY_NAMES = [
  'Domingo',
  'Lunes',
  'Martes',
  'Miercoles',
  'Jueves',
  'Viernes',
  'Sabado',
] as const;

export const SLOT_MINUTES = 15;
export const DEFAULT_TIMEZONE = 'America/La_Paz';

export const PILOT_AREA = {
  code: 'CBBA-D2',
  name: 'Distrito 2 - Cercado',
  municipality: 'Cercado',
  department: 'Cochabamba',
  country: 'Bolivia',
} as const;

/**
 * Catalogo restringido a las cuatro categorias automotrices del MVP.
 * Las subespecialidades son una propuesta inicial; el administrador puede
 * administrarlas desde el panel.
 */
export const CATEGORY_CATALOG = [
  {
    code: 'MEC',
    name: 'Mecanico automotriz',
    description:
      'Diagnostico, mantenimiento y reparacion mecanica de vehiculos.',
    specialties: [
      'Mantenimiento preventivo',
      'Diagnostico de motor',
      'Frenos',
      'Suspension',
      'Embrague',
      'Transmision',
      'Refrigeracion',
      'Escaneo y diagnostico',
    ],
  },
  {
    code: 'CHA',
    name: 'Chapero / Chaperia',
    description: 'Reparacion de carroceria, abolladuras y trabajos de chaperia.',
    specialties: [
      'Desabollado',
      'Enderezado',
      'Reparacion de carroceria',
      'Soldadura de carroceria',
      'Preparacion de superficies',
    ],
  },
  {
    code: 'GOM',
    name: 'Gomero / Gomeria',
    description: 'Reparacion, mantenimiento y cambio de neumaticos.',
    specialties: [
      'Parchado',
      'Vulcanizado',
      'Cambio de neumaticos',
      'Balanceo',
      'Rotacion',
      'Reparacion de llantas',
    ],
  },
  {
    code: 'ELA',
    name: 'Electricista automotriz',
    description:
      'Diagnostico y reparacion de sistemas electricos y electronicos del vehiculo.',
    specialties: [
      'Bateria',
      'Alternador',
      'Motor de arranque',
      'Iluminacion',
      'Cableado',
      'Sensores',
      'Diagnostico electronico',
      'Sistemas de control',
    ],
  },
] as const;

export const BOOKING_STATUS_LABELS: Record<BookingStatus, string> = {
  PENDING_PROFESSIONAL: 'Solicitud pendiente',
  CONFIRMED: 'Confirmada',
  REJECTED: 'Rechazada',
  CANCELLED_BY_CLIENT: 'Cancelada por el cliente',
  CANCELLED_BY_PROFESSIONAL: 'Cancelada por el profesional',
  EXPIRED: 'Expirada',
  IN_PROGRESS: 'Servicio en curso',
  COMPLETED: 'Servicio finalizado',
  NO_SHOW: 'Inasistencia',
};

export const VERIFICATION_STATUS_LABELS: Record<VerificationStatus, string> = {
  INCOMPLETE: 'Perfil incompleto',
  PENDING_VERIFICATION: 'Pendiente de verificacion',
  APPROVED: 'Aprobado y visible',
  REJECTED: 'Rechazado',
  REQUIRES_CORRECTION: 'Requiere correccion',
  SUSPENDED: 'Suspendido',
};

export const DAY_STATUSES = {
  AVAILABLE: 'AVAILABLE',
  PARTIAL: 'PARTIAL',
  FULL: 'FULL',
  BLOCKED: 'BLOCKED',
  PENDING: 'PENDING',
  BOOKED: 'BOOKED',
  CLOSED: 'CLOSED',
} as const;
export type DayStatus = (typeof DAY_STATUSES)[keyof typeof DAY_STATUSES];
