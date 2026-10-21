<?php

use App\Http\Controllers\Api\V1\Auth\ForgotPasswordController;
use App\Http\Controllers\Api\V1\Auth\LoginController;
use App\Http\Controllers\Api\V1\Auth\LogoutController;
use App\Http\Controllers\Api\V1\Auth\MeController;
use App\Http\Controllers\Api\V1\Auth\RegisterController;
use App\Http\Controllers\Api\V1\Auth\ResetPasswordController;
use App\Http\Controllers\Api\V1\Auth\SendEmailVerificationController;
use App\Http\Controllers\Api\V1\Auth\SocialiteCallbackController;
use App\Http\Controllers\Api\V1\Auth\SocialiteRedirectController;
use App\Http\Controllers\Api\V1\Auth\VerifyEmailController;
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

    Route::middleware('auth:sanctum')->group(function (): void {
        Route::get('/me', MeController::class)->name('api.v1.auth.me');
        Route::post('/logout', LogoutController::class)->name('api.v1.auth.logout');
    });
});
