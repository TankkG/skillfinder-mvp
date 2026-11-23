# Monitoreo de SkillFinder con Grafana

## Arquitectura aplicada

El repositorio utiliza Node.js + Express + Mongoose y MongoDB. Por eso, esta implementacion no agrega MySQL ni crea vistas SQL paralelas: las metricas de negocio se calculan mediante agregaciones sobre los modelos MongoDB existentes (`User`, `ProfessionalProfile`, `Booking`, `Review`, `Service`, `ServiceArea` y `AuditLog`).

Flujo de datos:

```text
App React Native / Web
          |
          v
     API Express ----------------------> MongoDB replica set
          |                                  |
          | metricas internas                | agregaciones cada 30 s
          v                                  v
  Exportador :9100/metrics <----------- Colector de negocio
          |
          v
      Prometheus ---------------------> Reglas de alerta
          |
          v
       Grafana
          |
          +--> Resumen
          +--> Usuarios
          +--> Reservas
          +--> Calidad
          +--> Categorias
          +--> Rankings
          +--> Operacion tecnica
```

El puerto `9100` no se publica en el host: solo Prometheus puede consultarlo por la red privada de Docker. MongoDB, Prometheus y Grafana se enlazan a `127.0.0.1` en el host para evitar exponerlos a la red externa. El renderizador de imagenes se inicia bajo el perfil opcional `reports` y usa el token compartido `GRAFANA_RENDERER_TOKEN`, requerido por Grafana 13 para autenticacion entre servicios.

## Dashboards provisionados

Los dashboards se generan desde un unico archivo fuente, `infra/grafana/build-dashboards.mjs`, y se escriben en `infra/grafana/dashboards/`. Esto mantiene el mismo estilo, colores y transformaciones en todos los paneles.

1. **Resumen** (`skillfinder-resumen`): indicadores principales del piloto, actividad de reservas y accesos directos al resto de dashboards.
2. **Usuarios** (`skillfinder-usuarios`): clientes y profesionales registrados, verificacion, crecimiento y distribucion por rol.
3. **Reservas** (`skillfinder-reservas`): eventos de reserva, tasa de confirmacion, completadas/canceladas por mes, reservas por semana y demanda por distrito.
4. **Calidad** (`skillfinder-calidad`): calificacion por direccion, resenas bidireccionales, volumen de resenas, distribucion de estrellas por direccion y por categoria, y moderacion.
5. **Categorias** (`skillfinder-categorias`): demanda y servicios completados por categoria, subservicios mas usados y comparativa entre categorias.
6. **Rankings** (`skillfinder-rankings`): ranking interno de profesionales por categoria y ranking seudonimizado de clientes.
7. **Tecnico** (`skillfinder-tecnico`): disponibilidad, latencia P95, porcentaje de errores 5xx, solicitudes por minuto, conexion a MongoDB, alertas activas y frescura del colector.

Para regenerar y publicar los cambios en una instancia local de Grafana ya iniciada:

```powershell
npm run grafana:sync
```

El comando reconstruye los JSON y los importa en la carpeta `SkillFinder` de Grafana (`http://127.0.0.1:3001/dashboards/f/skillfinder`). Para validar que ninguna consulta quede vacia antes de presentar, ejecutar `npm run grafana:check`.

En Docker, los dashboards y la fuente Prometheus se cargan automaticamente desde `infra/grafana/provisioning/` al iniciar Grafana. No se necesita importar JSON manualmente. Los dashboards anteriores quedaron archivados en `infra/grafana/legacy/` para evitar duplicados.

## Correspondencia con el modelo real

| Indicador de la guia | Fuente real | Calculo |
|---|---|---|
| Clientes y profesionales registrados | `User` | Conteo por `role`; metas del piloto: 20 clientes y 10 profesionales |
| Profesionales verificados | `ProfessionalProfile` + `User` | `verificationStatus == APPROVED` / profesionales registrados |
| Reservas creadas por semana | `Booking` | Conteo agrupado con semana calendario local de las ultimas cinco semanas |
| Reservas confirmadas | `Booking` | `CONFIRMED`, `IN_PROGRESS` y `COMPLETED` / reservas totales |
| Servicios completados/cancelados | `Booking` | `completedAt` y `cancelledAt`, agrupados por mes local |
| Calificacion promedio | `Review` | Promedio de `rating` para reseñas `PUBLISHED`, por direccion |
| Calificacion bidireccional | `Review` + `Booking` | Servicios `COMPLETED` con ambas direcciones de resena |
| Feedback post-servicio | `Review` + `Booking` | Promedio de reseñas publicadas asociadas a reservas completadas (proxy disponible) |
| Tiempo P95 de busqueda | Middleware HTTP | Histograma de GET `/api/professionals` y `/nearby` |
| Disponibilidad | Prometheus | Proporcion de scrapes correctos del exporter de la API |
| Errores 5xx y solicitudes/minuto | Middleware HTTP | Contadores e histogramas por ruta normalizada |
| Demanda por distrito | `Booking` + `ProfessionalProfile` + `ServiceArea` | Reservas agrupadas por `ServiceArea.code` |
| Moderacion | `User`, `Review`, `AuditLog` | Cuentas `BLOCKED`, resenas `HIDDEN` y eventos auditados |
| Servicios por categoria | `Booking` + `Service` | Reservas completadas agrupadas por `categoryCode` y subespecialidad |
| Ranking profesional | `Review` + `ProfessionalProfile` + `Booking` | Minimo 3 resenas publicadas por categoria |
| Ranking de clientes | `Booking` + `Review` | Minimo 2 servicios completados; alias Cliente A, Cliente B, etc. |

## Diferencias y limites importantes

- La guia original nombra MySQL, pero el proyecto entregado usa MongoDB. Se conserva una sola base de datos y se consultan los modelos reales; no se cambia el stack funcional de la app.
- El modelo actual no tiene una entidad independiente de encuesta de satisfaccion RF027. El panel de feedback post-servicio utiliza el promedio de las resenas publicadas ligadas a reservas completadas como indicador disponible. No representa una encuesta separada.
- La busqueda se mide en las rutas reales `GET /api/professionals` y `GET /api/professionals/nearby`.
- La disponibilidad se calcula con los scrapes de Prometheus. La ventana de 30 dias solo sera representativa despues de acumular ese periodo de observaciones.
- El ranking de clientes nunca exporta nombre ni ID: utiliza seudonimos. Los nombres comerciales del ranking profesional quedan en un dashboard interno.
- La demanda por distrito solo se publica cuando el grupo tiene al menos `GRAFANA_MIN_DISTRICT_RECORDS` reservas (por defecto, 5). No se exportan coordenadas, direcciones, telefonos, documentos ni correos.
- Los rankings de profesionales requieren tres resenas publicadas. Si una categoria no cumple el minimo, el panel no inventa un ganador.
- El seed crea reservas, calificaciones y eventos de auditoria ficticios en las cuatro categorias para probar la visualizacion y alcanzar los minimos de muestra de los rankings. No deben presentarse como resultados de usuarios reales ni sembrarse en la base del piloto real.
- La guia limita el acceso a un maximo de tres integrantes del equipo durante el piloto. El alta de usuarios de Grafana queda cerrada (`GF_USERS_ALLOW_SIGN_UP=false`); el administrador debe mantener manualmente ese limite al crear cuentas internas.

## Seguridad y alcance de red

- En esta entrega, Grafana, Prometheus y MongoDB solo se publican en `127.0.0.1`; el puerto de metricas `9100` solo existe dentro de la red privada de Docker. El alta publica y el acceso anonimo de Grafana estan deshabilitados.
- El perfil local usa HTTP en `localhost` para facilitar la ejecucion de desarrollo sin instalar certificados. No debe publicarse Grafana por LAN, VPN o Internet en esta configuracion. Para un piloto multiusuario sobre red privada/VPN, coloca un proxy TLS con certificado confiable delante de Grafana y actualiza `GF_SERVER_ROOT_URL`; no abras directamente el puerto 3001.
- La guia pide HTTPS y un maximo de tres cuentas internas. El primer punto requiere el certificado/proxy institucional que no viene en el ZIP; el segundo se mantiene como limite operativo y debe respetarlo el administrador al crear cuentas.

## Alertas

Las reglas se evaluan en Prometheus y aparecen en el dashboard **Tecnico**:

- API no disponible durante 1 minuto.
- Disponibilidad observada por debajo del 99% durante una hora, sostenida por 15 minutos.
- Errores HTTP 5xx por encima del 5% durante 5 minutos.
- P95 de busqueda por encima de 3 segundos durante 5 minutos.
- MongoDB desconectado durante 1 minuto.
- Colector de metricas sin refrescar durante mas de 90 segundos.

Las reglas quedan definidas en `infra/prometheus/alerts.yml`. Para enviar correo, Slack u otro aviso externo se debe configurar un receptor de Alertmanager/Grafana con credenciales del equipo; el proyecto no inventa ni incluye destinos de notificacion.

## Exportacion de reportes

- CSV: abrir un panel tipo tabla, seleccionar **Inspect > Data > Download CSV**.
- Imagen: usar **Share / Export** en Grafana. El servicio de renderizado se incluye como perfil opcional para no consumir recursos mientras se desarrolla la app.
- PDF semanal: instalar el renderizador y ejecutar `infra/scripts/export_grafana_report.py`. El script recorre los dashboards de la carpeta `SkillFinder`; el parametro `--category` decide la categoria usada en el reporte de detalle.

El renderizador oficial puede consumir bastantes recursos. Grafana documenta como referencia 16 GiB de memoria y 4 CPU para cargas de renderizado exigentes; por eso solo se inicia cuando se necesita exportar PDF. Cambia el valor de `GRAFANA_RENDERER_TOKEN` en `.env` junto con la clave de administrador; Compose entrega el mismo token a Grafana y al renderizador.
