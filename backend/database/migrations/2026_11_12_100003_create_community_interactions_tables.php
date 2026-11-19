<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('community_polls', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('post_id')->unique()->constrained('community_posts')->cascadeOnDelete();
            $table->string('question', 280)->nullable();
            $table->timestamp('expires_at')->nullable();
            $table->unsignedInteger('total_votes')->default(0);
            $table->timestamps();
        });

        Schema::create('community_poll_options', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('poll_id')->constrained('community_polls')->cascadeOnDelete();
            $table->string('label', 120);
            $table->unsignedInteger('votes_count')->default(0);
            $table->unsignedTinyInteger('sort_order')->default(0);

            $table->index(['poll_id', 'sort_order'], 'idx_poll_options_order');
        });

        Schema::create('community_poll_votes', function (Blueprint $table): void {
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('poll_id')->constrained('community_polls')->cascadeOnDelete();
            $table->foreignId('option_id')->constrained('community_poll_options')->cascadeOnDelete();
            $table->timestamp('created_at')->useCurrent();

            $table->primary(['user_id', 'poll_id']);
            $table->index(['poll_id', 'option_id'], 'idx_poll_votes_option');
        });

        Schema::create('community_post_reactions', function (Blueprint $table): void {
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('post_id')->constrained('community_posts')->cascadeOnDelete();
            $table->string('type', 16);
            $table->timestamp('created_at')->useCurrent();

            $table->primary(['user_id', 'post_id', 'type']);
            $table->index(['post_id', 'type'], 'idx_post_reactions_type');
        });

        Schema::create('community_follows', function (Blueprint $table): void {
            $table->foreignId('follower_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('following_id')->constrained('users')->cascadeOnDelete();
            $table->timestamp('created_at')->useCurrent();

            $table->primary(['follower_id', 'following_id']);
            $table->index(['following_id', 'follower_id'], 'idx_follows_reverse');
            $table->index(['follower_id', 'created_at'], 'idx_follows_recent');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('community_follows');
        Schema::dropIfExists('community_post_reactions');
        Schema::dropIfExists('community_poll_votes');
        Schema::dropIfExists('community_poll_options');
        Schema::dropIfExists('community_polls');
    }
};
