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
        if (DB::getDriverName() === 'mysql') {
            DB::statement(
                'CREATE INDEX idx_post_reactions_user_feed ON community_post_reactions (user_id, type, created_at DESC, post_id DESC)'
            );
            DB::statement(
                "ALTER TABLE community_posts ADD COLUMN active_repost_of_id BIGINT UNSIGNED GENERATED ALWAYS AS (CASE WHEN repost_of_id IS NOT NULL AND status = 'published' AND deleted_at IS NULL THEN repost_of_id ELSE NULL END) VIRTUAL"
            );
            DB::statement(
                'CREATE UNIQUE INDEX uq_active_repost ON community_posts (user_id, active_repost_of_id)'
            );
        } else {
            Schema::table('community_post_reactions', function (Blueprint $table): void {
                $table->index(['user_id', 'type', 'created_at', 'post_id'], 'idx_post_reactions_user_feed');
            });

            DB::statement(
                "ALTER TABLE community_posts ADD COLUMN active_repost_of_id INTEGER GENERATED ALWAYS AS (CASE WHEN repost_of_id IS NOT NULL AND status = 'published' AND deleted_at IS NULL THEN repost_of_id ELSE NULL END) VIRTUAL"
            );
            DB::statement(
                'CREATE UNIQUE INDEX uq_active_repost ON community_posts (user_id, active_repost_of_id)'
            );
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (DB::getDriverName() === 'mysql') {
            DB::statement('DROP INDEX uq_active_repost ON community_posts');
            DB::statement('ALTER TABLE community_posts DROP COLUMN active_repost_of_id');
            DB::statement('DROP INDEX idx_post_reactions_user_feed ON community_post_reactions');
        } else {
            DB::statement('DROP INDEX IF EXISTS uq_active_repost');
            Schema::table('community_posts', function (Blueprint $table): void {
                $table->dropColumn('active_repost_of_id');
            });
            Schema::table('community_post_reactions', function (Blueprint $table): void {
                $table->dropIndex('idx_post_reactions_user_feed');
            });
        }
    }
};
