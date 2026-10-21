<?php

namespace App\Http\Controllers\Api\V1\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Auth\Events\Verified;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class VerifyEmailController extends Controller
{
    /**
     * Verify the e-mail address behind a signed link.
     */
    public function __invoke(Request $request, string $id, string $hash): JsonResponse|RedirectResponse
    {
        $user = User::query()->findOrFail($id);

        abort_unless(hash_equals(sha1($user->getEmailForVerification()), $hash), 403);

        if (! $user->hasVerifiedEmail()) {
            $user->markEmailAsVerified();

            event(new Verified($user));
        }

        if ($request->expectsJson()) {
            return response()->json(['message' => 'Email đã được xác minh.']);
        }

        return redirect()->away(rtrim((string) config('app.frontend_url'), '/').'/login?verified=1');
    }
}
