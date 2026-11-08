<?php

namespace App\Jobs;

use App\Ai\Agents\PresentationEvaluator;
use App\Data\Ai\PresentationFeedbackData;
use App\Models\PresentationSession;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Laravel\Ai\Exceptions\RateLimitedException;
use Laravel\Ai\Files\LocalAudio;
use Throwable;

class EvaluatePresentationJob implements ShouldQueue
{
    use Queueable;

    /**
     * The number of times the job may be attempted.
     *
     * @var int
     */
    public int $tries = 3;

    /**
     * The number of seconds to wait before retrying the job.
     *
     * @var list<int>|int
     */
    public array|int $backoff = [30, 60, 120];

    /**
     * The number of seconds the job can run before timing out.
     *
     * @var int
     */
    public int $timeout = 200;

    /**
     * Create a new job instance.
     */
    public function __construct(
        public PresentationSession $session
    ) {
        $this->onQueue('presentations');
    }

    /**
     * Execute the job.
     */
    public function handle(): void
    {
        $session = $this->session->fresh();

        if (! $session || $session->status === 'completed') {
            return;
        }

        $session->update([
            'status' => 'processing',
            'started_processing_at' => now(),
            'error_message' => null,
        ]);

        $agent = new PresentationEvaluator(
            slideContent: (string) ($session->slide_content ?? ''),
            duration: $this->formatDuration((int) $session->duration_seconds),
            eyeContactPercent: (int) $session->eye_contact_percent,
            postureScore: (int) $session->posture_score,
            language: (string) ($session->language ?? 'vi'),
            transcript: $session->transcript,
            wordsPerMinute: $session->words_per_minute,
            fillersCount: $session->fillers_count,
        );

        $attachments = [];
        if ($session->audio_path && Storage::disk('local')->exists($session->audio_path)) {
            $fullAudioPath = Storage::disk('local')->path($session->audio_path);
            $rawMime = mime_content_type($fullAudioPath) ?: 'audio/webm';
            $cleanMime = strtok($rawMime, ';') ?: 'audio/webm';
            // Gemini requires audio/* for audio attachments; system mime_content_type can detect webm as video/webm
            if (str_starts_with($cleanMime, 'video/')) {
                $cleanMime = 'audio/' . substr($cleanMime, 6);
            } elseif (! str_starts_with($cleanMime, 'audio/')) {
                $cleanMime = 'audio/webm';
            }
            $attachments[] = new LocalAudio($fullAudioPath, $cleanMime);
        }

        try {
            $prompt = $this->buildPrompt($agent);
            $response = $agent->prompt($prompt, attachments: $attachments);
            $structured = $response->structured;
            $feedback = PresentationFeedbackData::fromStructured($structured);

            $session->update([
                'status' => 'completed',
                'overall_score' => $feedback->overall_score,
                'words_per_minute' => $feedback->words_per_minute,
                'fillers_count' => $feedback->fillers_count,
                'slide_coverage_score' => $feedback->slide_coverage_score,
                'is_reading_slides' => $feedback->is_reading_slides,
                'elaboration_quality' => $feedback->elaboration_quality,
                'voice_feedback' => $feedback->voice_feedback,
                'body_language_feedback' => $feedback->body_language_feedback,
                'transcript' => $feedback->transcript ?: $session->transcript,
                'strengths' => $feedback->strengths,
                'improvements' => $feedback->improvements,
                'actionable_tips' => $feedback->actionable_tips,
                'error_message' => null,
            ]);
        } catch (Throwable $e) {
            report($e);
            Log::error("EvaluatePresentationJob failed for session {$session->id}: {$e->getMessage()}");

            if ($e instanceof RateLimitedException) {
                // Release back to queue after 60 seconds
                $this->release(60);
                return;
            }

            if ($this->attempts() >= $this->tries) {
                $session->update([
                    'status' => 'failed',
                    'error_message' => 'Trợ lý AI tạm thời không thể hoàn tất bài đánh giá. Vui lòng bấm chấm lại.',
                ]);
            }

            throw $e;
        }
    }

    /**
     * Handle a job failure.
     */
    public function failed(?Throwable $exception): void
    {
        $this->session->fresh()?->update([
            'status' => 'failed',
            'error_message' => 'Đánh giá thuyết trình thất bại sau nhiều lần thử. Vui lòng thử lại sau.',
        ]);
    }

    /**
     * Format duration seconds to MM:SS label.
     */
    private function formatDuration(int $totalSeconds): string
    {
        $minutes = str_pad((string) floor($totalSeconds / 60), 2, '0', STR_PAD_LEFT);
        $seconds = str_pad((string) ($totalSeconds % 60), 2, '0', STR_PAD_LEFT);

        return "{$minutes}:{$seconds}";
    }

    /**
     * Build the prompt for the presentation evaluator agent.
     */
    private function buildPrompt(PresentationEvaluator $agent): string
    {
        $langLabel = $agent->language === 'en' ? 'Tiếng Anh (English)' : 'Tiếng Việt';
        $promptParts = [
            "THÔNG SỐ PHIÊN THUYẾT TRÌNH:\n- Ngôn ngữ trình bày: {$langLabel}\n- Thời lượng: {$agent->duration}\n- Tỉ lệ giao tiếp mắt: {$agent->eyeContactPercent}%\n- Điểm tư thế: {$agent->postureScore}/100",
            "NỘI DUNG TRÊN CÁC TRANG SLIDE:\n<<<\n{$agent->slideContent}\n>>>",
        ];

        if ($agent->wordsPerMinute !== null && $agent->wordsPerMinute > 0) {
            $promptParts[0] .= "\n- Tốc độ nói ước tính (client): {$agent->wordsPerMinute} từ/phút";
        }

        if ($agent->fillersCount !== null && $agent->fillersCount > 0) {
            $promptParts[0] .= "\n- Số từ đệm ước tính (client): {$agent->fillersCount}";
        }

        if (! empty($agent->transcript)) {
            $promptParts[] = "TRANSCRIPT THAM KHẢO TỪ CLIENT:\n<<<\n{$agent->transcript}\n>>>";
        }

        return implode("\n\n", $promptParts);
    }
}
