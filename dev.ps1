$ErrorActionPreference = 'Stop'

$ProjectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$BackendPath = Join-Path $ProjectRoot 'backend'
$FrontendPath = Join-Path $ProjectRoot 'frontend'

foreach ($CommandName in @('php', 'composer', 'npm')) {
  if (-not (Get-Command $CommandName -ErrorAction SilentlyContinue)) {
    throw "Không tìm thấy '$CommandName'. Hãy cài PHP 8.3+, Composer 2 và Node.js/npm, rồi thêm vào PATH."
  }
}

$PhpVersionText = php -r 'echo PHP_VERSION;'
if ($LASTEXITCODE -ne 0 -or [version]$PhpVersionText -lt [version]'8.3') {
  throw 'Backend yêu cầu PHP 8.3 trở lên.'
}
$PhpModules = php -m
if ($LASTEXITCODE -ne 0 -or $PhpModules -notcontains 'pdo_sqlite') {
  throw 'Backend cần bật PHP extension pdo_sqlite để dùng SQLite.'
}

$BackendEnvPath = Join-Path $BackendPath '.env'
$BackendEnvExamplePath = Join-Path $BackendPath '.env.example'
if (-not (Test-Path -LiteralPath $BackendEnvPath)) {
  Copy-Item -LiteralPath $BackendEnvExamplePath -Destination $BackendEnvPath
}

$DatabasePath = Join-Path $BackendPath 'database/database.sqlite'
if (-not (Test-Path -LiteralPath $DatabasePath)) {
  New-Item -ItemType File -Path $DatabasePath -Force | Out-Null
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
    throw 'Cài dependencies backend thất bại.'
  }
  $HasAppKey = Select-String -Path $BackendEnvPath -Pattern '^APP_KEY=base64:.+' -Quiet
  if (-not $HasAppKey) {
    php artisan key:generate
    if ($LASTEXITCODE -ne 0) {
      throw 'Tạo APP_KEY thất bại.'
    }
  }
  php artisan migrate --force
  if ($LASTEXITCODE -ne 0) {
    throw 'Chạy migration database thất bại.'
  }
}
finally {
  Pop-Location
}

Push-Location $FrontendPath
try {
  npm ci
  if ($LASTEXITCODE -ne 0) {
    throw 'Cài dependencies frontend thất bại.'
  }
}
finally {
  Pop-Location
}

Start-Process -FilePath 'powershell.exe' -WorkingDirectory $BackendPath -ArgumentList @(
  '-NoExit', '-Command', 'php artisan serve --host=127.0.0.1 --port=8000'
)
Start-Process -FilePath 'powershell.exe' -WorkingDirectory $FrontendPath -ArgumentList @(
  '-NoExit', '-Command', 'npm run dev -- --host 127.0.0.1 --port 5173 --strictPort'
)

Write-Host 'Frontend: http://localhost:5173'
Write-Host 'Backend:  http://localhost:8000/api/v1'
