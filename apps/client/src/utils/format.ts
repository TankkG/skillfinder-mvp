import { DateTime } from 'luxon';
import {
  BOOKING_STATUS_LABELS,
  type BookingStatus,
} from '@skillfinder/shared';
import { CATEGORY_LABELS, TIMEZONE } from '../config';

export const formatDateTime = (value?: string | null): string => {
  if (!value) return 'Sin fecha';
  const dt = DateTime.fromISO(value).setZone(TIMEZONE).setLocale('es-BO');
  if (!dt.isValid) return 'Fecha invalida';
  return dt.toFormat("dd 'de' LLL yyyy, HH:mm");
};

export const formatDate = (value?: string | null): string => {
  if (!value) return 'Sin fecha';
  const dt = DateTime.fromISO(value).setZone(TIMEZONE).setLocale('es-BO');
  if (!dt.isValid) return 'Fecha invalida';
  return dt.toFormat("dd 'de' LLL yyyy");
};

export const formatTime = (value?: string | null): string => {
  if (!value) return '--:--';
  const dt = DateTime.fromISO(value).setZone(TIMEZONE);
  if (!dt.isValid) return '--:--';
  return dt.toFormat('HH:mm');
};

export const formatDayLabel = (value?: string | null): string => {
  if (!value) return '';
  const dt = DateTime.fromISO(value, { zone: TIMEZONE }).setLocale('es-BO');
  if (!dt.isValid) return '';
  const label = dt.toFormat("ccc dd LLL");
  return label.charAt(0).toUpperCase() + label.slice(1);
};

export const formatDistance = (meters?: number): string => {
  if (meters === undefined || meters === null) return '';
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
};

export const statusLabel = (status: BookingStatus | string): string =>
  BOOKING_STATUS_LABELS[status as BookingStatus] ?? status;

export const categoryLabel = (code?: string): string =>
  code ? CATEGORY_LABELS[code] ?? code : '';

export const initials = (name?: string): string => {
  if (!name) return 'SF';
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');
};

export const ratingText = (average: number, count: number): string => {
  if (!count) return 'Sin calificaciones';
  return `${average.toFixed(1)} (${count})`;
};

export const humanMinutes = (minutes: number): string => {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours} h ${rest} min` : `${hours} h`;
};

export const todayIso = (): string =>
  DateTime.now().setZone(TIMEZONE).toISODate() as string;

export const isoDaysFromNow = (days: number): string =>
  DateTime.now().setZone(TIMEZONE).plus({ days }).toISODate() as string;

export const slotLabel = (iso: string): string => formatTime(iso);

export const slotDayKey = (iso: string): string =>
  DateTime.fromISO(iso).setZone(TIMEZONE).toISODate() as string;
