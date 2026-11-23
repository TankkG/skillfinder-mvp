
import { Platform } from 'react-native';

export const colors = {
  primary: '#B7F36B',
  primaryDark: '#090D0B',
  primaryMid: '#19271D',
  primarySoft: '#243A29',
  primaryTint: '#111A14',

  accent: '#B7F36B',
  accentStrong: '#9DDB4F',
  accentSoft: '#26391F',

  background: '#090D0B',
  surface: '#121815',
  surfaceAlt: '#1A231D',
  surfaceMuted: '#151D18',

  text: '#F2F5F1',
  textMuted: '#B0BDB4',
  textSoft: '#7D8B81',

  border: '#27342B',
  borderStrong: '#3D5141',

  danger: '#FF6B63',
  dangerSoft: '#3A1D1B',

  success: '#62D69A',
  successSoft: '#163326',

  warning: '#F3C36B',
  warningSoft: '#382C18',

  info: '#78B9EF',
  infoSoft: '#192D40',

  white: '#FFFFFF',

  overlay: 'rgba(0, 0, 0, 0.72)',
  scrim: 'rgba(0, 0, 0, 0.68)',

  glass: 'rgba(255, 255, 255, 0.08)',
  glassStrong: 'rgba(255, 255, 255, 0.14)',
  glassBorder: 'rgba(255, 255, 255, 0.16)',

  heroText: '#F2F5F1',
  heroMuted: '#B8C8BB',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
};

export const radius = {
  sm: 10,
  md: 14,
  lg: 22,
  xl: 30,
  pill: 999,
};

const cardShadow = Platform.select({
  web: {
    boxShadow: '0 12px 35px rgba(0, 0, 0, 0.28)',
  },
  default: {
    shadowColor: '#000000',
    shadowOpacity: 0.28,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 5,
  },
}) as object;

export const shadows = {
  card: cardShadow,

  soft: Platform.select({
    web: {
      boxShadow: '0 5px 18px rgba(0, 0, 0, 0.20)',
    },
    default: {
      shadowColor: '#000000',
      shadowOpacity: 0.20,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 4 },
      elevation: 2,
    },
  }) as object,

  button: Platform.select({
    web: {
      boxShadow: '0 8px 22px rgba(183, 243, 107, 0.16)',
    },
    default: {
      shadowColor: '#B7F36B',
      shadowOpacity: 0.16,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 6 },
      elevation: 4,
    },
  }) as object,

  accent: Platform.select({
    web: {
      boxShadow: '0 8px 25px rgba(183, 243, 107, 0.22)',
    },
    default: {
      shadowColor: '#B7F36B',
      shadowOpacity: 0.22,
      shadowRadius: 14,
      shadowOffset: { width: 0, height: 8 },
      elevation: 5,
    },
  }) as object,
};

export const fonts = {
  regular: 'System',
  medium: 'System',
  bold: 'System',
};
