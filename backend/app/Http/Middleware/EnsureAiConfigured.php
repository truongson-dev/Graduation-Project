<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureAiConfigured
{
    /**
     * Reject AI requests when the upstream provider is not configured.
     *
     * @param  Closure(Request): Response  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        if (blank(config('ai.providers.gemini.key'))) {
            return response()->json([
                'message' => 'Trợ lý AI chưa được cấu hình. Vui lòng liên hệ quản trị viên.',
            ], 503);
        }

        return $next($request);
    }
}
