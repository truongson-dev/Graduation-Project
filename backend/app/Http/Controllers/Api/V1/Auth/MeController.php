<?php

namespace App\Http\Controllers\Api\V1\Auth;

use App\Http\Controllers\Controller;
use App\Http\Resources\UserResource;
use App\Models\User;
use Illuminate\Http\Request;

class MeController extends Controller
{
    /**
     * Return the authenticated user.
     */
    public function __invoke(Request $request): UserResource
    {
        $user = $request->user();

        abort_unless($user instanceof User, 401);

        return UserResource::make($user->loadMissing('roles'));
    }
}
