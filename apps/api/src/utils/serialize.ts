import type { Types } from 'mongoose';

export const idOf = (value: Types.ObjectId | string): string =>
  typeof value === 'string' ? value : value.toString();

export const isoOrNull = (
  value: Date | string | null | undefined,
): string | null => {
  if (!value) return null;
  return new Date(value).toISOString();
};

export const pointToObject = (
  value:
    | { type: 'Point'; coordinates: number[] }
    | null
    | undefined,
): { type: 'Point'; coordinates: [number, number] } | null => {
  if (!value || !Array.isArray(value.coordinates)) return null;
  const [longitude, latitude] = value.coordinates;
  return { type: 'Point', coordinates: [longitude, latitude] };
};
