$ErrorActionPreference = 'Stop'

$ProjectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$BackendPath = Join-Path $ProjectRoot 'backend'
$FrontendPath = Join-Path $ProjectRoot 'frontend'

foreach ($CommandName in @('php', 'composer', 'pnpm')) {
  if (-not (Get-Command $CommandName -ErrorAction SilentlyContinue)) {
    throw "Khong tim thay '$CommandName'. Hay cai PHP 8.3+, Composer 2 va Node.js/pnpm, roi them vao PATH."
  }
}

$PhpVersionText = php -r 'echo PHP_VERSION;'
if ($LASTEXITCODE -ne 0 -or [version]$PhpVersionText -lt [version]'8.3') {
  throw 'Backend yeu cau PHP 8.3 tro len.'
}

$BackendEnvPath = Join-Path $BackendPath '.env'
$BackendEnvExamplePath = Join-Path $BackendPath '.env.example'
if (-not (Test-Path -LiteralPath $BackendEnvPath)) {
  Copy-Item -LiteralPath $BackendEnvExamplePath -Destination $BackendEnvPath
}

$FrontendEnvPath = Join-Path $FrontendPath '.env.local'
$FrontendEnvExamplePath = Join-Path $FrontendPath '.env.example'
if (-not (Test-Path -LiteralPath $FrontendEnvPath)) {
  Copy-Item -LiteralPath $FrontendEnvExamplePath -Destination $FrontendEnvPath
}

Push-Location $BackendPath
try {
  composer install
  if ($LASTEXITCODE -ne 0) {
    throw 'Cai dependencies backend that bai.'
  }
  $HasAppKey = Select-String -Path $BackendEnvPath -Pattern '^APP_KEY=base64:.+' -Quiet
  if (-not $HasAppKey) {
    php artisan key:generate
    if ($LASTEXITCODE -ne 0) {
      throw 'Tao APP_KEY that bai.'
    }
  }
  php artisan migrate --force
  if ($LASTEXITCODE -ne 0) {
    throw 'Chay migration database that bai.'
  }
}
finally {
  Pop-Location
}

Push-Location $FrontendPath
try {
  pnpm install
  if ($LASTEXITCODE -ne 0) {
    throw 'Cai dependencies frontend that bai.'
  }
}
finally {
  Pop-Location
}

Start-Process -FilePath 'powershell.exe' -WorkingDirectory $BackendPath -ArgumentList @(
  '-NoExit', '-Command', 'php artisan serve --host=127.0.0.1 --port=8000'
)
Start-Process -FilePath 'powershell.exe' -WorkingDirectory $BackendPath -ArgumentList @(
  '-NoExit', '-Command', 'php artisan queue:work --queue=presentations,default --tries=3 --timeout=200'
)
Start-Process -FilePath 'powershell.exe' -WorkingDirectory $FrontendPath -ArgumentList @(
  '-NoExit', '-Command', 'pnpm run dev -- --host 127.0.0.1 --port 5173 --strictPort'
)

Write-Host 'Frontend: http://localhost:5173'
Write-Host 'Backend:  http://localhost:8000/api/v1'
