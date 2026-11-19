<?php

namespace App\Models;

use App\Enums\LessonType;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Lesson extends Model
{
    use HasFactory;

    protected $fillable = [
        'section_id',
        'title',
        'type',
        'sort_order',
        'content_json',
        'pass_threshold',
        'xp_reward',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'type' => LessonType::class,
            'content_json' => 'array',
            'pass_threshold' => 'integer',
            'xp_reward' => 'integer',
            'sort_order' => 'integer',
        ];
    }

    /**
     * Get the section that owns this lesson.
     *
     * @return BelongsTo<Section, $this>
     */
    public function section(): BelongsTo
    {
        return $this->belongsTo(Section::class);
    }

    /**
     * Get user progress records for this lesson.
     *
     * @return HasMany<UserLessonProgress, $this>
     */
    public function progress(): HasMany
    {
        return $this->hasMany(UserLessonProgress::class);
    }

    /**
     * Get attempts for this lesson.
     *
     * @return HasMany<UserLessonAttempt, $this>
     */
    public function attempts(): HasMany
    {
        return $this->hasMany(UserLessonAttempt::class);
    }
}
