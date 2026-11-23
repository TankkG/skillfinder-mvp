import { Platform } from 'react-native';

const fallback = Platform.select({
  android: 'http://10.0.2.2:3000/api',
  default: 'http://localhost:3000/api',
}) as string;

export const API_URL = (
  process.env.EXPO_PUBLIC_API_URL ?? fallback
).replace(/\/+$/, '');

export const DEFAULT_LOCATION = {
  latitude: -17.3895,
  longitude: -66.1568,
};

export const DEFAULT_RADIUS_METERS = 8000;
export const TIMEZONE = 'America/La_Paz';

export const CATEGORY_LABELS: Record<string, string> = {
  MEC: 'Mecanico',
  CHA: 'Chapero',
  GOM: 'Gomero',
  ELA: 'Electricista',
};

export const CATEGORY_ICONS: Record<string, string> = {
  MEC: 'construct',
  CHA: 'hammer',
  GOM: 'disc',
  ELA: 'flash',
};

export interface CategoryMarkerStyle {
  label: string;
  color: string;
  icon: string;
  svg: string;
}

export const CATEGORY_MARKER_STYLES: Record<string, CategoryMarkerStyle> = {
  MEC: {
    label: 'Mecanico',
    color: '#2563EB',
    icon: 'construct',
    svg:
      '<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>',
  },
  CHA: {
    label: 'Chapero',
    color: '#7C3AED',
    icon: 'hammer',
    svg:
      '<path d="m15 12-8.4 8.4a2 2 0 1 1-3-3L12 9"/><path d="m18 15 4-4"/><path d="m14 6 2-2 4 4-2 2-4-4z"/>',
  },
  GOM: {
    label: 'Gomero',
    color: '#B45309',
    icon: 'settings',
    svg:
      '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>',
  },
  ELA: {
    label: 'Electricista',
    color: '#C2410C',
    icon: 'flash',
    svg:
      '<path d="M13 2 4 14h6l-1 8 9-12h-6l1-8z"/>',
  },
};

export const defaultMarkerStyle: CategoryMarkerStyle = {
  label: 'Servicio',
  color: '#0F3D33',
  icon: 'location',
  svg:
    '<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z"/><circle cx="12" cy="10" r="3"/>',
};

export const markerStyleFor = (category?: string): CategoryMarkerStyle =>
  CATEGORY_MARKER_STYLES[category ?? ''] ?? defaultMarkerStyle;
