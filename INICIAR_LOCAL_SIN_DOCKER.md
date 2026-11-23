# SkillFinder + Grafana en Windows sin Docker

Esta modalidad ejecuta MongoDB como servicio de Windows, la API con Node.js, Prometheus como binario de Windows y Grafana como binario independiente. No utiliza Docker, Docker Desktop ni WSL.

## 1. Instalar MongoDB Community Server

1. Descarga MongoDB Community Server para Windows (MSI): https://www.mongodb.com/try/download/community
2. En el instalador elige **Complete**.
3. En **Service Configuration**, marca **Install MongoD as a Service** y deja el nombre del servicio como `MongoDB`.
4. MongoDB Compass es opcional.
5. Instala también MongoDB Shell (`mongosh`), que se descarga por separado: https://www.mongodb.com/try/download/shell
6. Abre una nueva PowerShell y confirma:

```powershell
mongod --version
mongosh --version
Get-Service MongoDB
```

MongoDB debe estar en ejecución y escuchando en `127.0.0.1:27017`.

## 2. Confirmar MongoDB local

En una PowerShell nueva ejecuta:

```powershell
Start-Service MongoDB
Get-Service MongoDB
Test-NetConnection 127.0.0.1 -Port 27017
```

El servicio debe estar `Running` y la prueba TCP debe mostrar `TcpTestSucceeded : True`. Para empezar, no necesitas configurar replica set: SkillFinder dispone de una estrategia alternativa de reservas cuando MongoDB se ejecuta como instancia independiente.

**Opcional:** si después quieres habilitar transacciones de MongoDB, configura un replica set de un solo nodo. Abre como administrador `C:\Program Files\MongoDB\Server\8.0\bin\mongod.cfg` (la ruta puede variar según la versión) y añade al final, comprobando que no exista ya una sección `replication`:

```yaml
replication:
  replSetName: rs0
```

Reinicia MongoDB desde PowerShell como administrador y ejecuta una sola vez:

```powershell
Restart-Service MongoDB
mongosh "mongodb://127.0.0.1:27017/admin" --eval "rs.initiate({_id:'rs0',members:[{_id:0,host:'127.0.0.1:27017'}]})"
mongosh "mongodb://127.0.0.1:27017/admin" --quiet --eval "rs.status().myState"
```

El último comando debe devolver `1` (PRIMARY). Solo si habilitaste replica set, añade `?replicaSet=rs0` a `MONGODB_URI` en el `.env`.

## 3. Configurar SkillFinder

Abre PowerShell en la raíz de `SkillFinder` (donde está `package.json`):

```powershell
Copy-Item .env.example .env
Copy-Item apps\client\.env.example apps\client\.env
```

Abre el `.env` de la raíz y deja esta URI para la instalación local normal (sin replica set):

```env
MONGODB_URI=mongodb://127.0.0.1:27017/skillfinder
```

Solo si activaste el replica set opcional del apartado anterior, usa `mongodb://127.0.0.1:27017/skillfinder?replicaSet=rs0`.

En ese mismo `.env`, cambia `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` y `GRAFANA_ADMIN_PASSWORD`. Mantén las contraseñas en privado.

Instala Node.js 20 o superior si todavía no está instalado: https://nodejs.org/en/download

Después, desde la raíz del proyecto:

```powershell
node --version
npm --version
npm install
```

## 4. Iniciar MongoDB y la API

MongoDB como servicio (PowerShell como administrador solo si hace falta):

```powershell
Start-Service MongoDB
```

En la primera terminal, desde la raíz de SkillFinder:

```powershell
npm run dev:api
```

Espera el mensaje de conexión a MongoDB. En otra PowerShell, comprueba:

```powershell
Invoke-RestMethod http://localhost:3000/api/health
Invoke-WebRequest http://127.0.0.1:9100/metrics -UseBasicParsing
```

No continúes hasta que la API responda y el endpoint de métricas devuelva texto Prometheus.

## 5. Iniciar Grafana y Prometheus (sin Docker)

Con la API ya funcionando, abre otra PowerShell en la raíz del proyecto y ejecuta:

```powershell
powershell -ExecutionPolicy Bypass -File .\local-windows\INICIAR-MONITOREO-LOCAL.ps1
```

El script descarga los binarios oficiales de Prometheus 3.16.0 y Grafana OSS 13.3.1, comprueba SHA-256, crea las rutas de datos, configura el datasource Prometheus y provisiona automáticamente los siete dashboards de la carpeta `SkillFinder`. Los binarios descargados se guardan en `.tools`; los datos y logs se guardan en `.local-data`.

Abre:

- Grafana: http://localhost:3001 (credenciales del `.env`, `GRAFANA_ADMIN_USER` y `GRAFANA_ADMIN_PASSWORD`).
- Prometheus Targets: http://localhost:9090/targets (el target `skillfinder-api` debe figurar `UP`).
- API: http://localhost:3000/api/health
- Métricas: http://localhost:9100/metrics

En Grafana, entra a **Dashboards → SkillFinder**. Deben aparecer los dashboards **Resumen**, **Usuarios**, **Reservas**, **Calidad**, **Categorias**, **Rankings** y **Tecnico**.

Si cambias estilos o consultas en `infra/grafana/build-dashboards.mjs`, aplica los cambios con:

```powershell
npm run grafana:sync
```

## 6. Iniciar la aplicación web

En una terminal adicional, desde la raíz:

```powershell
npm run web
```

Expo Web se sirve normalmente en http://localhost:8081. No inicies una segunda API: usa la que ya está ejecutándose en el puerto 3000.

## 7. Datos de demostración (opcional)

Solo si la base de datos está vacía y necesitas poblar los gráficos con información ficticia:

```powershell
npm run seed
```

El seed genera registros de demostración. No lo ejecutes en una base de datos que ya contenga datos reales del piloto. Reinicia la API después de sembrar para refrescar las métricas.

## 8. Detener servicios

En la terminal de la API pulsa `Ctrl + C`. Para Prometheus y Grafana:

```powershell
powershell -ExecutionPolicy Bypass -File .\local-windows\DETENER-MONITOREO-LOCAL.ps1
```

MongoDB queda como servicio de Windows y no se detiene con ese script. Para detenerlo manualmente (PowerShell como administrador):

```powershell
Stop-Service MongoDB
```

## Diagnóstico rápido

- API no conecta a MongoDB: `Get-Service MongoDB`, revisa `MONGODB_URI` y el log de API.
- Prometheus no ve la API: abre http://localhost:9090/targets; confirma que `skillfinder-api` apunte a `127.0.0.1:9100` y esté `UP`.
- Grafana no abre: revisa `.local-data\grafana-stderr.log` y `.local-data\grafana-stdout.log`.
- Prometheus no abre: revisa `.local-data\prometheus-stderr.log` y `.local-data\prometheus-stdout.log`.
- Puertos en uso: 27017 MongoDB, 3000 API, 3001 Grafana, 8081 Expo, 9090 Prometheus y 9100 métricas.

No necesitas reparar WSL para esta modalidad porque ninguno de estos componentes se ejecuta dentro de Docker.
