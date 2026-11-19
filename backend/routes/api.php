<?php

use App\Http\Controllers\Api\V1\Ai\ChatController;
use App\Http\Controllers\Api\V1\Ai\ConversationIndexController;
use App\Http\Controllers\Api\V1\Ai\ConversationMessagesController;
use App\Http\Controllers\Api\V1\Ai\FeedbackController;
use App\Http\Controllers\Api\V1\Ai\PresentationEvaluationController;
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
use App\Http\Controllers\Api\V1\Admin\AdminDashboardController;
use App\Http\Controllers\Api\V1\Admin\AdminLearningPathController;
use App\Http\Controllers\Api\V1\Admin\AdminUserController;
use App\Http\Controllers\Api\V1\Community\CommunityFeedController;
use App\Http\Controllers\Api\V1\Community\CommunityInteractionController;
use App\Http\Controllers\Api\V1\Community\CommunityPostController;
use App\Http\Controllers\Api\V1\Learning\GamificationController;
use App\Http\Controllers\Api\V1\Learning\LeaderboardController;
use App\Http\Controllers\Api\V1\Learning\LearningPathController;
use App\Http\Controllers\Api\V1\Learning\LessonAttemptController;
use App\Http\Controllers\Api\V1\Learning\LessonController;
use App\Http\Controllers\Api\V1\Learning\ProgressController;
use App\Http\Controllers\Api\V1\Learning\SectionController;
use App\Http\Controllers\Api\V1\Learning\StreakController;
use App\Http\Controllers\Api\V1\Presentation\PresentationSessionController;
use App\Http\Controllers\Api\V1\Profile\ProfileController;
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

Route::get('v1/learning-paths', \App\Http\Controllers\Api\V1\LearningPathController::class)
    ->name('api.v1.learning-paths.index');

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

Route::prefix('v1/admin')->middleware(['auth:sanctum', 'role:admin'])->group(function (): void {
    Route::get('/dashboard', AdminDashboardController::class)->name('api.v1.admin.dashboard');
    Route::get('/learning-paths', [AdminLearningPathController::class, 'index'])->name('api.v1.admin.learning-paths.index');
    Route::patch('/learning-paths/{learningPath}', [AdminLearningPathController::class, 'update'])->name('api.v1.admin.learning-paths.update');
    Route::get('/users', [AdminUserController::class, 'index'])->name('api.v1.admin.users.index');
    Route::get('/users/{user}', [AdminUserController::class, 'show'])->name('api.v1.admin.users.show');
    Route::patch('/users/{user}/status', [AdminUserController::class, 'updateStatus'])->name('api.v1.admin.users.status');
});

Route::prefix('v1/community')->middleware('auth:sanctum')->group(function (): void {
    Route::get('/feed', [CommunityFeedController::class, 'index'])
        ->middleware('throttle:community-read')
        ->name('api.v1.community.feed');

    Route::get('/topics', [CommunityFeedController::class, 'topics'])
        ->middleware('throttle:community-read')
        ->name('api.v1.community.topics');

    Route::get('/trending', [CommunityFeedController::class, 'trending'])
        ->middleware('throttle:community-read')
        ->name('api.v1.community.trending');

    Route::get('/search', [CommunityFeedController::class, 'search'])
        ->middleware('throttle:community-search')
        ->name('api.v1.community.search');

    Route::post('/posts', [CommunityPostController::class, 'store'])
        ->middleware('throttle:community-post')
        ->name('api.v1.community.posts.store');

    Route::get('/posts/{post}', [CommunityPostController::class, 'show'])
        ->middleware('throttle:community-read')
        ->name('api.v1.community.posts.show');

    Route::get('/posts/{post}/replies', [CommunityPostController::class, 'replies'])
        ->middleware('throttle:community-read')
        ->name('api.v1.community.posts.replies');

    Route::post('/posts/{post}/replies', [CommunityPostController::class, 'storeReply'])
        ->middleware('throttle:community-reply')
        ->name('api.v1.community.posts.replies.store');

    Route::delete('/posts/{post}', [CommunityPostController::class, 'destroy'])
        ->name('api.v1.community.posts.destroy');

    Route::patch('/posts/{post}/hide-reply', [CommunityPostController::class, 'hideReply'])
        ->name('api.v1.community.posts.hide-reply');

    Route::post('/posts/{post}/reactions', [CommunityInteractionController::class, 'toggleReaction'])
        ->middleware('throttle:community-react')
        ->name('api.v1.community.posts.reactions');

    Route::post('/posts/{post}/repost', [CommunityInteractionController::class, 'toggleRepost'])
        ->middleware('throttle:community-react')
        ->name('api.v1.community.posts.repost');

    Route::post('/polls/{poll}/vote', [CommunityInteractionController::class, 'votePoll'])
        ->middleware('throttle:community-react')
        ->name('api.v1.community.polls.vote');

    Route::post('/users/{user}/follow', [CommunityInteractionController::class, 'toggleFollow'])
        ->middleware('throttle:community-react')
        ->name('api.v1.community.users.follow');
});

Route::prefix('v1/profile')->middleware('auth:sanctum')->group(function (): void {
    Route::get('/me', [ProfileController::class, 'me'])->name('api.v1.profile.me');
    Route::put('/', [ProfileController::class, 'update'])->name('api.v1.profile.update');
    Route::post('/avatar', [ProfileController::class, 'uploadAvatar'])->name('api.v1.profile.avatar.upload');
    Route::delete('/avatar', [ProfileController::class, 'deleteAvatar'])->name('api.v1.profile.avatar.delete');
    Route::put('/password', [ProfileController::class, 'updatePassword'])->name('api.v1.profile.password.update');
    Route::get('/{id}', [ProfileController::class, 'show'])->whereNumber('id')->name('api.v1.profile.show');
});

Route::prefix('v1/learning')->middleware('auth:sanctum')->group(function (): void {
    // Content & progress
    Route::get('/paths', [LearningPathController::class, 'index'])->name('api.v1.learning.paths.index');
    Route::get('/paths/{slug}', [LearningPathController::class, 'show'])->name('api.v1.learning.paths.show');
    Route::get('/sections/{id}', [SectionController::class, 'show'])->whereNumber('id')->name('api.v1.learning.sections.show');
    Route::get('/lessons/{id}', [LessonController::class, 'show'])->whereNumber('id')->name('api.v1.learning.lessons.show');
    Route::get('/lessons/{id}/attempts', [LessonAttemptController::class, 'index'])->whereNumber('id')->name('api.v1.learning.lessons.attempts');
    Route::get('/progress', [ProgressController::class, 'index'])->name('api.v1.learning.progress');

    // Attempt submission
    Route::post('/lessons/{id}/attempt', [LessonAttemptController::class, 'store'])->whereNumber('id')->name('api.v1.learning.lessons.attempt');

    // Gamification & streaks
    Route::get('/gamification', [GamificationController::class, 'show'])->name('api.v1.learning.gamification');
    Route::post('/lives/consume', [GamificationController::class, 'consumeLife'])->name('api.v1.learning.lives.consume');
    Route::get('/leaderboard', [LeaderboardController::class, 'index'])->name('api.v1.learning.leaderboard');
    Route::get('/streak', [StreakController::class, 'show'])->name('api.v1.learning.streak');
});
