<?php

namespace App\Http\Resources\Community;

use App\Models\User;
use App\Support\CommunityTextHelper;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin User
 */
class CommunityAuthorResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        /** @var User $user */
        $user = $this->resource;
        $profile = $user->relationLoaded('communityProfile') ? $user->communityProfile : null;

        return [
            'id' => $user->id,
            'name' => $user->name,
            'username' => $profile !== null ? $profile->username : CommunityTextHelper::defaultUsernameFor($user),
            'headline' => $profile !== null ? $profile->headline : 'Học viên SoftSkill AI',
            'avatar_url' => $user->avatar_url,
        ];
    }
}
