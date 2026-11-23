import { z } from 'zod';
import {
  categoryCodeSchema,
  emailSchema,
  intervalSchema,
  nameSchema,
  passwordSchema,
  phoneSchema,
  weekdaySchema,
} from './common';

const baseRegistration = {
  name: nameSchema,
  email: emailSchema,
  phone: phoneSchema,
  password: passwordSchema,
  confirmPassword: z.string().min(1, 'Confirma la contrasena.'),
  acceptTerms: z.literal(true, {
    errorMap: () => ({ message: 'Debes aceptar los terminos de uso.' }),
  }),
  acceptPrivacy: z.literal(true, {
    errorMap: () => ({
      message: 'Debes aceptar la politica de privacidad.',
    }),
  }),
  locationConsent: z.boolean().optional().default(false),
};

export const registerClientSchema = z
  .object(baseRegistration)
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Las contrasenas no coinciden.',
    path: ['confirmPassword'],
  });

export const scheduleDayInputSchema = z.object({
  dayOfWeek: weekdaySchema,
  intervals: z.array(intervalSchema).default([]),
  breaks: z.array(intervalSchema).default([]),
  active: z.boolean().default(true),
});

export const registerProfessionalSchema = z
  .object({
    ...baseRegistration,
    businessName: z
      .string()
      .trim()
      .min(2, 'El nombre comercial es obligatorio.')
      .max(160),
    description: z.string().trim().max(2000).optional().default(''),
    addressText: z
      .string()
      .trim()
      .min(3, 'La direccion o referencia es obligatoria.')
      .max(300),
    categories: z
      .array(categoryCodeSchema)
      .min(1, 'Selecciona al menos una especialidad.')
      .max(4),
    specialties: z.array(z.string().trim().max(120)).default([]),
    location: z.object({
      latitude: z.coerce.number().min(-90).max(90),
      longitude: z.coerce.number().min(-180).max(180),
    }),
    offersHomeService: z.boolean().optional().default(false),
    weeklySchedule: z.array(scheduleDayInputSchema).optional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Las contrasenas no coinciden.',
    path: ['confirmPassword'],
  });

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Ingresa tu contrasena.').max(72),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(20, 'Token de renovacion invalido.'),
});

export const logoutSchema = refreshSchema;

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export const verificationRequestSchema = z.object({
  channel: z.enum(['EMAIL', 'PHONE']),
});

export const verificationConfirmSchema = z.object({
  channel: z.enum(['EMAIL', 'PHONE']),
  code: z.string().trim().regex(/^\d{6}$/, 'El codigo debe tener 6 digitos.'),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1),
    newPassword: passwordSchema,
    confirmPassword: z.string().min(1),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Las contrasenas no coinciden.',
    path: ['confirmPassword'],
  });

export const resetPasswordSchema = z
  .object({
    token: z.string().min(20, 'Token invalido.'),
    newPassword: passwordSchema,
    confirmPassword: z.string().min(1),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Las contrasenas no coinciden.',
    path: ['confirmPassword'],
  });
