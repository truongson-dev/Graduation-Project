<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class UserDailyStreak extends Model
{
    use HasFactory;

    protected $table = 'user_daily_streaks';

    protected $fillable = [
        'user_id',
        'date',
        'xp_earned',
        'lessons_completed',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'date' => 'string',
            'xp_earned' => 'integer',
            'lessons_completed' => 'integer',
        ];
    }

    /**
     * Get the user who owns this streak record.
     *
     * @return BelongsTo<User, $this>
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
