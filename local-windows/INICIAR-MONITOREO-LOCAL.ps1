$ErrorActionPreference = 'Stop'

$ProjectRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$ToolsDir = Join-Path $ProjectRoot '.tools'
$LocalDataDir = Join-Path $ProjectRoot '.local-data'
$EnvFile = Join-Path $ProjectRoot '.env'
$PromVersion = '3.16.0'
$GrafanaVersion = '13.3.1'
$PromZip = Join-Path $ToolsDir "prometheus-$PromVersion.windows-amd64.zip"
$GrafanaArchive = Join-Path $ToolsDir "grafana-$GrafanaVersion.windows-amd64.tar.gz"
$PromDir = Join-Path $ToolsDir "prometheus-$PromVersion.windows-amd64"
$GrafanaExtractDir = Join-Path $ToolsDir "grafana-$GrafanaVersion"

function Write-Info([string]$Message) { Write-Host "[SkillFinder] $Message" -ForegroundColor Cyan }
function Write-Warn([string]$Message) { Write-Host "[Aviso] $Message" -ForegroundColor Yellow }
function Test-Port([int]$Port) {
  $client = New-Object System.Net.Sockets.TcpClient
  try {
    $result = $client.BeginConnect('127.0.0.1', $Port, $null, $null)
    $success = $result.AsyncWaitHandle.WaitOne(800)
    if (-not $success) { return $false }
    $client.EndConnect($result)
    return $true
  } catch { return $false } finally { $client.Close() }
}
function Get-EnvValue([string]$Name, [string]$DefaultValue) {
  if (-not (Test-Path $EnvFile)) { return $DefaultValue }
  $line = Get-Content $EnvFile | Where-Object { $_ -match "^\s*$([regex]::Escape($Name))\s*=" } | Select-Object -Last 1
  if (-not $line) { return $DefaultValue }
  $value = ($line -split '=', 2)[1].Trim()
  if (($value.StartsWith('"') -and $value.EndsWith('"')) -or ($value.StartsWith("'") -and $value.EndsWith("'"))) {
    $value = $value.Substring(1, $value.Length - 2)
  }
  return $value
}
function Ensure-Download([string]$Url, [string]$Path, [string]$ExpectedSha256) {
  $folder = Split-Path $Path -Parent
  New-Item -ItemType Directory -Force -Path $folder | Out-Null
  $valid = $false
  if (Test-Path $Path) {
    $existingHash = (Get-FileHash -Path $Path -Algorithm SHA256).Hash.ToLowerInvariant()
    $valid = ($existingHash -eq $ExpectedSha256.ToLowerInvariant())
    if (-not $valid) { Remove-Item $Path -Force }
  }
  if (-not $valid) {
    Write-Info "Descargando $([IO.Path]::GetFileName($Path)) ..."
    Invoke-WebRequest -Uri $Url -OutFile $Path -UseBasicParsing
    $downloadHash = (Get-FileHash -Path $Path -Algorithm SHA256).Hash.ToLowerInvariant()
    if ($downloadHash -ne $ExpectedSha256.ToLowerInvariant()) {
      Remove-Item $Path -Force -ErrorAction SilentlyContinue
      throw "El SHA256 de $Path no coincide. Se elimino el archivo descargado."
    }
  }
}
function Wait-Http([string]$Url, [string]$ServiceName, [int]$Attempts = 40) {
  for ($i = 0; $i -lt $Attempts; $i++) {
    try {
      $response = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 3
      if ($response.StatusCode -ge 200 -and $response.StatusCode -lt 500) {
        Write-Info "$ServiceName esta respondiendo en $Url"
        return $true
      }
    } catch { Start-Sleep -Seconds 2 }
  }
  return $false
}

Write-Info "Proyecto: $ProjectRoot"
if (-not (Test-Path $EnvFile)) {
  throw "No existe .env. Desde la raiz ejecuta primero: Copy-Item .env.example .env y completa la configuracion."
}
if (-not (Get-Command tar.exe -ErrorAction SilentlyContinue)) {
  throw 'No se encontro tar.exe. Actualiza Windows 10/11 o instala una herramienta compatible para extraer TAR.GZ.'
}

$prometheusTargetUp = Test-Port 9100
if (-not $prometheusTargetUp) {
  Write-Warn 'No detecto la API en el puerto 9100. Inicia primero la API con: npm run dev:api. Prometheus arrancara, pero el target de SkillFinder aparecera DOWN hasta iniciar la API.'
}

if (Test-Port 9090) { throw 'El puerto 9090 ya esta ocupado. Cierra el proceso que lo usa antes de iniciar Prometheus.' }
if (Test-Port 3001) { throw 'El puerto 3001 ya esta ocupado. Cierra el proceso que lo usa antes de iniciar Grafana.' }

[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
Ensure-Download `
  'https://github.com/prometheus/prometheus/releases/download/v3.16.0/prometheus-3.16.0.windows-amd64.zip' `
  $PromZip `
  '89c03c2f24400fb58668440b6d7226f68564acda27d657e77acfbda42be32cb3'
Ensure-Download `
  'https://dl.grafana.com/grafana/release/13.3.1/grafana_13.3.1_42849527790_windows_amd64.tar.gz' `
  $GrafanaArchive `
  'cb78dceb990948fe7f1a189a0737fa7f6cf212076fc139a57d48cbc45dc0393f'

New-Item -ItemType Directory -Force -Path $LocalDataDir | Out-Null
if (-not (Test-Path (Join-Path $PromDir 'prometheus.exe'))) {
  Write-Info 'Extrayendo Prometheus...'
  Expand-Archive -Path $PromZip -DestinationPath $ToolsDir -Force
}
if (-not (Test-Path $GrafanaExtractDir)) {
  New-Item -ItemType Directory -Force -Path $GrafanaExtractDir | Out-Null
  Write-Info 'Extrayendo Grafana...'
  & tar.exe -xzf $GrafanaArchive -C $GrafanaExtractDir
  if ($LASTEXITCODE -ne 0) { throw 'No se pudo extraer el paquete de Grafana.' }
}

$PromExe = Join-Path $PromDir 'prometheus.exe'
if (-not (Test-Path $PromExe)) { throw "No se encontro prometheus.exe en $PromDir" }
$GrafanaExeItem = Get-ChildItem -Path $GrafanaExtractDir -Filter 'grafana-server.exe' -Recurse -ErrorAction SilentlyContinue | Select-Object -First 1
if (-not $GrafanaExeItem) { throw "No se encontro grafana-server.exe dentro de $GrafanaExtractDir" }
$GrafanaExe = $GrafanaExeItem.FullName
$GrafanaHome = Split-Path $GrafanaExeItem.Directory.FullName -Parent

$PromDataDir = Join-Path $LocalDataDir 'prometheus'
$GrafanaDataDir = Join-Path $LocalDataDir 'grafana'
$ProvisioningDir = Join-Path $LocalDataDir 'grafana-provisioning'
$DashboardDir = (Resolve-Path (Join-Path $ProjectRoot 'infra\grafana\dashboards')).Path.Replace('\', '/')
$AlertRulesPath = (Resolve-Path (Join-Path $ProjectRoot 'infra\prometheus\alerts.yml')).Path.Replace('\', '/')
$PromConfig = Join-Path $LocalDataDir 'prometheus-local.yml'
$PromConfigContent = @"
global:
  scrape_interval: 15s
  evaluation_interval: 15s
  scrape_timeout: 10s

rule_files:
  - '$AlertRulesPath'

scrape_configs:
  - job_name: skillfinder-api
    metrics_path: /metrics
    static_configs:
      - targets: ['127.0.0.1:9100']
  - job_name: prometheus
    static_configs:
      - targets: ['127.0.0.1:9090']
"@
Set-Content -Path $PromConfig -Value $PromConfigContent -Encoding UTF8

$DatasourceDir = Join-Path $ProvisioningDir 'datasources'
$DashboardsProvisioningDir = Join-Path $ProvisioningDir 'dashboards'
New-Item -ItemType Directory -Force -Path $DatasourceDir, $DashboardsProvisioningDir, $PromDataDir, $GrafanaDataDir | Out-Null
$DatasourceConfig = @'
apiVersion: 1
datasources:
  - name: Prometheus
    uid: fg44r1a0qaqrkd
    type: prometheus
    access: proxy
    url: http://127.0.0.1:9090
    isDefault: true
    editable: false
    jsonData:
      timeInterval: 15s
'@
Set-Content -Path (Join-Path $DatasourceDir 'prometheus.yml') -Value $DatasourceConfig -Encoding UTF8
$DashboardConfig = @"
apiVersion: 1
providers:
  - name: SkillFinder
    orgId: 1
    folder: SkillFinder
    folderUid: skillfinder
    type: file
    disableDeletion: false
    editable: true
    updateIntervalSeconds: 30
    options:
      path: '$DashboardDir'
"@
Set-Content -Path (Join-Path $DashboardsProvisioningDir 'dashboards.yml') -Value $DashboardConfig -Encoding UTF8

Write-Info 'Iniciando Prometheus...'
$PromOut = Join-Path $LocalDataDir 'prometheus-stdout.log'
$PromErr = Join-Path $LocalDataDir 'prometheus-stderr.log'
$PromArgs = "--config.file=`"$PromConfig`" --storage.tsdb.path=`"$PromDataDir`" --web.listen-address=127.0.0.1:9090 --web.enable-lifecycle --storage.tsdb.retention.time=90d"
$PromProcess = Start-Process -FilePath $PromExe -ArgumentList $PromArgs -WorkingDirectory $PromDir -WindowStyle Hidden -PassThru -RedirectStandardOutput $PromOut -RedirectStandardError $PromErr
Set-Content -Path (Join-Path $LocalDataDir 'prometheus.pid') -Value $PromProcess.Id
if (-not (Wait-Http 'http://127.0.0.1:9090/-/ready' 'Prometheus' 30)) {
  throw "Prometheus no respondio. Revisa $PromOut y $PromErr"
}

Write-Info 'Iniciando Grafana...'
$env:GF_PATHS_DATA = $GrafanaDataDir
$env:GF_PATHS_LOGS = Join-Path $LocalDataDir 'grafana-logs'
$env:GF_PATHS_PLUGINS = Join-Path $LocalDataDir 'grafana-plugins'
$env:GF_PATHS_PROVISIONING = $ProvisioningDir
$env:GF_SERVER_HTTP_ADDR = '127.0.0.1'
$env:GF_SERVER_HTTP_PORT = '3001'
$env:GF_SERVER_ROOT_URL = 'http://localhost:3001/'
$env:GF_SECURITY_ADMIN_USER = Get-EnvValue 'GRAFANA_ADMIN_USER' 'admin'
$env:GF_SECURITY_ADMIN_PASSWORD = Get-EnvValue 'GRAFANA_ADMIN_PASSWORD' 'admin'
$env:GF_USERS_ALLOW_SIGN_UP = 'false'
$GrafanaOut = Join-Path $LocalDataDir 'grafana-stdout.log'
$GrafanaErr = Join-Path $LocalDataDir 'grafana-stderr.log'
$GrafanaArgs = "--homepath=`"$GrafanaHome`""
$GrafanaProcess = Start-Process -FilePath $GrafanaExe -ArgumentList $GrafanaArgs -WorkingDirectory $GrafanaHome -WindowStyle Hidden -PassThru -RedirectStandardOutput $GrafanaOut -RedirectStandardError $GrafanaErr
Set-Content -Path (Join-Path $LocalDataDir 'grafana.pid') -Value $GrafanaProcess.Id
if (-not (Wait-Http 'http://127.0.0.1:3001/api/health' 'Grafana' 45)) {
  throw "Grafana no respondio. Revisa $GrafanaOut y $GrafanaErr"
}

Write-Host ''
Write-Host 'MONITOREO LOCAL INICIADO' -ForegroundColor Green
Write-Host 'Grafana:    http://localhost:3001'
Write-Host 'Prometheus: http://localhost:9090/targets'
Write-Host "Usuario Grafana: $env:GF_SECURITY_ADMIN_USER"
Write-Host 'Contrasena Grafana: valor GRAFANA_ADMIN_PASSWORD del archivo .env'
Write-Host "Logs: $LocalDataDir"
if (-not $prometheusTargetUp) {
  Write-Warn 'Inicia la API en otra terminal: npm run dev:api. Luego actualiza /targets y confirma que skillfinder-api este UP.'
}
