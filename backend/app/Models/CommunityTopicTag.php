<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable(['slug', 'name', 'description', 'color_token', 'posts_count', 'is_active'])]
class CommunityTopicTag extends Model
{
    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'posts_count' => 'integer',
            'is_active' => 'boolean',
        ];
    }

    /**
     * Get the posts tagged with this topic.
     *
     * @return HasMany<CommunityPost, $this>
     */
    public function posts(): HasMany
    {
        return $this->hasMany(CommunityPost::class, 'topic_tag_id');
    }
}
