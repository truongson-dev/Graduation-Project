<?php

namespace App\Console\Commands;

use App\Models\PresentationSession;
use Illuminate\Console\Command;

class CheckStuckPresentationsCommand extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'presentation:check-stuck {--minutes=10 : Số phút chờ trước khi coi là kẹt}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Quét và đánh dấu thất bại cho các phiên thuyết trình bị kẹt hàng đợi quá thời gian';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $minutes = (int) $this->option('minutes');
        $threshold = now()->subMinutes($minutes);

        $stuckSessions = PresentationSession::where('status', 'processing')
            ->where(function ($query) use ($threshold) {
                $query->where('started_processing_at', '<', $threshold)
                    ->orWhere(function ($q) use ($threshold) {
                        $q->whereNull('started_processing_at')
                            ->where('created_at', '<', $threshold);
                    });
            })
            ->get();

        if ($stuckSessions->isEmpty()) {
            $this->info('Không có phiên thuyết trình nào bị kẹt.');
            return self::SUCCESS;
        }

        $count = $stuckSessions->count();
        foreach ($stuckSessions as $session) {
            $session->update([
                'status' => 'failed',
                'error_message' => 'Quá thời gian xử lý AI (hơn '.$minutes.' phút). Vui lòng bấm chấm lại.',
            ]);
        }

        $this->warn("Đã giải phóng {$count} phiên thuyết trình bị kẹt chuyển sang trạng thái failed.");

        return self::SUCCESS;
    }
}
