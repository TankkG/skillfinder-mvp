import { env } from '../config/env';
import { ServiceArea } from '../models';
import { pointInPolygon, type GeoJsonPolygon } from '../utils/geo';

export const getActiveServiceArea = async () => {
  if (env.PILOT_SERVICE_AREA_ID) {
    const byId = await ServiceArea.findById(env.PILOT_SERVICE_AREA_ID);
    if (byId?.active) return byId;
  }
  const byCode = await ServiceArea.findOne({
    code: env.PILOT_SERVICE_AREA_CODE,
    active: true,
  });
  if (byCode) return byCode;
  return ServiceArea.findOne({ active: true }).sort({ createdAt: 1 });
};

export const isInsideServiceArea = async (
  longitude: number,
  latitude: number,
): Promise<boolean> => {
  const area = await getActiveServiceArea();
  if (!area) {
    return !env.PILOT_ENFORCE_BOUNDARY;
  }
  const polygon = area.boundary as unknown as GeoJsonPolygon;
  return pointInPolygon(longitude, latitude, polygon);
};

export const resolveServiceAreaIdForPoint = async (
  longitude: number,
  latitude: number,
): Promise<string | null> => {
  const area = await getActiveServiceArea();
  if (!area) {
    if (env.PILOT_ENFORCE_BOUNDARY) {
      throw new Error(
        'No existe un area piloto configurada. Un administrador debe definirla.',
      );
    }
    return null;
  }
  const polygon = area.boundary as unknown as GeoJsonPolygon;
  if (!pointInPolygon(longitude, latitude, polygon)) {
    if (env.PILOT_ENFORCE_BOUNDARY) {
      throw new Error(
        'La ubicacion comercial debe encontrarse dentro del area piloto configurada.',
      );
    }
    return null;
  }
  return String(area._id);
};
