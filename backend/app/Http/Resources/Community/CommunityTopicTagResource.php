<?php

namespace App\Http\Resources\Community;

use App\Models\CommunityTopicTag;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin CommunityTopicTag
 */
class CommunityTopicTagResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        /** @var CommunityTopicTag $tag */
        $tag = $this->resource;

        return [
            'id' => $tag->id,
            'slug' => $tag->slug,
            'name' => $tag->name,
            'description' => $tag->description,
            'color_token' => $tag->color_token,
            'posts_count' => $tag->posts_count,
        ];
    }
}
