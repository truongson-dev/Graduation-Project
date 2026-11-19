<?php

namespace App\Http\Controllers\Api\V1\Profile;

use App\Http\Controllers\Controller;
use App\Http\Requests\Profile\UpdatePasswordRequest;
use App\Http\Requests\Profile\UpdateProfileRequest;
use App\Models\CommunityPost;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class ProfileController extends Controller
{
    /**
     * Get the authenticated user's own profile.
     */
    public function me(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        return response()->json($this->buildProfilePayload($user, $user));
    }

    /**
     * Get another user's public profile or own profile by ID.
     */
    public function show(Request $request, int $id): JsonResponse
    {
        $target = User::findOrFail($id);
        /** @var User|null $viewer */
        $viewer = $request->user();

        return response()->json($this->buildProfilePayload($target, $viewer));
    }

    /**
     * Update the authenticated user's profile and community profile.
     */
    public function update(UpdateProfileRequest $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        $userUpdates = ['name' => $request->validated('name')];
        if ($request->hasFile('avatar')) {
            $user->clearMediaCollection('avatar');
            $media = $user->addMediaFromRequest('avatar')->toMediaCollection('avatar');
            $userUpdates['avatar_url'] = $media->getUrl();
        } elseif ($request->has('avatar_url')) {
            $userUpdates['avatar_url'] = $request->validated('avatar_url');
        }
        $user->update($userUpdates);

        $defaultUsername = $request->validated('username') ?? ('user_' . $user->id);
        $communityProfile = $user->communityProfile()->firstOrCreate(
            ['user_id' => $user->id],
            ['username' => $defaultUsername]
        );

        $communityUpdates = [];
        if ($request->has('username')) {
            $communityUpdates['username'] = $request->validated('username');
        }
        if ($request->has('headline')) {
            $communityUpdates['headline'] = $request->validated('headline');
        }
        if ($request->has('bio')) {
            $communityUpdates['bio'] = $request->validated('bio');
        }

        if (! empty($communityUpdates)) {
            $communityProfile->update($communityUpdates);
        }

        $user->refresh();
        $user->load('communityProfile');

        return response()->json($this->buildProfilePayload($user, $user));
    }

    /**
     * Update the authenticated user's password.
     *
     * @throws ValidationException
     */
    public function updatePassword(UpdatePasswordRequest $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        if (! Hash::check($request->validated('current_password'), $user->password)) {
            throw ValidationException::withMessages([
                'current_password' => ['Mật khẩu hiện tại không chính xác.'],
            ]);
        }

        $user->update([
            'password' => Hash::make($request->validated('new_password')),
        ]);

        return response()->json([
            'message' => 'Đổi mật khẩu thành công.',
        ]);
    }

    /**
     * Upload an avatar image for the authenticated user using Spatie MediaLibrary.
     */
    public function uploadAvatar(Request $request): JsonResponse
    {
        $request->validate([
            'avatar' => ['required', 'file', 'image', 'mimes:jpeg,png,jpg,webp,gif', 'max:5120'],
        ], [
            'avatar.required' => 'Vui lòng chọn file ảnh đại diện.',
            'avatar.image' => 'File tải lên phải là hình ảnh hợp lệ.',
            'avatar.mimes' => 'Ảnh đại diện phải có định dạng: jpeg, png, jpg, webp, gif.',
            'avatar.max' => 'Kích thước ảnh đại diện không được vượt quá 5MB.',
        ]);

        /** @var User $user */
        $user = $request->user();

        $user->clearMediaCollection('avatar');
        $media = $user->addMediaFromRequest('avatar')
            ->toMediaCollection('avatar');

        $user->forceFill(['avatar_url' => $media->getUrl()])->save();

        return response()->json([
            'message' => 'Cập nhật ảnh đại diện thành công.',
            'avatar_url' => $media->getUrl(),
            'thumb_url' => $media->hasGeneratedConversion('thumb') ? $media->getUrl('thumb') : $media->getUrl(),
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'avatar_url' => $user->avatar_url,
            ],
        ]);
    }

    /**
     * Remove the authenticated user's uploaded avatar.
     */
    public function deleteAvatar(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        $user->clearMediaCollection('avatar');
        $user->forceFill(['avatar_url' => null])->save();

        return response()->json([
            'message' => 'Đã xóa ảnh đại diện.',
            'avatar_url' => null,
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'avatar_url' => null,
            ],
        ]);
    }

    /**
     * Build aggregated profile payload.
     *
     * @return array<string, mixed>
     */
    private function buildProfilePayload(User $target, ?User $viewer): array
    {
        $isOwnProfile = $viewer !== null && $viewer->id === $target->id;
        $isFollowing = (! $isOwnProfile && $viewer !== null)
            ? $viewer->following()->where('following_id', $target->id)->exists()
            : false;

        $target->loadMissing(['communityProfile']);

        $communityProfile = $target->communityProfile;
        $communityProfileData = $communityProfile ? [
            'username' => $communityProfile->username,
            'headline' => $communityProfile->headline,
            'bio' => $communityProfile->bio,
        ] : null;

        $presentationSessions = $target->presentationSessions()->get();
        $presentationCount = $presentationSessions->count();
        $scoredSessions = $presentationSessions->whereNotNull('overall_score');
        $averageScore = $scoredSessions->isNotEmpty()
            ? round(((float) $scoredSessions->avg('overall_score')) / 10, 1)
            : 0.0;
        $totalDurationSeconds = (int) $presentationSessions->sum('duration_seconds');
        $practiceDurationMinutes = (int) round($totalDurationSeconds / 60);

        $followersCount = $target->followers()->count();
        $followingCount = $target->following()->count();

        $stats = [
            'presentation_count' => $presentationCount,
            'average_score' => $averageScore,
            'practice_duration_minutes' => $practiceDurationMinutes,
            'followers_count' => $followersCount,
            'following_count' => $followingCount,
        ];

        $authoredPosts = $target->communityPosts()
            ->with('topicTag')
            ->latest()
            ->take(20)
            ->get();

        $posts = $authoredPosts->map(function (CommunityPost $post) {
            return [
                'id' => $post->id,
                'content' => $post->body ?? $post->content ?? '',
                'topic' => $post->topicTag?->name,
                'likes_count' => $post->likes_count ?? 0,
                'replies_count' => $post->replies_count ?? 0,
                'created_at' => $post->created_at?->toISOString() ?? $post->created_at,
            ];
        })->values()->all();

        $achievements = [];
        if ($presentationCount >= 1) {
            $firstSession = $presentationSessions->sortBy('created_at')->first();
            $achievements[] = [
                'id' => 'starter',
                'name' => 'Bước chân đầu tiên',
                'icon' => 'flag',
                'unlocked_at' => $firstSession?->created_at?->toISOString() ?? $target->created_at?->toISOString(),
            ];
        }

        if ($presentationCount >= 1 && $averageScore >= 8.0) {
            $topSession = $presentationSessions->where('overall_score', '>=', 80)->sortBy('created_at')->first();
            $achievements[] = [
                'id' => 'top_speaker',
                'name' => 'Diễn giả xuất sắc',
                'icon' => 'star',
                'unlocked_at' => $topSession?->created_at?->toISOString() ?? $target->created_at?->toISOString(),
            ];
        }

        if ($presentationCount >= 5) {
            $fifthSession = $presentationSessions->sortBy('created_at')->skip(4)->first();
            $achievements[] = [
                'id' => 'practice_master',
                'name' => 'Chăm chỉ luyện tập',
                'icon' => 'trophy',
                'unlocked_at' => $fifthSession?->created_at?->toISOString() ?? $target->created_at?->toISOString(),
            ];
        }

        if ($authoredPosts->isNotEmpty()) {
            $firstPost = $authoredPosts->sortBy('created_at')->first();
            $achievements[] = [
                'id' => 'community_voice',
                'name' => 'Thành viên năng nổ',
                'icon' => 'message-square',
                'unlocked_at' => $firstPost?->created_at?->toISOString() ?? $target->created_at?->toISOString(),
            ];
        }

        return [
            'user' => [
                'id' => $target->id,
                'name' => $target->name,
                'email' => $isOwnProfile ? $target->email : null,
                'avatar_url' => $target->avatar_url,
                'created_at' => $target->created_at?->toISOString() ?? $target->created_at,
            ],
            'community_profile' => $communityProfileData,
            'stats' => $stats,
            'achievements' => $achievements,
            'posts' => $posts,
            'is_own_profile' => $isOwnProfile,
            'is_following' => $isFollowing,
        ];
    }
}
