# SkillFinder

Plataforma web y movil para encontrar, reservar y calificar servicios automotrices
(mecanicos, chaperos, gomeros y electricistas automotrices) del Distrito 2 de
Cercado, Cochabamba, Bolivia.

Implementacion del documento
`SkillFinder_Especificacion_Completa (1).md`.

## Stack

| Capa | Tecnologia |
|---|---|
| API | Node.js + TypeScript + Express + Mongoose |
| Base de datos | MongoDB (indices geoespaciales `2dsphere`, transacciones) |
| Cliente | React Native + Expo + TypeScript (Android y web con React Native Web) |
| Mapas | Leaflet/OpenStreetMap en web, react-native-maps en Android |
| Autenticacion | JWT (access + refresh rotativo), bcrypt |
| Pruebas | Vitest + Supertest + mongodb-memory-server |

## Estructura

```text
SkillFinder/
├── apps/
│   ├── api/          Backend Node.js/TypeScript (API REST)
│   └── client/       App React Native (Android) + web
├── packages/
│   └── shared/       Tipos, constantes y contratos compartidos
├── docs/             Requisitos, API, base de datos, decisiones y pruebas
├── infra/scripts/    Utilidades de operacion
└── .env.example
```

## Requisitos

- Node.js >= 20 para el cliente Expo y el desarrollo local.
- Docker Desktop con Docker Compose v2 para levantar el stack integrado de MongoDB, API, Prometheus y Grafana.
- Para ejecucion local sin Docker: MongoDB >= 6. Para transacciones, usar un replica set.

## Instalacion

```bash
npm install
cp .env.example .env              # Windows: copy .env.example .env
cp apps/client/.env.example apps/client/.env   # Windows: copy apps\client\.env.example apps\client\.env
```

Editar `.env` en la raiz (cadena de MongoDB, secretos JWT, datos del admin y credenciales locales de Grafana).

## Datos iniciales (seed)

```bash
npm run seed
```

Crea:

- Las cuatro categorias permitidas: `MEC`, `CHA`, `GOM`, `ELA` y sus
  subespecialidades.
- El area piloto `CBBA-D2` con un poligono **provisional** claramente marcado
  (debe reemplazarse por el limite oficial verificado; ver DP-02).
- El usuario administrador definido en `ADMIN_EMAIL` / `ADMIN_PASSWORD`.
- Contenido inicial editable: preguntas frecuentes y politica de cancelacion.
- Profesionales y clientes de demostracion con servicios y horarios.

Credenciales demo (si se ejecuta el seed con valores por defecto):

| Rol | Correo | Contrasena |
|---|---|---|
| Admin | `admin@skillfinder.bo` | `Admin12345!` |
| Cliente | `cliente@skillfinder.bo` | `Cliente12345!` |
| Profesional | `mecanico@skillfinder.bo` | `Pro123456!` |

## Ejecucion

Terminal 1 (API):

```bash
npm run dev:api
```

Terminal 2 (cliente):

```bash
npm run dev:client    # Expo: elegir web o Android
npm run web           # directamente web
npm run android       # directamente Android
```

- API: `http://localhost:3000/api`
- Documentacion interactiva: `http://localhost:3000/api/docs`
- Web: `http://localhost:8081` (Expo web)

En Android fisico, configurar `EXPO_PUBLIC_API_URL` apuntando a la IP de la
maquina que ejecuta la API (ver `apps/client/.env.example`). En ese caso, cambia
`API_BIND_ADDRESS=0.0.0.0` en `.env` y permite el puerto 3000 solo en la red
privada desde el Firewall de Windows; Grafana y Prometheus siguen enlazados a localhost.

## Monitoreo integrado con Grafana

La carpeta `infra/` contiene el stack Docker y la provision automatica de Prometheus y Grafana. Los dashboards se cargan solos y consultan metricas calculadas desde MongoDB por la API.

### Arranque en Windows (PowerShell)

```powershell
copy .env.example .env
# Abre .env y cambia GRAFANA_ADMIN_PASSWORD, GRAFANA_RENDERER_TOKEN y los dos secretos JWT.
docker compose --env-file .env -f infra/docker-compose.yml up -d --build
# Opcional para poblar los paneles con datos ficticios de demostracion:
docker compose --env-file .env -f infra/docker-compose.yml --profile tools run --rm seed
# Fuerza una lectura inmediata de los datos que acaba de sembrar:
docker compose --env-file .env -f infra/docker-compose.yml restart api
docker compose --env-file .env -f infra/docker-compose.yml ps
```

Accesos locales:

- Grafana: `http://localhost:3001` (usuario y contrasena definidos en `.env`).
- Prometheus: `http://localhost:9090/targets` (el objetivo `skillfinder-api` debe figurar UP).
- API: `http://localhost:3000/api/health`.
- Documentacion de la API: `http://localhost:3000/api/docs`.

Los paneles estan en la carpeta **SkillFinder** de Grafana: dashboard de negocio, dashboard tecnico y reportes por categoria. Para iniciar la app Expo mientras API/MongoDB/Grafana siguen en Docker, ejecuta en otra terminal `npm install` y `npm run dev:client` (o `npm run web`).

Comandos auxiliares:

```powershell
npm run grafana:ps
npm run grafana:logs
npm run grafana:refresh
npm run grafana:down
```

Para exportar reportes PDF, inicia el renderizador (solo cuando lo necesites):

```powershell
docker compose --env-file .env -f infra/docker-compose.yml --profile reports up -d renderer
py -m pip install -r infra/scripts/requirements-grafana.txt
$env:GRAFANA_URL = "http://localhost:3001"
$env:GRAFANA_USER = "admin"
$env:GRAFANA_PASSWORD = "la-clave-configurada-en-.env"
py infra/scripts/export_grafana_report.py --from now-7d --to now --category MEC
```

El PDF se guarda en `reports/`. El informe tecnico y las metricas disponibles se documentan en [`docs/GRAFANA.md`](docs/GRAFANA.md). La implementacion usa MongoDB porque es la base de datos real del repositorio; no agrega MySQL. Grafana y Prometheus quedan enlazados solo a `127.0.0.1`.

**Importante:** el comando `seed` agrega usuarios, reservas, calificaciones y eventos de auditoria ficticios en las cuatro categorias para que los dashboards se vean poblados al probarlos. No son participantes reales ni resultados del piloto. No ejecutes este seed sobre una base con datos reales del piloto.

## Pruebas

```bash
npm run test:api
```

Incluye pruebas unitarias de calculo de franjas y una prueba de concurrencia
que dispara solicitudes simultaneas por los mismos bloques y verifica que solo
una reserva se confirme (`docs/tests/`).

## Decisiones y pendientes

Ver:

- `docs/decisions/ADR-001-stack-y-arquitectura.md`
- `docs/decisions/ADR-002-reservas-atomicas.md`
- `docs/decisions/ADR-003-mapas.md`
- `docs/pendientes.md` (DP-01 a DP-15 de la especificacion)

## Estado del MVP

Implementado el flujo completo: registro por rol, perfiles, catalogo, mapa,
horarios, disponibilidad, reservas atomicas con idempotencia y expiracion,
mensajes de reserva, recordatorios, reseñas bidireccionales, reputacion de
clientes, verificacion de correo/telefono por codigo, contenido editable,
ranking semanal, calendario dia/semana/mes, notificaciones, verificacion
documental, moderacion, auditoria y panel administrativo. Los proveedores
externos (correo, push, almacenamiento en la nube) funcionan con adaptadores
`console`/`local` y quedan listos para configurarse.

## Ejecucion local sin Docker (Windows)

Si Docker Desktop o WSL no funcionan, sigue [`INICIAR_LOCAL_SIN_DOCKER.md`](./INICIAR_LOCAL_SIN_DOCKER.md). Esta modalidad instala MongoDB como servicio de Windows y ejecuta API, Prometheus y Grafana directamente en el equipo, sin Docker.
