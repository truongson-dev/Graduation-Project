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
        Schema::create('community_profiles', function (Blueprint $table): void {
            $table->foreignId('user_id')->primary()->constrained()->cascadeOnDelete();
            $table->string('username', 50)->unique();
            $table->string('headline', 120)->nullable();
            $table->string('bio', 280)->nullable();
            $table->timestamps();
        });

        Schema::create('community_topic_tags', function (Blueprint $table): void {
            $table->id();
            $table->string('slug', 60)->unique();
            $table->string('name', 80);
            $table->string('description', 255)->nullable();
            $table->string('color_token', 40)->default('blue');
            $table->unsignedInteger('posts_count')->default(0);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('community_topic_tags');
        Schema::dropIfExists('community_profiles');
    }
};
