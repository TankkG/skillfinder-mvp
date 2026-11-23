export interface LatLng {
  latitude: number;
  longitude: number;
}

export interface GeoJsonPoint {
  type: 'Point';
  coordinates: [number, number];
}

export interface GeoJsonPolygon {
  type: 'Polygon';
  coordinates: number[][][];
}

export const isValidLatitude = (value: number): boolean =>
  Number.isFinite(value) && value >= -90 && value <= 90;

export const isValidLongitude = (value: number): boolean =>
  Number.isFinite(value) && value >= -180 && value <= 180;

export const toGeoPoint = (input: LatLng): GeoJsonPoint => {
  if (!isValidLatitude(input.latitude) || !isValidLongitude(input.longitude)) {
    throw new Error('Coordenadas invalidas.');
  }
  return {
    type: 'Point',
    coordinates: [input.longitude, input.latitude],
  };
};

export const pointFromGeo = (point: GeoJsonPoint): LatLng => ({
  latitude: point.coordinates[1],
  longitude: point.coordinates[0],
});

const pointInRing = (
  point: [number, number],
  ring: number[][],
): boolean => {
  const [x, y] = point;
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i, i += 1) {
    const xi = ring[i][0];
    const yi = ring[i][1];
    const xj = ring[j][0];
    const yj = ring[j][1];
    const intersects =
      yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (intersects) inside = !inside;
  }
  return inside;
};

export const pointInPolygon = (
  longitude: number,
  latitude: number,
  polygon: GeoJsonPolygon,
): boolean => {
  if (!isValidLatitude(latitude) || !isValidLongitude(longitude)) {
    return false;
  }
  const [outer, ...holes] = polygon.coordinates;
  if (!outer || !pointInRing([longitude, latitude], outer)) {
    return false;
  }
  return !holes.some((hole) => pointInRing([longitude, latitude], hole));
};

const EARTH_RADIUS_METERS = 6371000;

const toRadians = (degrees: number): number => (degrees * Math.PI) / 180;

export const haversineMeters = (a: LatLng, b: LatLng): number => {
  const dLat = toRadians(b.latitude - a.latitude);
  const dLon = toRadians(b.longitude - a.longitude);
  const lat1 = toRadians(a.latitude);
  const lat2 = toRadians(b.latitude);
  const sinLat = Math.sin(dLat / 2);
  const sinLon = Math.sin(dLon / 2);
  const h =
    sinLat * sinLat + Math.cos(lat1) * Math.cos(lat2) * sinLon * sinLon;
  return 2 * EARTH_RADIUS_METERS * Math.asin(Math.min(1, Math.sqrt(h)));
};

export const buildBoundingBox = (
  center: LatLng,
  radiusMeters: number,
): { minLat: number; maxLat: number; minLon: number; maxLon: number } => {
  const latDelta = (radiusMeters / EARTH_RADIUS_METERS) * (180 / Math.PI);
  const lonDelta =
    (radiusMeters / (EARTH_RADIUS_METERS * Math.cos(toRadians(center.latitude)))) *
    (180 / Math.PI);
  return {
    minLat: center.latitude - latDelta,
    maxLat: center.latitude + latDelta,
    minLon: center.longitude - lonDelta,
    maxLon: center.longitude + lonDelta,
  };
};
