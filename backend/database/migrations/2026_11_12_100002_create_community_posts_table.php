<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('community_posts', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('root_id')->nullable()->constrained('community_posts')->cascadeOnDelete();
            $table->foreignId('parent_id')->nullable()->constrained('community_posts')->cascadeOnDelete();
            $table->foreignId('thread_group_id')->nullable()->constrained('community_posts')->nullOnDelete();
            $table->unsignedTinyInteger('depth')->default(0);
            $table->foreignId('quote_post_id')->nullable()->constrained('community_posts')->nullOnDelete();
            $table->foreignId('repost_of_id')->nullable()->constrained('community_posts')->cascadeOnDelete();
            $table->foreignId('topic_tag_id')->nullable()->constrained('community_topic_tags')->nullOnDelete();
            $table->text('body')->nullable();
            $table->string('body_search', 600)->nullable();
            $table->string('reply_control', 24)->default('everyone');
            $table->string('status', 20)->default('published');
            $table->boolean('is_hidden_by_author')->default(false);
            $table->unsignedInteger('likes_count')->default(0);
            $table->unsignedInteger('replies_count')->default(0);
            $table->unsignedInteger('reposts_count')->default(0);
            $table->unsignedInteger('quotes_count')->default(0);
            $table->unsignedInteger('substantive_replies_count')->default(0);
            $table->unsignedInteger('poll_votes_count')->default(0);
            $table->decimal('hot_score', 12, 4)->default(10.0000);
            $table->timestamps();
            $table->softDeletes();

            $table->index(['thread_group_id', 'id'], 'idx_thread_group');
            $table->index(['repost_of_id', 'user_id'], 'idx_repost_lookup');
        });

        if (DB::getDriverName() === 'mysql') {
            DB::statement('CREATE INDEX idx_feed_for_you ON community_posts (depth, status, hot_score DESC, id DESC)');
            DB::statement('CREATE INDEX idx_feed_following ON community_posts (user_id, depth, status, created_at DESC, id DESC)');
            DB::statement('CREATE INDEX idx_feed_topic ON community_posts (topic_tag_id, depth, status, hot_score DESC, id DESC)');
            DB::statement('CREATE INDEX idx_thread_tree ON community_posts (root_id, status, is_hidden_by_author, parent_id, likes_count DESC, id ASC)');
            DB::statement('CREATE FULLTEXT INDEX ft_body_search ON community_posts (body_search)');
        } else {
            Schema::table('community_posts', function (Blueprint $table): void {
                $table->index(['depth', 'status', 'hot_score', 'id'], 'idx_feed_for_you');
                $table->index(['user_id', 'depth', 'status', 'created_at', 'id'], 'idx_feed_following');
                $table->index(['topic_tag_id', 'depth', 'status', 'hot_score', 'id'], 'idx_feed_topic');
                $table->index(['root_id', 'status', 'is_hidden_by_author', 'parent_id', 'likes_count', 'id'], 'idx_thread_tree');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('community_posts');
    }
};
