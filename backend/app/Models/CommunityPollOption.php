<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['poll_id', 'label', 'votes_count', 'sort_order'])]
class CommunityPollOption extends Model
{
    /**
     * Indicates if the model should be timestamped.
     *
     * @var bool
     */
    public $timestamps = false;

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'votes_count' => 'integer',
            'sort_order' => 'integer',
        ];
    }

    /**
     * Get the poll that owns this option.
     *
     * @return BelongsTo<CommunityPoll, $this>
     */
    public function poll(): BelongsTo
    {
        return $this->belongsTo(CommunityPoll::class, 'poll_id');
    }
}
