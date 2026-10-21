<?php

namespace App\Http\Controllers\Api\V1\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\ForgotPasswordRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Password;

class ForgotPasswordController extends Controller
{
    /**
     * Send a password reset link without revealing whether the account exists.
     */
    public function __invoke(ForgotPasswordRequest $request): JsonResponse
    {
        $validated = $request->validated();

        Password::sendResetLink(['email' => $validated['email']]);

        return response()->json([
            'message' => 'Nếu email này tồn tại, chúng tôi đã gửi liên kết đặt lại mật khẩu.',
        ], 202);
    }
}
