<?php

namespace App\Providers;

use App\Policies\ConversationPolicy;
use Dedoc\Scramble\Scramble;
use Dedoc\Scramble\SecurityDocumentation\MiddlewareAuthSecurityStrategy;
use Dedoc\Scramble\Support\Generator\SecurityScheme;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Str;
use Illuminate\Validation\Rules\Password;
use Laravel\Ai\Models\Conversation;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        $this->configureStrictMode();
        $this->configureRateLimiting();
        $this->configurePasswordRules();
        $this->configureApiDocumentation();

        Gate::policy(Conversation::class, ConversationPolicy::class);
    }

    /**
     * Fail loudly on lazy loading and silently discarded attributes outside production.
     */
    private function configureStrictMode(): void
    {
        Model::shouldBeStrict(! $this->app->isProduction());
        DB::prohibitDestructiveCommands($this->app->isProduction());

        if ($this->app->runningUnitTests()) {
            Http::preventStrayRequests();
        }
    }

    /**
     * Register the named rate limiters used by the API routes.
     */
    private function configureRateLimiting(): void
    {
        RateLimiter::for('api', fn (Request $request): Limit => Limit::perMinute(60)
            ->by($request->ip() ?? 'unknown'));

        RateLimiter::for('register', fn (Request $request): Limit => Limit::perMinute(10)
            ->by($request->ip() ?? 'unknown'));

        RateLimiter::for('login', fn (Request $request): Limit => Limit::perMinute(30)
            ->by($request->ip() ?? 'unknown'));

        RateLimiter::for('forgot-password', fn (Request $request): Limit => Limit::perMinute(3)
            ->by($this->emailRateLimitKey($request)));

        RateLimiter::for('reset-password', fn (Request $request): Limit => Limit::perMinute(5)
            ->by($request->ip() ?? 'unknown'));

        RateLimiter::for('verification', fn (Request $request): Limit => Limit::perMinute(6)
            ->by($request->ip() ?? 'unknown'));

        RateLimiter::for('verification-resend', fn (Request $request): Limit => Limit::perMinute(3)
            ->by($request->user()?->getAuthIdentifier() ?? $request->ip() ?? 'unknown'));

        RateLimiter::for('social', fn (Request $request): Limit => Limit::perMinute(10)
            ->by($request->ip() ?? 'unknown'));
        RateLimiter::for('ai-chat', fn (Request $request): array => [
            Limit::perMinute(10)->by($this->aiRateLimitKey($request)),
            Limit::perDay(100)->by($this->aiRateLimitKey($request)),
        ]);
        RateLimiter::for('ai-feedback', fn (Request $request): array => [
            Limit::perMinute(5)->by($this->aiRateLimitKey($request)),
            Limit::perDay(50)->by($this->aiRateLimitKey($request)),
        ]);
    }

    /**
     * Configure the default password rules for the application.
     */
    private function configurePasswordRules(): void
    {
        Password::defaults(fn (): Password => Password::min(8)->max(72)
            ->letters()
            ->mixedCase()
            ->numbers()
            ->rules('regex:/[\p{S}\p{P}]/u'));
    }

    /**
     * Register the bearer security scheme used by the generated OpenAPI document.
     *
     * The scheme is an object, so it cannot live in config/scramble.php: the configuration array
     * must stay serializable for `php artisan config:cache` to work in production. It is applied
     * at runtime here instead.
     */
    private function configureApiDocumentation(): void
    {
        Scramble::configure()->useConfig([
            ...(array) config('scramble', []),
            'security_strategy' => [
                MiddlewareAuthSecurityStrategy::class,
                [
                    'middleware' => ['auth', 'auth:*'],
                    'scheme' => SecurityScheme::http('bearer')->as('bearerAuth'),
                ],
            ],
        ]);
    }

    /**
     * Build the rate limit key for AI endpoints from the authenticated user.
     */
    private function aiRateLimitKey(Request $request): string
    {
        return (string) ($request->user()?->getAuthIdentifier() ?? $request->ip() ?? 'unknown');
    }

    /**
     * Build the rate limit key from the e-mail address and the client IP.
     */
    private function emailRateLimitKey(Request $request): string
    {
        $email = $request->input('email');

        return (is_string($email) ? Str::lower(trim($email)) : 'invalid').'|'.($request->ip() ?? 'unknown');
    }
}
