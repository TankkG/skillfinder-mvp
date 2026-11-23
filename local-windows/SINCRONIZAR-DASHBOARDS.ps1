param(
  [string]$GrafanaUrl = 'http://127.0.0.1:3001',
  [string]$User,
  [string]$Password
)

$ErrorActionPreference = 'Stop'

$ProjectRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$EnvFile = Join-Path $ProjectRoot '.env'
$DashboardDir = Join-Path $ProjectRoot 'infra\grafana\dashboards'
$FolderUid = 'skillfinder'
$FolderTitle = 'SkillFinder'

function Get-EnvValue([string]$Name) {
  if (-not (Test-Path $EnvFile)) { return $null }
  $line = Get-Content $EnvFile | Where-Object { $_ -match "^\s*$([regex]::Escape($Name))\s*=" } | Select-Object -Last 1
  if (-not $line) { return $null }
  $value = ($line -split '=', 2)[1].Trim()
  if (($value.StartsWith('"') -and $value.EndsWith('"')) -or ($value.StartsWith("'") -and $value.EndsWith("'"))) {
    $value = $value.Substring(1, $value.Length - 2)
  }
  return $value
}

if (-not $User) { $User = Get-EnvValue 'GRAFANA_ADMIN_USER' }
if (-not $User) { $User = 'admin' }
$candidates = New-Object System.Collections.Generic.List[string]
if ($Password) { $candidates.Add($Password) } else {
  $envPassword = Get-EnvValue 'GRAFANA_ADMIN_PASSWORD'
  if ($envPassword) { $candidates.Add($envPassword) }
  if (-not $candidates.Contains('admin')) { $candidates.Add('admin') }
}

function Invoke-Grafana([string]$Method, [string]$Path, $Body, [string]$Auth) {
  $headers = @{ Authorization = $Auth }
  $uri = "$($GrafanaUrl.TrimEnd('/'))$Path"
  if ($null -eq $Body) {
    return Invoke-RestMethod -Method $Method -Uri $uri -Headers $headers -TimeoutSec 20
  }
  $json = $Body | ConvertTo-Json -Depth 100 -Compress
  $bytes = [Text.Encoding]::UTF8.GetBytes($json)
  return Invoke-RestMethod -Method $Method -Uri $uri -Headers $headers -Body $bytes -ContentType 'application/json; charset=utf-8' -TimeoutSec 30
}

$auth = $null
$lastError = $null
foreach ($candidate in $candidates) {
  $basic = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes("$($User):$candidate"))
  try {
    Invoke-Grafana 'GET' '/api/search?type=dash-db' $null "Basic $basic" | Out-Null
    $auth = "Basic $basic"
    break
  } catch {
    $lastError = $_.Exception.Message
  }
}
if (-not $auth) {
  throw "No se pudo autenticar en Grafana ($GrafanaUrl). Usa -User y -Password, o revisa GRAFANA_ADMIN_USER/GRAFANA_ADMIN_PASSWORD en .env. Detalle: $lastError"
}

# Carpeta destino
try {
  Invoke-Grafana 'POST' '/api/folders' @{ title = $FolderTitle; uid = $FolderUid } $auth | Out-Null
  Write-Host "Carpeta creada: $FolderTitle" -ForegroundColor Cyan
} catch {
  Write-Host "Carpeta existente: $FolderTitle" -ForegroundColor DarkGray
}

$synced = @()
Get-ChildItem -Path $DashboardDir -Filter '*.json' | ForEach-Object {
  $dashboard = Get-Content $_.FullName -Raw -Encoding UTF8 | ConvertFrom-Json
  $payload = @{
    dashboard = $dashboard
    folderUid = $FolderUid
    overwrite = $true
    message = 'Sincronizacion automatica de dashboards SkillFinder'
  }
  $result = Invoke-Grafana 'POST' '/api/dashboards/db' $payload $auth
  Write-Host ("Sincronizado: {0}" -f $dashboard.title) -ForegroundColor Green
  $synced += $dashboard.uid
}

# Retirar dashboards antiguos que ya fueron reemplazados por los nuevos.
$obsolete = @('skillfinder-negocio', 'skillfinder-negocioo', 'skillfinder-reportes-categoria', 'skillfinder-archive')
foreach ($uid in $obsolete) {
  if ($synced -contains $uid) { continue }
  try {
    Invoke-Grafana 'DELETE' "/api/dashboards/uid/$uid" $null $auth | Out-Null
    Write-Host "Eliminado dashboard antiguo: $uid" -ForegroundColor Yellow
  } catch {
    # Si no existe, no es un error.
  }
}

Write-Host ''
Write-Host "Dashboards sincronizados: $($synced.Count)" -ForegroundColor Green
Write-Host "Abre: $($GrafanaUrl.TrimEnd('/'))/dashboards/f/$FolderUid" -ForegroundColor Cyan
