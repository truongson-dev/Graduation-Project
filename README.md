# SoftSkill AI

Ứng dụng gồm frontend React/Vite, backend Laravel API và SQLite cho môi trường local. Các migration của database được lưu trong `backend/database/migrations`; file SQLite và `.env` được tạo riêng trên từng máy.

## Yêu cầu

- Windows PowerShell
- PHP 8.3 trở lên, Composer 2 và extension `pdo_sqlite`
- Node.js 20.19+ hoặc 22.12+ và npm

Đảm bảo các lệnh `php`, `composer`, `node` và `npm` chạy được trong PowerShell.

## Chạy lần đầu

Tại thư mục dự án vừa clone, chạy:

```powershell
Set-ExecutionPolicy -Scope Process Bypass
.\dev.ps1
```

Script sẽ tạo các file env local nếu chưa có, tạo SQLite database, cài dependencies, chạy migrations và mở hai cửa sổ terminal:

- Frontend: http://localhost:5173
- Backend API: http://localhost:8000/api/v1

Để dừng ứng dụng, đóng hai cửa sổ terminal đã mở.

## Cấu hình tùy chọn

Đăng nhập Google cần thông tin OAuth trong `backend/.env` (`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`). Các tính năng AI cần `GEMINI_API_KEY`. Những giá trị này không được commit; hãy xin cấu hình của môi trường dùng chung hoặc tạo credentials riêng.

Frontend lấy API URL từ `frontend/.env.local`; mặc định là `http://localhost:8000/api`. Backend dùng SQLite mặc định, nên không cần cài MySQL hay tạo database server.

## Chạy thủ công

Backend, trong một cửa sổ PowerShell:

```powershell
Set-Location backend
composer install
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
if (-not (Test-Path database/database.sqlite)) { New-Item -ItemType File database/database.sqlite }
php artisan key:generate
php artisan migrate
php artisan serve
```

Frontend, trong cửa sổ PowerShell khác:

```powershell
Set-Location frontend
npm ci
if (-not (Test-Path .env.local)) { Copy-Item .env.example .env.local }
npm run dev
```

Nếu `.env` hoặc `.env.local` đã được cấu hình, giữ nguyên các file đó và bỏ qua lệnh `Copy-Item` tương ứng.
