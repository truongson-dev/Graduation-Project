<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class UserLessonAttempt extends Model
{
    use HasFactory;

    protected $table = 'user_lesson_attempts';

    protected $fillable = [
        'user_id',
        'lesson_id',
        'attempt_number',
        'answers_json',
        'score',
        'ai_feedback',
        'passed',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'attempt_number' => 'integer',
            'answers_json' => 'array',
            'score' => 'integer',
            'ai_feedback' => 'array',
            'passed' => 'boolean',
        ];
    }

    /**
     * Get the user who made this attempt.
     *
     * @return BelongsTo<User, $this>
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Get the lesson attempted.
     *
     * @return BelongsTo<Lesson, $this>
     */
    public function lesson(): BelongsTo
    {
        return $this->belongsTo(Lesson::class);
    }
}
