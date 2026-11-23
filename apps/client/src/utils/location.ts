import * as Location from 'expo-location';
import type { GeoPoint } from '@skillfinder/shared';
import { DEFAULT_LOCATION } from '../config';

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export const pointToCoordinates = (
  point: GeoPoint | null | undefined,
): Coordinates => {
  const [longitude, latitude] = point?.coordinates ?? [];
  if (typeof latitude !== 'number' || typeof longitude !== 'number') {
    return DEFAULT_LOCATION;
  }
  return { latitude, longitude };
};

export const requestCurrentLocation = async (): Promise<Coordinates> => {
  const permission = await Location.requestForegroundPermissionsAsync();
  if (!permission.granted) {
    throw new Error(
      'Permiso de ubicacion denegado. Puedes elegir un punto manualmente en el mapa.',
    );
  }
  const position = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.Balanced,
  });
  return {
    latitude: position.coords.latitude,
    longitude: position.coords.longitude,
  };
};

export const safeCurrentLocation = async (): Promise<Coordinates> => {
  try {
    return await requestCurrentLocation();
  } catch {
    return DEFAULT_LOCATION;
  }
};
