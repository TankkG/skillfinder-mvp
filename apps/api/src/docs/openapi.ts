/* eslint-disable @typescript-eslint/no-explicit-any */
type Operation = {
  tags: string[];
  summary: string;
  security?: Array<Record<string, string[]>>;
  parameters?: any[];
  requestBody?: any;
  responses: Record<string, any>;
};

const ok = (description: string) => ({
  description,
  content: { 'application/json': { schema: { type: 'object' } } },
});
const created = (description: string) => ({
  description,
  content: { 'application/json': { schema: { type: 'object' } } },
});
const noContent = { description: 'Sin contenido.' };
const errors = {
  400: ok('Datos invalidos.'),
  401: ok('No autenticado.'),
  403: ok('Sin permiso.'),
  404: ok('No encontrado.'),
  409: ok('Conflicto de agenda o duplicado.'),
  422: ok('Regla de negocio incumplida.'),
  429: ok('Limite de solicitudes.'),
  500: ok('Error interno.'),
};

const paths: Record<string, Record<string, Operation>> = {};

const add = (
  method: string,
  path: string,
  tag: string,
  summary: string,
  options: Partial<Operation> = {},
) => {
  const operation: Operation = {
    tags: [tag],
    summary,
    responses: { 200: ok('Operacion correcta.'), ...errors },
    ...options,
  };
  paths[path] = paths[path] ?? {};
  paths[path][method] = operation;
};

const idParam = {
  name: 'id',
  in: 'path',
  required: true,
  schema: { type: 'string', pattern: '^[a-f\\d]{24}$' },
};
const bearer = [{ bearerAuth: [] }];

// Autenticacion
add('POST', '/api/auth/register/client', 'Autenticacion', 'Registrar cliente', {
  responses: { 201: created('Cuenta de cliente creada.'), ...errors },
});
add('POST', '/api/auth/register/professional', 'Autenticacion', 'Registrar profesional', {
  responses: { 201: created('Cuenta y perfil profesional creados.'), ...errors },
});
add('POST', '/api/auth/login', 'Autenticacion', 'Iniciar sesion');
add('POST', '/api/auth/refresh', 'Autenticacion', 'Renovar tokens');
add('POST', '/api/auth/logout', 'Autenticacion', 'Cerrar sesion', {
  responses: { 204: noContent, ...errors },
});
add('POST', '/api/auth/forgot-password', 'Autenticacion', 'Solicitar recuperacion');
add('POST', '/api/auth/reset-password', 'Autenticacion', 'Restablecer contrasena');
add('GET', '/api/auth/me', 'Autenticacion', 'Consultar sesion actual', {
  security: bearer,
});
add('POST', '/api/auth/change-password', 'Autenticacion', 'Cambiar contrasena', {
  security: bearer,
});
add('POST', '/api/auth/verification/request', 'Autenticacion', 'Solicitar codigo de verificacion de cuenta', {
  security: bearer,
  responses: { 201: created('Codigo generado.'), ...errors },
});
add('POST', '/api/auth/verification/confirm', 'Autenticacion', 'Confirmar codigo de verificacion de cuenta', {
  security: bearer,
});

// Catalogos
add('GET', '/api/service-categories', 'Catalogo', 'Listar categorias y subespecialidades');
add('GET', '/api/service-areas', 'Catalogo', 'Listar areas de servicio');
add('GET', '/api/service-areas/active', 'Catalogo', 'Consultar area piloto activa');
add('GET', '/api/help/faq', 'Catalogo', 'Preguntas frecuentes');
add('GET', '/api/content/{key}', 'Catalogo', 'Contenido publico editable', {
  parameters: [
    {
      name: 'key',
      in: 'path',
      required: true,
      schema: { type: 'string' },
    },
  ],
});
add('GET', '/api/health', 'Sistema', 'Estado del servicio');

// Profesionales
add('GET', '/api/professionals', 'Profesionales', 'Listar y filtrar profesionales');
add('GET', '/api/professionals/nearby', 'Profesionales', 'Buscar profesionales cercanos');
add('GET', '/api/professionals/leaderboard/weekly', 'Profesionales', 'Ranking semanal de profesionales');
add('GET', '/api/professionals/me', 'Profesionales', 'Perfil profesional propio', {
  security: bearer,
  responses: { 200: ok('Perfil.'), ...errors },
});
add('PUT', '/api/professionals/me', 'Profesionales', 'Editar perfil propio', {
  security: bearer,
});
add('POST', '/api/professionals/me/location', 'Profesionales', 'Actualizar ubicacion comercial', {
  security: bearer,
});
add('POST', '/api/professionals/me/photo', 'Profesionales', 'Subir foto del negocio', {
  security: bearer,
});
add('GET', '/api/professionals/me/services', 'Profesionales', 'Listar servicios propios', {
  security: bearer,
});
add('POST', '/api/professionals/me/services', 'Profesionales', 'Crear servicio', {
  security: bearer,
  responses: { 201: created('Servicio creado.'), ...errors },
});
add('PUT', '/api/professionals/me/services/{serviceId}', 'Profesionales', 'Editar servicio', {
  security: bearer,
  parameters: [{ ...idParam, name: 'serviceId' }],
});
add('GET', '/api/professionals/me/documents', 'Profesionales', 'Listar documentos propios', {
  security: bearer,
});
add('POST', '/api/professionals/me/documents', 'Profesionales', 'Subir documento de verificacion', {
  security: bearer,
});
add('GET', '/api/professionals/me/schedule', 'Disponibilidad', 'Consultar horario semanal', {
  security: bearer,
});
add('PUT', '/api/professionals/me/schedule', 'Disponibilidad', 'Guardar horario semanal', {
  security: bearer,
});
add('GET', '/api/professionals/me/exceptions', 'Disponibilidad', 'Listar bloqueos', {
  security: bearer,
});
add('POST', '/api/professionals/me/exceptions', 'Disponibilidad', 'Crear bloqueo o excepcion', {
  security: bearer,
});
add('DELETE', '/api/professionals/me/exceptions/{id}', 'Disponibilidad', 'Eliminar bloqueo', {
  security: bearer,
  parameters: [idParam],
  responses: { 204: noContent, ...errors },
});
add('GET', '/api/professionals/me/calendar', 'Disponibilidad', 'Consultar agenda propia', {
  security: bearer,
});
add('GET', '/api/professionals/{id}', 'Profesionales', 'Consultar perfil publico', {
  parameters: [idParam],
});
add('GET', '/api/professionals/{id}/services', 'Profesionales', 'Servicios del profesional', {
  parameters: [idParam],
});
add('GET', '/api/professionals/{id}/availability', 'Disponibilidad', 'Consultar disponibilidad', {
  parameters: [
    idParam,
    { name: 'from', in: 'query', required: true, schema: { type: 'string', format: 'date' } },
    { name: 'to', in: 'query', required: true, schema: { type: 'string', format: 'date' } },
    { name: 'serviceId', in: 'query', schema: { type: 'string' } },
  ],
});
add('GET', '/api/professionals/{id}/reviews', 'Resenas', 'Resenas publicadas del profesional', {
  parameters: [idParam],
});

// Reservas
add('POST', '/api/bookings', 'Reservas', 'Solicitar reserva (idempotente)', {
  security: bearer,
  parameters: [
    {
      name: 'Idempotency-Key',
      in: 'header',
      required: false,
      schema: { type: 'string' },
      description: 'Clave unica por operacion logica para evitar duplicados.',
    },
  ],
  responses: {
    201: created('Reserva creada.'),
    200: ok('Reserva existente devuelta por idempotencia.'),
    ...errors,
  },
});
add('GET', '/api/bookings/me', 'Reservas', 'Historial propio', { security: bearer });
add('GET', '/api/bookings/overview', 'Reservas', 'Resumen del profesional', {
  security: bearer,
});
add('GET', '/api/bookings/{id}', 'Reservas', 'Detalle de reserva', {
  security: bearer,
  parameters: [idParam],
});
add('PATCH', '/api/bookings/{id}/accept', 'Reservas', 'Aceptar solicitud', {
  security: bearer,
  parameters: [idParam],
});
add('PATCH', '/api/bookings/{id}/reject', 'Reservas', 'Rechazar solicitud', {
  security: bearer,
  parameters: [idParam],
});
add('PATCH', '/api/bookings/{id}/cancel', 'Reservas', 'Cancelar reserva', {
  security: bearer,
  parameters: [idParam],
});
add('PATCH', '/api/bookings/{id}/start', 'Reservas', 'Marcar servicio iniciado', {
  security: bearer,
  parameters: [idParam],
});
add('PATCH', '/api/bookings/{id}/complete', 'Reservas', 'Marcar servicio finalizado', {
  security: bearer,
  parameters: [idParam],
});
add('PATCH', '/api/bookings/{id}/no-show', 'Reservas', 'Registrar inasistencia', {
  security: bearer,
  parameters: [idParam],
});
add('GET', '/api/bookings/{id}/messages', 'Reservas', 'Listar mensajes de la reserva', {
  security: bearer,
  parameters: [idParam],
});
add('POST', '/api/bookings/{id}/messages', 'Reservas', 'Enviar mensaje en la reserva', {
  security: bearer,
  parameters: [idParam],
  responses: { 201: created('Mensaje enviado.'), ...errors },
});

// Resenas
add('POST', '/api/bookings/{id}/reviews', 'Resenas', 'Calificar tras servicio finalizado', {
  security: bearer,
  parameters: [idParam],
  responses: { 201: created('Resena creada.'), ...errors },
});
add('POST', '/api/reviews/{id}/report', 'Resenas', 'Reportar resena', {
  security: bearer,
  parameters: [idParam],
});

// Notificaciones, favoritos, reportes
add('GET', '/api/notifications/me', 'Notificaciones', 'Listar notificaciones propias', {
  security: bearer,
});
add('PATCH', '/api/notifications/read-all', 'Notificaciones', 'Marcar todas como leidas', {
  security: bearer,
});
add('PATCH', '/api/notifications/{id}/read', 'Notificaciones', 'Marcar una como leida', {
  security: bearer,
  parameters: [idParam],
});
add('GET', '/api/favorites', 'Favoritos', 'Listar favoritos', { security: bearer });
add('POST', '/api/favorites/{professionalId}', 'Favoritos', 'Agregar favorito', {
  security: bearer,
  parameters: [{ ...idParam, name: 'professionalId' }],
});
add('DELETE', '/api/favorites/{professionalId}', 'Favoritos', 'Quitar favorito', {
  security: bearer,
  parameters: [{ ...idParam, name: 'professionalId' }],
  responses: { 204: noContent, ...errors },
});
add('POST', '/api/reports', 'Reportes', 'Crear reporte', { security: bearer });

// Administracion
add('GET', '/api/admin/dashboard', 'Administracion', 'Dashboard', { security: bearer });
add('GET', '/api/admin/professionals/pending', 'Administracion', 'Profesionales pendientes', {
  security: bearer,
});
add('GET', '/api/admin/professionals', 'Administracion', 'Listar profesionales', {
  security: bearer,
});
add('GET', '/api/admin/professionals/{id}', 'Administracion', 'Expediente profesional', {
  security: bearer,
  parameters: [idParam],
});
add('PATCH', '/api/admin/professionals/{id}/verification', 'Administracion', 'Aprobar o rechazar verificacion', {
  security: bearer,
  parameters: [idParam],
});
add('GET', '/api/admin/professionals/{id}/documents', 'Administracion', 'Documentos del expediente', {
  security: bearer,
  parameters: [idParam],
});
add('GET', '/api/admin/documents/{id}/file', 'Administracion', 'Descargar documento privado', {
  security: bearer,
  parameters: [idParam],
});
add('PATCH', '/api/admin/documents/{id}', 'Administracion', 'Revisar documento', {
  security: bearer,
  parameters: [idParam],
});
add('GET', '/api/admin/users', 'Administracion', 'Listar usuarios', { security: bearer });
add('PATCH', '/api/admin/users/{id}/status', 'Administracion', 'Cambiar estado de usuario', {
  security: bearer,
  parameters: [idParam],
});
add('GET', '/api/admin/reports', 'Administracion', 'Listar reportes', { security: bearer });
add('PATCH', '/api/admin/reports/{id}', 'Administracion', 'Resolver reporte', {
  security: bearer,
  parameters: [idParam],
});
add('GET', '/api/admin/reviews', 'Administracion', 'Resenas reportadas', { security: bearer });
add('PATCH', '/api/admin/reviews/{id}', 'Administracion', 'Moderar resena', {
  security: bearer,
  parameters: [idParam],
});
add('POST', '/api/admin/service-categories', 'Administracion', 'Crear subespecialidad', {
  security: bearer,
});
add('PUT', '/api/admin/service-categories/{id}', 'Administracion', 'Editar categoria', {
  security: bearer,
  parameters: [idParam],
});
add('GET', '/api/admin/service-areas', 'Administracion', 'Listar areas', { security: bearer });
add('PUT', '/api/admin/service-areas/{id}', 'Administracion', 'Actualizar poligono del area', {
  security: bearer,
  parameters: [idParam],
});
add('GET', '/api/admin/content', 'Administracion', 'Listar contenido editable', {
  security: bearer,
});
add('POST', '/api/admin/content', 'Administracion', 'Crear contenido editable', {
  security: bearer,
  responses: { 201: created('Contenido creado.'), ...errors },
});
add('PATCH', '/api/admin/content/{id}', 'Administracion', 'Editar contenido editable', {
  security: bearer,
  parameters: [idParam],
});
add('DELETE', '/api/admin/content/{id}', 'Administracion', 'Eliminar contenido editable', {
  security: bearer,
  parameters: [idParam],
});
add('GET', '/api/admin/audit-logs', 'Administracion', 'Consultar auditoria', {
  security: bearer,
});

export const openapi = {
  openapi: '3.0.3',
  info: {
    title: 'SkillFinder API',
    version: '1.0.0',
    description:
      'API REST de SkillFinder. Reservas con bloqueo atomico, disponibilidad calculada en backend y verificacion documental.',
  },
  servers: [{ url: 'http://localhost:3000' }],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
  },
  tags: [
    { name: 'Autenticacion' },
    { name: 'Profesionales' },
    { name: 'Disponibilidad' },
    { name: 'Reservas' },
    { name: 'Resenas' },
    { name: 'Notificaciones' },
    { name: 'Favoritos' },
    { name: 'Reportes' },
    { name: 'Administracion' },
    { name: 'Catalogo' },
    { name: 'Sistema' },
  ],
  paths,
};
