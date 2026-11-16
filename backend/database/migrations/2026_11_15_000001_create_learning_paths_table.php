<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('learning_paths', function (Blueprint $table): void {
            $table->id();
            $table->string('slug')->unique();
            $table->string('title');
            $table->string('subtitle')->nullable();
            $table->string('icon')->default('chat_bubble');
            $table->unsignedInteger('sort_order')->default(0);
            $table->string('status')->default('published');
            $table->json('lessons');
            $table->timestamps();
        });

        DB::table('learning_paths')->insert([
            'slug' => 'nghe-thuat-dat-cau-hoi',
            'title' => 'Nghệ thuật đặt câu hỏi',
            'subtitle' => 'Kỹ năng 1',
            'icon' => 'chat_bubble',
            'sort_order' => 1,
            'status' => 'published',
            'lessons' => json_encode([
                ['title' => 'Câu hỏi mở và câu hỏi đóng', 'sort_order' => 1],
                ['title' => 'Câu hỏi làm rõ', 'sort_order' => 2],
                ['title' => 'Câu hỏi đào sâu', 'sort_order' => 3],
                ['title' => '5 Whys và câu hỏi Socratic', 'sort_order' => 4],
            ], JSON_THROW_ON_ERROR),
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    public function down(): void
    {
        Schema::dropIfExists('learning_paths');
    }
};
