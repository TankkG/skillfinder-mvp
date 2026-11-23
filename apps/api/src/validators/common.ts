import { z } from 'zod';

export const objectId = z
  .string()
  .regex(/^[a-f\d]{24}$/i, 'Identificador invalido.');

export const emailSchema = z
  .string()
  .trim()
  .email('Correo electronico invalido.')
  .max(254)
  .transform((value) => value.toLowerCase());

export const phoneSchema = z
  .string()
  .trim()
  .min(7, 'Telefono demasiado corto.')
  .max(20, 'Telefono demasiado largo.')
  .regex(/^[+0-9()\s-]+$/, 'El telefono contiene caracteres invalidos.');

export const passwordSchema = z
  .string()
  .min(8, 'La contrasena debe tener al menos 8 caracteres.')
  .max(72, 'La contrasena no puede superar 72 caracteres.')
  .regex(/[a-z]/, 'Debe incluir una letra minuscula.')
  .regex(/[A-Z]/, 'Debe incluir una letra mayuscula.')
  .regex(/\d/, 'Debe incluir un numero.');

export const nameSchema = z
  .string()
  .trim()
  .min(2, 'El nombre es demasiado corto.')
  .max(120, 'El nombre es demasiado largo.');

export const timeSchema = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Formato de hora invalido (HH:mm).');

export const intervalSchema = z
  .object({ start: timeSchema, end: timeSchema })
  .refine((value) => value.start < value.end, {
    message: 'La hora de inicio debe ser anterior a la de fin.',
    path: ['end'],
  });

export const weekdaySchema = z.coerce.number().int().min(0).max(6);

export const latitudeSchema = z.coerce
  .number()
  .min(-90, 'Latitud fuera de rango.')
  .max(90, 'Latitud fuera de rango.');

export const longitudeSchema = z.coerce
  .number()
  .min(-180, 'Longitud fuera de rango.')
  .max(180, 'Longitud fuera de rango.');

export const coordinatesSchema = z.object({
  latitude: latitudeSchema,
  longitude: longitudeSchema,
});

export const dateTimeSchema = z
  .string()
  .datetime({ offset: true, message: 'Se espera una fecha ISO 8601 valida.' });

export const dateOnlySchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Se espera una fecha con formato YYYY-MM-DD.');

export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().max(100).optional(),
});

export const categoryCodeSchema = z.enum(['MEC', 'CHA', 'GOM', 'ELA']);

export const idParamsSchema = z.object({ id: objectId });
