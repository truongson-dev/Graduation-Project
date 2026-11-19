<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class UserGamification extends Model
{
    use HasFactory;

    protected $table = 'user_gamification';

    protected $fillable = [
        'user_id',
        'total_xp',
        'current_streak',
        'longest_streak',
        'lives_count',
        'lives_refill_at',
        'tournament_tier',
        'tournament_rank',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'total_xp' => 'integer',
            'current_streak' => 'integer',
            'longest_streak' => 'integer',
            'lives_count' => 'integer',
            'lives_refill_at' => 'datetime',
            'tournament_rank' => 'integer',
        ];
    }

    /**
     * Get the user who owns this gamification profile.
     *
     * @return BelongsTo<User, $this>
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
