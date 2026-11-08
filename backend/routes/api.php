<?php

use App\Http\Controllers\Api\V1\Ai\ChatController;
use App\Http\Controllers\Api\V1\Ai\ConversationIndexController;
use App\Http\Controllers\Api\V1\Ai\ConversationMessagesController;
use App\Http\Controllers\Api\V1\Ai\FeedbackController;
use App\Http\Controllers\Api\V1\Ai\PresentationEvaluationController;
use App\Http\Controllers\Api\V1\Presentation\PresentationSessionController;
use App\Http\Controllers\Api\V1\Auth\ForgotPasswordController;
use App\Http\Controllers\Api\V1\Auth\LoginController;
use App\Http\Controllers\Api\V1\Auth\LogoutController;
use App\Http\Controllers\Api\V1\Auth\MeController;
use App\Http\Controllers\Api\V1\Auth\RefreshTokenController;
use App\Http\Controllers\Api\V1\Auth\RegisterController;
use App\Http\Controllers\Api\V1\Auth\ResetPasswordController;
use App\Http\Controllers\Api\V1\Auth\SendEmailVerificationController;
use App\Http\Controllers\Api\V1\Auth\SocialiteCallbackController;
use App\Http\Controllers\Api\V1\Auth\SocialiteExchangeController;
use App\Http\Controllers\Api\V1\Auth\SocialiteRedirectController;
use App\Http\Controllers\Api\V1\Auth\VerifyEmailController;
use App\Http\Middleware\EnsureAiConfigured;
use Illuminate\Support\Facades\Route;

Route::get('/health', fn () => response()->json([
    'status' => 'ok',
    'app' => config('app.name'),
    'time' => now()->toIso8601String(),
]));

Route::prefix('v1/auth')->group(function (): void {
    Route::post('/register', RegisterController::class)
        ->middleware('throttle:register')
        ->name('api.v1.auth.register');

    Route::post('/login', LoginController::class)
        ->middleware('throttle:login')
        ->name('api.v1.auth.login');

    Route::post('/refresh', RefreshTokenController::class)
        ->middleware('throttle:refresh')
        ->name('api.v1.auth.refresh');

    Route::post('/forgot-password', ForgotPasswordController::class)
        ->middleware('throttle:forgot-password')
        ->name('api.v1.auth.password.email');

    Route::post('/reset-password', ResetPasswordController::class)
        ->middleware('throttle:reset-password')
        ->name('api.v1.auth.password.store');

    Route::get('/email/verify/{id}/{hash}', VerifyEmailController::class)
        ->middleware(['signed', 'throttle:verification'])
        ->name('verification.verify');

    Route::post('/email/verification-notification', SendEmailVerificationController::class)
        ->middleware(['auth:sanctum', 'throttle:verification-resend'])
        ->name('api.v1.auth.verification.send');

    Route::get('/social/google/redirect', SocialiteRedirectController::class)
        ->middleware('throttle:social')
        ->name('api.v1.auth.social.redirect');

    Route::get('/social/google/callback', SocialiteCallbackController::class)
        ->middleware('throttle:social')
        ->name('api.v1.auth.social.callback');

    Route::post('/social/exchange', SocialiteExchangeController::class)
        ->middleware('throttle:social')
        ->name('api.v1.auth.social.exchange');

    Route::post('/logout', LogoutController::class)
        ->middleware('throttle:api')
        ->name('api.v1.auth.logout');

    Route::middleware('auth:sanctum')->group(function (): void {
        Route::get('/me', MeController::class)->name('api.v1.auth.me');
    });
});

Route::prefix('v1/ai')->middleware(['auth:sanctum', EnsureAiConfigured::class])->group(function (): void {
    Route::post('/chat', ChatController::class)
        ->middleware('throttle:ai-chat')
        ->name('api.v1.ai.chat');

    Route::post('/feedback', FeedbackController::class)
        ->middleware('throttle:ai-feedback')
        ->name('api.v1.ai.feedback');

    Route::post('/presentation/evaluate', PresentationEvaluationController::class)
        ->middleware('throttle:ai-feedback')
        ->name('api.v1.ai.presentation.evaluate');

    Route::get('/conversations', ConversationIndexController::class)
        ->name('api.v1.ai.conversations.index');

    Route::get('/conversations/{conversation}/messages', ConversationMessagesController::class)
        ->name('api.v1.ai.conversations.messages');
});

Route::prefix('v1/presentation')->middleware('auth:sanctum')->group(function (): void {
    Route::get('/sessions', [PresentationSessionController::class, 'index'])
        ->name('api.v1.presentation.sessions.index');

    Route::get('/sessions/{id}', [PresentationSessionController::class, 'show'])
        ->name('api.v1.presentation.sessions.show');

    Route::post('/sessions/{id}/retry', [PresentationSessionController::class, 'retry'])
        ->name('api.v1.presentation.sessions.retry');

    Route::get('/sessions/{id}/audio', [PresentationSessionController::class, 'streamAudio'])
        ->name('api.v1.presentation.sessions.audio');

    Route::delete('/sessions/{id}', [PresentationSessionController::class, 'destroy'])
        ->name('api.v1.presentation.sessions.destroy');
});
