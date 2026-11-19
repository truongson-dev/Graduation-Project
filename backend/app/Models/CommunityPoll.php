<?php

namespace App\Models;

use Carbon\CarbonInterface;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * @property CarbonInterface|null $expires_at
 */
#[Fillable(['post_id', 'question', 'expires_at', 'total_votes'])]
class CommunityPoll extends Model
{
    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'expires_at' => 'datetime',
            'total_votes' => 'integer',
        ];
    }

    /**
     * Get the post that owns this poll.
     *
     * @return BelongsTo<CommunityPost, $this>
     */
    public function post(): BelongsTo
    {
        return $this->belongsTo(CommunityPost::class, 'post_id');
    }

    /**
     * Get the poll options ordered by sort_order.
     *
     * @return HasMany<CommunityPollOption, $this>
     */
    public function options(): HasMany
    {
        return $this->hasMany(CommunityPollOption::class, 'poll_id')->orderBy('sort_order');
    }
}
