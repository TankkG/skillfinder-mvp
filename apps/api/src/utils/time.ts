import { DateTime, Duration } from 'luxon';

export const DEFAULT_ZONE = 'America/La_Paz';

export const isValidZone = (zone: string): boolean =>
  DateTime.local().setZone(zone).isValid;

export const zoneOr = (zone?: string | null): string =>
  zone && isValidZone(zone) ? zone : DEFAULT_ZONE;

export const parseInstant = (value: string | Date): DateTime =>
  typeof value === 'string'
    ? DateTime.fromISO(value, { setZone: true })
    : DateTime.fromJSDate(value);

export const toUTC = (value: string | Date): Date => {
  const dt = parseInstant(value);
  if (!dt.isValid) {
    throw new Error(`Fecha invalida: ${String(value)}`);
  }
  return dt.toUTC().toJSDate();
};

export const localDateTime = (
  date: string,
  time: string,
  zone = DEFAULT_ZONE,
): DateTime =>
  DateTime.fromISO(`${date}T${time.length === 5 ? `${time}:00` : time}`, {
    zone,
  });

export const dayKey = (value: string | Date, zone = DEFAULT_ZONE): string =>
  parseInstant(value).setZone(zone).toISODate() ?? '';

export const dayStart = (date: string, zone = DEFAULT_ZONE): DateTime =>
  DateTime.fromISO(date, { zone }).startOf('day');

export const minutesOfDay = (dt: DateTime): number =>
  dt.hour * 60 + dt.minute;

export const parseTimeToMinutes = (time: string): number => {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
};

export const addMinutes = (
  value: string | Date,
  minutes: number,
): Date => parseInstant(value).plus({ minutes }).toUTC().toJSDate();

export const diffMinutes = (
  start: string | Date,
  end: string | Date,
): number => {
  const a = parseInstant(start);
  const b = parseInstant(end);
  return b.diff(a, 'minutes').minutes;
};

/**
 * Alinea un instante a la rejilla de agenda tomando como referencia la
 * medianoche local del area de servicio. Evita depender de la zona horaria
 * accidental del dispositivo.
 */
export const alignToSlot = (
  value: string | Date,
  slotMinutes: number,
  zone = DEFAULT_ZONE,
): DateTime => {
  const dt = parseInstant(value).setZone(zone);
  const startOfDay = dt.startOf('day');
  const elapsed = Math.floor(dt.diff(startOfDay, 'minutes').minutes);
  const remainder = ((elapsed % slotMinutes) + slotMinutes) % slotMinutes;
  return dt.minus({ minutes: remainder }).setZone(zone);
};

export const isSlotAligned = (
  value: string | Date,
  slotMinutes: number,
  zone = DEFAULT_ZONE,
): boolean => {
  const dt = parseInstant(value).setZone(zone);
  const elapsed = Math.floor(dt.diff(dt.startOf('day'), 'minutes').minutes);
  return elapsed % slotMinutes === 0;
};

export interface SlotRange {
  start: Date;
  end: Date;
  key: string;
}

/**
 * Genera los bloques que ocupa un intervalo [startAt, endAt). El extremo final
 * no forma parte de la cita, tal como indica la especificacion.
 */
export const buildSlots = (
  startAt: string | Date,
  endAt: string | Date,
  slotMinutes: number,
): SlotRange[] => {
  const start = parseInstant(startAt);
  const end = parseInstant(endAt);
  const totalMinutes = end.diff(start, 'minutes').minutes;
  if (totalMinutes <= 0) return [];
  const slots: SlotRange[] = [];
  const count = Math.ceil(totalMinutes / slotMinutes);
  for (let index = 0; index < count; index += 1) {
    const slotStart = start.plus({ minutes: index * slotMinutes });
    slots.push({
      start: slotStart.toUTC().toJSDate(),
      end: slotStart.plus({ minutes: slotMinutes }).toUTC().toJSDate(),
      key: slotStart.toUTC().toISO() ?? '',
    });
  }
  return slots;
};

export const rangesOverlap = (
  aStart: Date | string,
  aEnd: Date | string,
  bStart: Date | string,
  bEnd: Date | string,
): boolean => {
  const aS = parseInstant(aStart).toMillis();
  const aE = parseInstant(aEnd).toMillis();
  const bS = parseInstant(bStart).toMillis();
  const bE = parseInstant(bEnd).toMillis();
  return aS < bE && bS < aE;
};

export const formatInZone = (
  value: string | Date,
  zone = DEFAULT_ZONE,
): string =>
  parseInstant(value)
    .setZone(zone)
    .setLocale('es-BO')
    .toFormat("dd/LL/yyyy HH:mm");

export const humanDuration = (minutes: number): string => {
  const duration = Duration.fromObject({ minutes });
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (rest === 0) return `${hours} h`;
  return `${hours} h ${rest} min`;
};

export const daysFromNow = (value: string | Date, zone = DEFAULT_ZONE): number =>
  parseInstant(value).setZone(zone).startOf('day').diff(
    DateTime.now().setZone(zone).startOf('day'),
    'days',
  ).days;
