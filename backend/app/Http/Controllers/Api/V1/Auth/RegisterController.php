<?php

namespace App\Http\Controllers\Api\V1\Auth;

use App\Http\Controllers\Concerns\HandlesAuthentication;
use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\RegisterRequest;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Throwable;

class RegisterController extends Controller
{
    use HandlesAuthentication;

    /**
     * Register a new account for a first-party or token client.
     */
    public function __invoke(RegisterRequest $request): JsonResponse
    {
        $validated = $request->validated();
        $deviceName = $validated['device_name'] ?? null;
        unset($validated['device_name']);

        $user = DB::transaction(function () use ($validated): User {
            $user = User::create($validated);
            $user->assignDefaultRole();

            return $user;
        });

        try {
            $user->sendEmailVerificationNotification();
        } catch (Throwable $exception) {
            // The account exists, so a mail outage must not fail the request;
            // the user can request a new link after signing in.
            report($exception);
        }

        return $this->authenticatedResponse(
            $request,
            $user,
            is_string($deviceName) ? $deviceName : null,
            201,
        );
    }
}
