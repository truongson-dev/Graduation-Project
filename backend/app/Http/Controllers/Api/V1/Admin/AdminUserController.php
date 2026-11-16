<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\UpdateUserStatusRequest;
use App\Http\Resources\AdminUserResource;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminUserController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $search = $request->string('search')->trim()->value();
        $status = $request->string('status')->trim()->value();

        $users = User::query()
            ->with('roles:id,name')
            ->when($search, fn ($query) => $query->where(fn ($q) => $q->where('name', 'like', "%{$search}%")->orWhere('email', 'like', "%{$search}%")))
            ->when($status, fn ($query) => $query->where('status', $status))
            ->latest()
            ->paginate(min($request->integer('per_page', 20), 100));

        return AdminUserResource::collection($users)->response();
    }

    public function show(User $user): AdminUserResource
    {
        return AdminUserResource::make($user->load('roles:id,name'));
    }

    public function updateStatus(UpdateUserStatusRequest $request, User $user): JsonResponse
    {
        if ($request->user()?->is($user) && $request->validated('status') === 'suspended') {
            return response()->json(['message' => 'Bạn không thể tự khóa tài khoản Admin đang đăng nhập.'], 422);
        }

        $user->forceFill(['status' => $request->validated('status')])->save();

        return response()->json([
            'data' => AdminUserResource::make($user),
            'message' => 'Đã cập nhật trạng thái tài khoản.',
        ]);
    }
}
