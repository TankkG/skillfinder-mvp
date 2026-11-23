# Pendientes y decisiones abiertas

Estado de las decisiones pendientes (DP) de la especificacion al cierre del MVP.

| ID | Tema | Estado actual | Accion requerida |
|---|---|---|---|
| DP-01 | Imagen del megacalendario | No disponible | Incorporar referencia visual del propietario y ajustar el calendario. |
| DP-02 | Limite geografico Distrito 2 | Poligono placeholder `CBBA-D2` con `sourceReference` visible | Obtener el limite oficial, reemplazarlo en el seed y activar `PILOT_ENFORCE_BOUNDARY`. |
| DP-03 | Proveedor de mapas | OSM + react-native-maps/Leaflet elegido para el piloto | Confirmar geocodificacion, atribucion y limites de uso antes de produccion. |
| DP-04 | Framework web real | React Native Web (Expo web) | Validar compatibilidad en navegadores objetivo y documentar resultados. |
| DP-05 | Framework backend | Express + TypeScript | Confirmado para este repositorio. |
| DP-06 | Duracion de servicios | Duracion en minutos por servicio, multiplos de 15 | Validar duraciones reales con los profesionales del piloto. |
| DP-07 | Retencion de solicitud pendiente | 15 minutos | Confirmar con operacion y ajustar `BOOKING_HOLD_MINUTES`. |
| DP-08 | Cancelacion | Cliente y profesional pueden cancelar con motivo; sin ventana minima implementada | Definir plazos, motivos y limites. |
| DP-09 | Finalizacion del servicio | Profesional marca `COMPLETED`; cliente puede calificar | Definir si se requiere confirmacion de ambas partes. |
| DP-10 | Resena de cliente | Promedio y comentarios visibles solo para el profesional autenticado | Confirmar alcance de visibilidad. |
| DP-11 | Verificacion profesional | Documentos cargados a almacenamiento local y revision admin | Definir documentos minimos y proceso formal de aprobacion. |
| DP-12 | Atencion a domicilio | Soportada por reserva con `HOME` y coordenadas | Confirmar si se habilita en el piloto. |
| DP-13 | Notificaciones | Adaptador `console` en API; bandeja in-app implementada | Elegir proveedor de correo/push, costos y eventos. |
| DP-14 | Mensajeria y favoritos | Favoritos implementados; mensajeria no incluida | Confirmar si la mensajeria pasa a una siguiente version. |
| DP-15 | Integracion con codigo existente | Repositorio nuevo, sin codigo previo | Revisar si aparece un repositorio existente antes de desplegar. |

## Pendientes tecnicos

- Probar contra MongoDB real con replicaset y ejecutar `seed.ts`.
- Sustituir el almacenamiento local de archivos por un proveedor cloud.
- Configurar HTTPS, CORS restringido, rotacion de secretos y backups.
- Revisar las 26 vulnerabilidades reportadas por `npm audit` y actualizar
  dependencias de forma controlada.
- Aprobar scripts de instalacion (`mongodb-memory-server`, `esbuild`) en un
  entorno limpio si la politica de npm lo exige.
