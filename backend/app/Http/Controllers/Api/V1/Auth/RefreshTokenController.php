<?php

namespace App\Http\Controllers\Api\V1\Auth;

use App\Auth\AuthTokenService;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class RefreshTokenController extends Controller
{
    /**
     * Rotate a refresh token and return a new access/refresh token pair.
     */
    public function __invoke(Request $request, AuthTokenService $tokens): JsonResponse
    {
        $validated = $request->validate([
            'refresh_token' => ['required', 'string', 'min:40', 'max:255'],
        ]);

        $pair = $tokens->rotate($validated['refresh_token']);

        if ($pair === null) {
            return response()->json([
                'message' => 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.',
            ], 401);
        }

        return response()->json(['data' => $pair->toArray()]);
    }
}
