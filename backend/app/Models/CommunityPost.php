<?php

namespace App\Models;

use App\Enums\CommunityPostStatus;
use App\Enums\ReplyControl;
use Carbon\CarbonInterface;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\SoftDeletes;
use Spatie\Image\Enums\Fit;
use Spatie\MediaLibrary\HasMedia;
use Spatie\MediaLibrary\InteractsWithMedia;
use Spatie\MediaLibrary\MediaCollections\Models\Media;

/**
 * @property ReplyControl $reply_control
 * @property CommunityPostStatus $status
 * @property bool $is_hidden_by_author
 * @property string $hot_score
 * @property CarbonInterface|null $created_at
 * @property CarbonInterface|null $updated_at
 * @property CarbonInterface|null $deleted_at
 */
#[Fillable([
    'user_id',
    'root_id',
    'parent_id',
    'thread_group_id',
    'depth',
    'quote_post_id',
    'repost_of_id',
    'topic_tag_id',
    'body',
    'content',
    'body_search',
    'reply_control',
    'status',
    'is_hidden_by_author',
    'likes_count',
    'replies_count',
    'reposts_count',
    'quotes_count',
    'substantive_replies_count',
    'poll_votes_count',
    'hot_score',
])]
class CommunityPost extends Model implements HasMedia
{
    use InteractsWithMedia, SoftDeletes;

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'depth' => 'integer',
            'reply_control' => ReplyControl::class,
            'status' => CommunityPostStatus::class,
            'is_hidden_by_author' => 'boolean',
            'likes_count' => 'integer',
            'replies_count' => 'integer',
            'reposts_count' => 'integer',
            'quotes_count' => 'integer',
            'substantive_replies_count' => 'integer',
            'poll_votes_count' => 'integer',
            'hot_score' => 'decimal:4',
        ];
    }

    /**
     * Map content alias to body attribute.
     */
    public function setContentAttribute(mixed $value): void
    {
        $this->attributes['body'] = $value;
    }

    /**
     * Get content alias from body attribute.
     */
    public function getContentAttribute(): ?string
    {
        return $this->attributes['body'] ?? null;
    }

    /**
     * Get the author of the post.
     *
     * @return BelongsTo<User, $this>
     */
    public function author(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    /**
     * Get the root post of this conversation tree.
     *
     * @return BelongsTo<self, $this>
     */
    public function root(): BelongsTo
    {
        return $this->belongsTo(self::class, 'root_id');
    }

    /**
     * Get the direct parent post.
     *
     * @return BelongsTo<self, $this>
     */
    public function parent(): BelongsTo
    {
        return $this->belongsTo(self::class, 'parent_id');
    }

    /**
     * Get the quoted post if this post quotes another post.
     *
     * @return BelongsTo<self, $this>
     */
    public function quotePost(): BelongsTo
    {
        return $this->belongsTo(self::class, 'quote_post_id');
    }

    /**
     * Get the original post if this post is a pure repost.
     *
     * @return BelongsTo<self, $this>
     */
    public function repostOf(): BelongsTo
    {
        return $this->belongsTo(self::class, 'repost_of_id');
    }

    /**
     * Get the topic tag associated with this post.
     *
     * @return BelongsTo<CommunityTopicTag, $this>
     */
    public function topicTag(): BelongsTo
    {
        return $this->belongsTo(CommunityTopicTag::class, 'topic_tag_id');
    }

    /**
     * Get the poll attached to this post.
     *
     * @return HasOne<CommunityPoll, $this>
     */
    public function poll(): HasOne
    {
        return $this->hasOne(CommunityPoll::class, 'post_id');
    }

    /**
     * Get direct child replies.
     *
     * @return HasMany<self, $this>
     */
    public function replies(): HasMany
    {
        return $this->hasMany(self::class, 'parent_id');
    }

    /**
     * Register media collections for the post.
     */
    public function registerMediaCollections(): void
    {
        $this->addMediaCollection('images')
            ->acceptsMimeTypes(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

        $this->addMediaCollection('attachments');
    }

    /**
     * Register media conversions for the post.
     */
    public function registerMediaConversions(?Media $media = null): void
    {
        $this->addMediaConversion('preview')
            ->fit(Fit::Max, 1200, 1200)
            ->nonQueued();

        $this->addMediaConversion('thumb')
            ->fit(Fit::Crop, 300, 300)
            ->nonQueued();
    }
}
