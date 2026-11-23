$ErrorActionPreference = 'Stop'
$ProjectRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$LocalDataDir = Join-Path $ProjectRoot '.local-data'
foreach ($name in @('grafana', 'prometheus')) {
  $pidFile = Join-Path $LocalDataDir "$name.pid"
  if (Test-Path $pidFile) {
    $processId = 0
    try { $processId = [int](Get-Content $pidFile -Raw).Trim() } catch { $processId = 0 }
    if ($processId -gt 0 -and (Get-Process -Id $processId -ErrorAction SilentlyContinue)) {
      Stop-Process -Id $processId -Force
      Write-Host "$name detenido (PID $processId)." -ForegroundColor Green
    }
    Remove-Item $pidFile -Force -ErrorAction SilentlyContinue
  }
}
Write-Host 'MongoDB y la API no se detuvieron. Detenlos por separado si lo necesitas.'
