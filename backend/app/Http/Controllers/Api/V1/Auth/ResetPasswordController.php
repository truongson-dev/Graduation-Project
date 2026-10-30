<?php

namespace App\Http\Controllers\Api\V1\Auth;

use App\Auth\AuthTokenService;
use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\ResetPasswordRequest;
use App\Models\User;
use Illuminate\Auth\Events\PasswordReset;
use Illuminate\Contracts\Auth\CanResetPassword as CanResetPasswordContract;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class ResetPasswordController extends Controller
{
    /**
     * Reset the password, revoke tokens and forget the active sessions.
     */
    public function __invoke(ResetPasswordRequest $request, AuthTokenService $tokens): JsonResponse
    {
        $status = Password::reset(
            $request->only('email', 'password', 'password_confirmation', 'token'),
            function (CanResetPasswordContract $user, string $password) use ($tokens): void {
                if (! $user instanceof User) {
                    return;
                }

                $user->forceFill([
                    'password' => $password,
                    'remember_token' => Str::random(60),
                ])->save();

                $tokens->revokeAllForUser($user);
                $loginKey = hash('sha256', $user->email);
                Cache::forget('auth:login:locked:'.$loginKey);
                Cache::forget('auth:login:attempts:'.$loginKey);
                $this->forgetSessions($user);

                event(new PasswordReset($user));
            },
        );

        if ($status !== Password::PASSWORD_RESET) {
            throw ValidationException::withMessages([
                'email' => 'Liên kết đặt lại mật khẩu không hợp lệ hoặc đã hết hạn.',
            ]);
        }

        return response()->json([
            'message' => 'Mật khẩu đã được cập nhật. Vui lòng đăng nhập lại.',
        ]);
    }

    /**
     * Delete the database sessions of the given user, when sessions are stored in the database.
     */
    private function forgetSessions(User $user): void
    {
        $table = config('session.table', 'sessions');

        if (is_string($table) && Schema::hasTable($table)) {
            DB::table($table)->where('user_id', $user->getKey())->delete();
        }
    }
}
