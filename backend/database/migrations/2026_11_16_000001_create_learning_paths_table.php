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
        if (!Schema::hasTable('learning_paths')) {
            Schema::create('learning_paths', function (Blueprint $table) {
                $table->id();
                $table->string('title');
                $table->text('description')->nullable();
                $table->string('subtitle')->nullable();
                $table->string('icon')->default('chat_bubble');
                $table->string('slug')->unique();
                $table->integer('sort_order')->default(0);
                $table->string('status')->default('published');
                $table->boolean('is_active')->default(true);
                $table->json('lessons')->nullable();
                $table->timestamps();
            });
        } else {
            Schema::table('learning_paths', function (Blueprint $table) {
                if (!Schema::hasColumn('learning_paths', 'description')) {
                    $table->text('description')->nullable()->after('title');
                }
                if (!Schema::hasColumn('learning_paths', 'is_active')) {
                    $table->boolean('is_active')->default(true)->after('sort_order');
                }
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('learning_paths');
    }
};
