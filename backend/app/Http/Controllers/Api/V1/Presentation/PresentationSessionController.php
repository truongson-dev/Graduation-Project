<?php

namespace App\Http\Controllers\Api\V1\Presentation;

use App\Http\Controllers\Controller;
use App\Jobs\EvaluatePresentationJob;
use App\Models\PresentationSession;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class PresentationSessionController extends Controller
{
    /**
     * List all presentation sessions belonging to the authenticated user.
     */
    public function index(Request $request): JsonResponse
    {
        $sessions = $request->user()
            ->presentationSessions()
            ->latest('created_at')
            ->paginate($request->integer('per_page', 15));

        return response()->json($sessions);
    }

    /**
     * Show details of a specific presentation session.
     */
    public function show(Request $request, string $id): JsonResponse
    {
        $session = $request->user()
            ->presentationSessions()
            ->findOrFail($id);

        return response()->json([
            'data' => $session,
        ]);
    }

    /**
     * Retry an evaluation job for a failed session.
     */
    public function retry(Request $request, string $id): JsonResponse
    {
        $session = $request->user()
            ->presentationSessions()
            ->findOrFail($id);

        $session->update([
            'status' => 'processing',
            'started_processing_at' => now(),
            'error_message' => null,
        ]);

        EvaluatePresentationJob::dispatch($session);

        return response()->json([
            'message' => 'Đã gửi lại bài thuyết trình vào hàng đợi chấm điểm AI.',
            'data' => $session,
        ], 202);
    }

    /**
     * Safely stream the recorded audio file to the owner.
     */
    public function streamAudio(Request $request, string $id): BinaryFileResponse
    {
        $session = $request->user()
            ->presentationSessions()
            ->findOrFail($id);

        if (! $session->audio_path || ! Storage::disk('local')->exists($session->audio_path)) {
            abort(404, 'Tệp ghi âm không tồn tại.');
        }

        $fullPath = Storage::disk('local')->path($session->audio_path);
        $mime = mime_content_type($fullPath) ?: 'audio/webm';

        return response()->file($fullPath, [
            'Content-Type' => $mime,
            'Accept-Ranges' => 'bytes',
        ]);
    }

    /**
     * Delete a presentation session and its audio file.
     */
    public function destroy(Request $request, string $id): JsonResponse
    {
        $session = $request->user()
            ->presentationSessions()
            ->findOrFail($id);

        if ($session->audio_path && Storage::disk('local')->exists($session->audio_path)) {
            Storage::disk('local')->delete($session->audio_path);
        }

        $session->delete();

        return response()->json([
            'message' => 'Đã xóa bài thuyết trình thành công.',
        ]);
    }
}
