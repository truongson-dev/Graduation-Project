<?php
/**
 * SoftSkill AI - Cron Web Worker
 * Chạy Queue và Scheduler của Laravel thông qua HTTP Request (Web Context)
 * Giải quyết triệt để 100% các vấn đề socket/CLI trên hosting cPanel.
 */

// Khóa bí mật bảo vệ (đổi nếu cần)
$SECRET_KEY = 'softskill_cron_2026';

if (!isset($_GET['key']) || $_GET['key'] !== $SECRET_KEY) {
    http_response_code(403);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['error' => 'Forbidden: Invalid secret key']);
    exit;
}

// Tăng thời gian thực thi để đủ thời gian gọi AI chấm bài
@ini_set('memory_limit', '512M');
@set_time_limit(300);
ignore_user_abort(true);

define('LARAVEL_START', microtime(true));

$backendPath = dirname(__DIR__); // Thư mục backend

if (!file_exists($backendPath . '/vendor/autoload.php')) {
    http_response_code(500);
    exit('Khong tim thay vendor/autoload.php');
}

require $backendPath . '/vendor/autoload.php';
$app = require_once $backendPath . '/bootstrap/app.php';

use Illuminate\Contracts\Console\Kernel;
use Symfony\Component\Console\Output\BufferedOutput;

$kernel = $app->make(Kernel::class);

$results = [
    'time' => date('Y-m-d H:i:s'),
    'queue' => '',
    'schedule' => '',
];

try {
    // 1. Chạy Queue Worker: lấy bài thuyết trình đang chờ để AI chấm điểm (hàng đợi: presentations)
    $queueOutput = new BufferedOutput();
    $kernel->call('queue:work', [
        '--queue' => 'presentations,default',
        '--stop-when-empty' => true,
        '--timeout' => 200,
        '--tries' => 3,
    ], $queueOutput);
    $results['queue'] = trim($queueOutput->fetch()) ?: 'Không có job nào đang chờ trong hàng đợi.';

    // 2. Chạy Scheduler định kỳ của Laravel
    $schedOutput = new BufferedOutput();
    $kernel->call('schedule:run', [], $schedOutput);
    $results['schedule'] = trim($schedOutput->fetch()) ?: 'Không có tác vụ định kỳ cần chạy.';

    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['status' => 'success', 'data' => $results], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
} catch (\Throwable $e) {
    http_response_code(500);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode([
        'status' => 'error',
        'message' => $e->getMessage(),
        'file' => $e->getFile() . ':' . $e->getLine(),
    ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
}
