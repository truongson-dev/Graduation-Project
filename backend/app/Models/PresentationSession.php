<?php

namespace App\Models;

use Database\Factories\PresentationSessionFactory;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PresentationSession extends Model
{
    /** @use HasFactory<PresentationSessionFactory> */
    use HasFactory, HasUuids;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'id',
        'user_id',
        'status',
        'error_message',
        'title',
        'slide_content',
        'duration_seconds',
        'audio_path',
        'overall_score',
        'words_per_minute',
        'fillers_count',
        'eye_contact_percent',
        'posture_score',
        'slide_coverage_score',
        'is_reading_slides',
        'elaboration_quality',
        'voice_feedback',
        'body_language_feedback',
        'transcript',
        'strengths',
        'improvements',
        'actionable_tips',
        'language',
        'started_processing_at',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'duration_seconds' => 'integer',
            'overall_score' => 'integer',
            'words_per_minute' => 'integer',
            'fillers_count' => 'integer',
            'eye_contact_percent' => 'integer',
            'posture_score' => 'integer',
            'slide_coverage_score' => 'integer',
            'is_reading_slides' => 'boolean',
            'strengths' => 'array',
            'improvements' => 'array',
            'actionable_tips' => 'array',
            'started_processing_at' => 'datetime',
        ];
    }

    /**
     * The user that owns the presentation session.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
