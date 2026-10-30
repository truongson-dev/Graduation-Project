# SoftSkill AI

Ứng dụng gồm frontend React/Vite, backend Laravel API và SQLite dùng cho môi trường local. Database được tạo từ các migration trong `backend/database/migrations`; mỗi máy tự tạo file SQLite và file cấu hình môi trường riêng.

## 1. Lấy mã nguồn nhánh `dev`

Mở PowerShell tại thư mục muốn lưu dự án và chạy:

```powershell
git clone -b dev https://github.com/truongson-dev/Graduation-Project.git
Set-Location Graduation-Project
```

Repo hiện đặt ở chế độ private, vì vậy cần đăng nhập GitHub và có quyền truy cập repo. Nếu đã clone repo trước đó, vào thư mục dự án rồi cập nhật nhánh:

```powershell
Set-Location "C:\duong-dan\Graduation-Project"
git switch dev
git pull origin dev
```

Thay `C:\duong-dan\Graduation-Project` bằng đường dẫn thật tới thư mục đã clone.

## 2. Cài môi trường cần thiết

Cài các phần mềm sau trước khi chạy dự án:

- **PHP 8.3 trở lên**, bật extension `pdo_sqlite` để Laravel kết nối SQLite.
- **Composer 2** để cài thư viện backend.
- **Node.js 20.19 trở lên hoặc 22.12 trở lên** (đi kèm npm) để chạy frontend.
- **Windows PowerShell**.

Đóng rồi mở lại PowerShell sau khi cài đặt để cập nhật `PATH`. Kiểm tra các lệnh đã sẵn sàng:

```powershell
php --version
composer --version
php -m | Select-String pdo_sqlite
node --version
npm --version
```

Lệnh kiểm tra `pdo_sqlite` phải in ra `pdo_sqlite`. Nếu không thấy, bật extension trong cấu hình PHP (`php.ini`) rồi mở lại PowerShell.

## 3. Cách nhanh: chạy BE và FE bằng một lệnh

Đây là cách khuyến nghị cho lần chạy đầu. Tại thư mục gốc `Graduation-Project`, chạy:

```powershell
Set-ExecutionPolicy -Scope Process Bypass
.\dev.ps1
```

Script sẽ tự thực hiện các bước sau:

1. Kiểm tra PHP 8.3+, Composer, npm và `pdo_sqlite`.
2. Tạo `backend/.env` từ `.env.example` nếu máy chưa có.
3. Tạo `backend/database/database.sqlite` nếu chưa có.
4. Tạo `frontend/.env.local` từ `.env.example` nếu máy chưa có.
5. Cài thư viện bằng `composer install` và `npm ci`.
6. Tạo `APP_KEY` nếu chưa có và chạy migration để tạo các bảng database.
7. Mở hai cửa sổ PowerShell mới để chạy BE và FE.

Khi hai cửa sổ mới hiện ra và không báo lỗi, mở frontend tại **http://localhost:5173**. Backend API chạy tại **http://localhost:8000**; các API của ứng dụng có tiền tố **http://localhost:8000/api/v1**.

Để dừng ứng dụng, nhấn `Ctrl+C` trong từng cửa sổ BE và FE hoặc đóng hai cửa sổ đó.

## 4. Cách thủ công: chạy riêng BE và FE

Dùng cách này nếu muốn kiểm soát từng tiến trình. Mở **hai cửa sổ PowerShell** tại thư mục gốc `Graduation-Project`. Chạy BE ở cửa sổ thứ nhất, rồi FE ở cửa sổ thứ hai.

### 4.1 Chạy backend (BE)

Trong cửa sổ PowerShell thứ nhất:

```powershell
Set-Location backend
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
if (-not (Test-Path database/database.sqlite)) { New-Item -ItemType File database/database.sqlite | Out-Null }
composer install
if (-not (Select-String -Path .env -Pattern '^APP_KEY=base64:.+' -Quiet)) { php artisan key:generate }
php artisan migrate
php artisan serve --host=127.0.0.1 --port=8000
```

Giữ cửa sổ này mở trong lúc sử dụng ứng dụng. BE sẵn sàng tại **http://localhost:8000**.

### 4.2 Chạy frontend (FE)

Trong cửa sổ PowerShell thứ hai (vẫn bắt đầu ở thư mục gốc dự án):

```powershell
Set-Location frontend
if (-not (Test-Path .env.local)) { Copy-Item .env.example .env.local }
npm ci
npm run dev -- --host 127.0.0.1 --port 5173
```

Giữ cửa sổ này mở. Mở **http://localhost:5173** để sử dụng FE. FE lấy địa chỉ backend từ `frontend/.env.local`; cấu hình mặc định là `http://localhost:8000/api` với phiên bản API `v1`.

## 5. Database và dữ liệu local

- Dự án dùng **SQLite**, không cần cài MySQL hay chạy database server.
- File database local là `backend/database/database.sqlite`; script hoặc lệnh ở trên sẽ tạo file này.
- `php artisan migrate` tạo/cập nhật các bảng từ migration. Khi có migration mới sau khi cập nhật code, chạy lại lệnh này trong thư mục `backend`.
- File `.env`, `.env.local` và database local không nên commit lên Git.

## 6. Cấu hình tùy chọn

Các luồng cơ bản chạy local không cần cấu hình Google OAuth hoặc Gemini. Muốn dùng các tích hợp này, bổ sung credentials riêng vào `backend/.env`:

- Đăng nhập Google: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`.
- Tính năng AI: `GEMINI_API_KEY`.

Không chia sẻ hoặc commit các giá trị bí mật này. Nếu dự án có cấu hình dùng chung, xin credentials từ người quản lý môi trường.

## 7. Một số lỗi thường gặp

- **`php` hoặc `composer` không được nhận diện:** cài PHP/Composer, thêm vào `PATH`, rồi mở lại PowerShell.
- **Thiếu `pdo_sqlite`:** bật extension `pdo_sqlite` trong `php.ini`, mở lại PowerShell và chạy `php -m | Select-String pdo_sqlite` để kiểm tra.
- **Không kết nối được API:** xác nhận cửa sổ BE vẫn chạy, sau đó kiểm tra `VITE_API_URL` trong `frontend/.env.local` là `http://localhost:8000/api`.
- **Cổng 8000 hoặc 5173 đang được dùng:** dừng tiến trình khác đang dùng cổng đó rồi chạy lại; với cách thủ công có thể đổi số cổng trong lệnh `artisan serve` hoặc `npm run dev`.
- **Thay đổi migration nhưng database chưa cập nhật:** tại `backend`, chạy `php artisan migrate`.
- **Google đăng nhập hoặc AI báo thiếu cấu hình:** kiểm tra các credentials tùy chọn ở mục 6; đây không phải điều kiện để khởi động FE/BE.
