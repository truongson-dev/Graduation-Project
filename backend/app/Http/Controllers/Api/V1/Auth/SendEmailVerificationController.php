<?php

namespace App\Http\Controllers\Api\V1\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SendEmailVerificationController extends Controller
{
    /**
     * Send another e-mail verification link to an unverified user.
     */
    public function __invoke(Request $request): JsonResponse
    {
        $user = $request->user();

        abort_unless($user instanceof User, 401);

        if ($user->hasVerifiedEmail()) {
            return response()->json(['message' => 'Email đã được xác minh.']);
        }

        $user->sendEmailVerificationNotification();

        return response()->json(['message' => 'Đã gửi lại liên kết xác minh email.'], 202);
    }
}
