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
        Schema::create('presentation_sessions', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('status')->default('processing')->index();
            $table->text('error_message')->nullable();
            $table->string('title')->nullable();
            $table->longText('slide_content')->nullable();
            $table->unsignedInteger('duration_seconds')->default(0);
            $table->string('audio_path')->nullable();
            $table->unsignedTinyInteger('overall_score')->nullable();
            $table->unsignedSmallInteger('words_per_minute')->nullable();
            $table->unsignedSmallInteger('fillers_count')->nullable();
            $table->unsignedTinyInteger('eye_contact_percent')->default(0);
            $table->unsignedTinyInteger('posture_score')->default(0);
            $table->unsignedTinyInteger('slide_coverage_score')->nullable();
            $table->boolean('is_reading_slides')->nullable();
            $table->text('elaboration_quality')->nullable();
            $table->text('voice_feedback')->nullable();
            $table->text('body_language_feedback')->nullable();
            $table->longText('transcript')->nullable();
            $table->json('strengths')->nullable();
            $table->json('improvements')->nullable();
            $table->json('actionable_tips')->nullable();
            $table->string('language', 5)->default('vi');
            $table->timestamp('started_processing_at')->nullable();
            $table->timestamps();

            $table->index(['user_id', 'created_at']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('presentation_sessions');
    }
};
