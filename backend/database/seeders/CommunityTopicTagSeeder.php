<?php

namespace Database\Seeders;

use App\Models\CommunityTopicTag;
use Illuminate\Database\Seeder;

class CommunityTopicTagSeeder extends Seeder
{
    /**
     * Seed default soft-skill topic tags for the community feed.
     */
    public function run(): void
    {
        $topics = [
            [
                'slug' => 'giao-tiep',
                'name' => 'Giao tiếp',
                'description' => 'Ứng xử khéo léo, lắng nghe chủ động và truyền đạt rõ ràng.',
                'color_token' => 'blue',
            ],
            [
                'slug' => 'thuyet-trinh',
                'name' => 'Thuyết trình',
                'description' => 'Kỹ năng nói trước đám đông, cấu trúc slide và làm chủ sân khấu.',
                'color_token' => 'teal',
            ],
            [
                'slug' => 'tranh-bien',
                'name' => 'Tranh biện',
                'description' => 'Tư duy phản biện, bảo vệ quan điểm bằng lập luận và dẫn chứng.',
                'color_token' => 'indigo',
            ],
            [
                'slug' => 'phong-van',
                'name' => 'Phỏng vấn',
                'description' => 'Trả lời câu hỏi tình huống STAR và đàm phán cơ hội nghề nghiệp.',
                'color_token' => 'amber',
            ],
            [
                'slug' => 'lam-viec-nhom',
                'name' => 'Làm việc nhóm',
                'description' => 'Phối hợp, phân công, giải quyết xung đột và phản hồi đồng đội.',
                'color_token' => 'sky',
            ],
            [
                'slug' => 'quan-ly-cam-xuc',
                'name' => 'Quản lý cảm xúc',
                'description' => 'Giữ bình tĩnh dưới áp lực, trí tuệ cảm xúc và cân bằng công việc.',
                'color_token' => 'rose',
            ],
        ];

        foreach ($topics as $topic) {
            CommunityTopicTag::query()->updateOrCreate(
                ['slug' => $topic['slug']],
                [
                    'name' => $topic['name'],
                    'description' => $topic['description'],
                    'color_token' => $topic['color_token'],
                    'is_active' => true,
                ]
            );
        }
    }
}
