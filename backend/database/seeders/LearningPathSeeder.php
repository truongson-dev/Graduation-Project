<?php

namespace Database\Seeders;

use App\Enums\LessonType;
use App\Models\LearningPath;
use App\Models\Lesson;
use App\Models\Section;
use Illuminate\Database\Seeder;

class LearningPathSeeder extends Seeder
{
    public function run(): void
    {
        $path = LearningPath::updateOrCreate(
            ['slug' => 'ky-nang-mem'],
            [
                'title' => 'Kỹ năng mềm',
                'description' => 'Lộ trình rèn luyện kỹ năng mềm toàn diện: Giao tiếp, Lắng nghe, Phản hồi, Thuyết trình và Phỏng vấn.',
                'sort_order' => 1,
                'is_active' => true,
            ]
        );

        $sectionsData = [
            [
                'title' => 'Khởi động',
                'subtitle' => 'Làm quen hành trình',
                'icon' => 'flag',
                'sort_order' => 1,
                'lessons' => [
                    [
                        'title' => 'Khám phá điểm mạnh của bạn',
                        'type' => LessonType::Theory,
                        'sort_order' => 1,
                        'pass_threshold' => 0,
                        'xp_reward' => 15,
                        'content_json' => [
                            'markdown' => "## Khám Phá Điểm Mạnh Của Bản Thân\n\nKỹ năng mềm không phải là năng khiếu bẩm sinh mà là tập hợp các thói quen và phản xạ giao tiếp có thể rèn luyện mỗi ngày.\n\n### 3 Yếu tố cốt lõi:\n1. **Tự nhận thức (Self-awareness):** Hiểu rõ phong cách giao tiếp tự nhiên và cảm xúc của mình.\n2. **Sự đồng cảm (Empathy):** Đặt mình vào góc nhìn của người khác trước khi phản ứng.\n3. **Hành động nhất quán:** Thực hành đều đặn trong các tình huống thực tế.",
                            'images' => [],
                        ],
                    ],
                    [
                        'title' => 'Đặt mục tiêu rèn luyện kỹ năng mềm',
                        'type' => LessonType::Quiz,
                        'sort_order' => 2,
                        'pass_threshold' => 70,
                        'xp_reward' => 20,
                        'content_json' => [
                            'questions' => [
                                [
                                    'text' => 'Nguyên tắc SMART trong việc đặt mục tiêu học tập có nghĩa là gì?',
                                    'options' => [
                                        'Cụ thể, Đo lường được, Khả thi, Phù hợp, Có thời hạn',
                                        'Nhanh chóng, Linh hoạt, Tự động, Thực tế, Tiết kiệm',
                                        'Tự tin, Quyết đoán, Độc lập, Sáng tạo, Kiên trì',
                                        'Ngắn gọn, Đơn giản, Dễ nhớ, Đổi mới, Tối ưu',
                                    ],
                                    'correct' => 0,
                                    'explanation' => 'SMART là viết tắt của: Specific (Cụ thể), Measurable (Đo lường được), Achievable (Khả thi), Relevant (Phù hợp), Time-bound (Có thời hạn).',
                                ],
                                [
                                    'text' => 'Mục tiêu nào sau đây được xem là cụ thể và khả thi nhất?',
                                    'options' => [
                                        'Tôi sẽ trở thành người thuyết trình giỏi nhất',
                                        'Tôi sẽ tập nói trước gương 10 phút mỗi ngày trong 2 tuần tới',
                                        'Tôi sẽ không bao giờ run khi nói chuyện',
                                        'Tôi sẽ đọc hết tất cả sách về kỹ năng mềm',
                                    ],
                                    'correct' => 1,
                                    'explanation' => 'Mục tiêu có hành động cụ thể (tập nói trước gương), thời lượng (10 phút/ngày) và khung thời gian (2 tuần).',
                                ],
                            ],
                        ],
                    ],
                    [
                        'title' => 'Nhận diện phong cách giao tiếp',
                        'type' => LessonType::Writing,
                        'sort_order' => 3,
                        'pass_threshold' => 70,
                        'xp_reward' => 25,
                        'content_json' => [
                            'prompt' => 'Hãy viết một đoạn văn (khoảng 80-200 từ) mô tả phong cách giao tiếp hiện tại của bạn trong công việc hoặc học tập nhóm. Nêu ít nhất 1 ưu điểm và 1 điểm bạn muốn cải thiện.',
                            'rubric' => 'Đánh giá tính chân thực, khả năng tự nhận thức, nêu rõ 1 điểm mạnh và 1 điểm cải thiện cụ thể.',
                            'sample_answer' => 'Trong làm việc nhóm, tôi có phong cách giao tiếp cởi mở và luôn sẵn sàng lắng nghe đồng nghiệp. Điểm mạnh của tôi là biết cách khích lệ mọi người phát biểu ý kiến. Tuy nhiên, tôi thường ngần ngại khi phải phản biện ý kiến trái chiều vì sợ làm mất hòa khí.',
                        ],
                    ],
                ],
            ],
            [
                'title' => 'Giao tiếp tự tin',
                'subtitle' => 'Kỹ năng 1',
                'icon' => 'chat_bubble',
                'sort_order' => 2,
                'lessons' => [
                    [
                        'title' => 'Diễn đạt ý tưởng rõ ràng',
                        'type' => LessonType::Theory,
                        'sort_order' => 1,
                        'pass_threshold' => 0,
                        'xp_reward' => 15,
                        'content_json' => [
                            'markdown' => "## Diễn Đạt Ý Tưởng Rõ Ràng (Mô hình PREP)\n\nMô hình **PREP** giúp bạn cấu trúc câu trả lời nhanh chóng và thuyết phục:\n- **Point (Điểm chính):** Nêu trực tiếp thông điệp cốt lõi.\n- **Reason (Lý do):** Giải thích tại sao bạn có quan điểm đó.\n- **Example (Ví dụ):** Đưa ra dẫn chứng thực tế hoặc số liệu.\n- **Point (Nhắc lại):** Tóm lược lại thông điệp chính.",
                            'images' => [],
                        ],
                    ],
                    [
                        'title' => 'Bắt đầu và duy trì cuộc trò chuyện',
                        'type' => LessonType::Quiz,
                        'sort_order' => 2,
                        'pass_threshold' => 70,
                        'xp_reward' => 20,
                        'content_json' => [
                            'questions' => [
                                [
                                    'text' => 'Khi gặp một người mới tại hội thảo, cách mở đầu nào sau đây tạo thiện cảm tốt nhất?',
                                    'options' => [
                                        'Chào bạn, bạn thấy chủ đề vừa rồi của diễn giả thế nào?',
                                        'Bạn lương bao nhiêu một tháng?',
                                        'Tôi là chuyên gia giỏi nhất ở đây.',
                                        'Im lặng đứng cạnh chờ người đó bắt chuyện.',
                                    ],
                                    'correct' => 0,
                                    'explanation' => 'Đặt câu hỏi mở liên quan đến bối cảnh chung (chủ đề hội thảo) tạo cảm giác tự nhiên và thoải mái.',
                                ],
                            ],
                        ],
                    ],
                    [
                        'title' => 'Đặt câu hỏi đúng trọng tâm',
                        'type' => LessonType::Quiz,
                        'sort_order' => 3,
                        'pass_threshold' => 70,
                        'xp_reward' => 20,
                        'content_json' => [
                            'questions' => [
                                [
                                    'text' => 'Câu hỏi mở thường bắt đầu bằng từ nào sau đây?',
                                    'options' => [
                                        'Có phải... không?',
                                        'Bạn có đồng ý không?',
                                        'Như thế nào? / Tại sao?',
                                        'Đúng hay sai?',
                                    ],
                                    'correct' => 2,
                                    'explanation' => 'Câu hỏi mở bắt đầu bằng "Như thế nào", "Tại sao", "Điều gì" giúp người đối diện chia sẻ sâu hơn.',
                                ],
                            ],
                        ],
                    ],
                    [
                        'title' => 'Giao tiếp tự tin trong nhóm',
                        'type' => LessonType::Writing,
                        'sort_order' => 4,
                        'pass_threshold' => 70,
                        'xp_reward' => 25,
                        'content_json' => [
                            'prompt' => 'Bạn và nhóm đang thảo luận chọn đề tài cuối kỳ, nhưng hai thành viên có ý kiến bất đồng gay gắt. Hãy viết đoạn lời nói mà bạn sẽ phát biểu để giúp hòa giải và định hướng nhóm.',
                            'rubric' => 'Đánh giá thái độ trung lập, sự đồng cảm, khả năng chuyển hướng sự chú ý về mục tiêu chung.',
                            'sample_answer' => 'Mình thấy cả hai ý tưởng của Nam và Lan đều có góc nhìn rất giá trị. Để công bằng và không mất thời gian, chúng ta hãy liệt kê ưu và nhược điểm của từng phương án dựa trên tiêu chí chấm điểm của thầy cô nhé.',
                        ],
                    ],
                ],
            ],
            [
                'title' => 'Lắng nghe chủ động',
                'subtitle' => 'Kỹ năng 2',
                'icon' => 'headphones',
                'sort_order' => 3,
                'lessons' => [
                    [
                        'title' => 'Tập trung vào người nói',
                        'type' => LessonType::Theory,
                        'sort_order' => 1,
                        'pass_threshold' => 0,
                        'xp_reward' => 15,
                        'content_json' => [
                            'markdown' => "## Lắng Nghe Chủ Động (Active Listening)\n\nLắng nghe chủ động không chỉ là nghe âm thanh, mà là thấu hiểu ý nghĩa và cảm xúc đằng sau lời nói.\n\n### Kỹ thuật 3 bước:\n1. **Giao tiếp phi ngôn ngữ:** Duy trì ánh mắt, gật đầu nhẹ, không dùng điện thoại.\n2. **Không phán xét hay ngắt lời:** Để người nói hoàn thành suy nghĩ trước khi phản hồi.\n3. **Tóm tắt lại:** Nhắc lại ý chính để xác nhận bạn đã hiểu đúng.",
                            'images' => [],
                        ],
                    ],
                    [
                        'title' => 'Nhận biết ý chính và cảm xúc',
                        'type' => LessonType::Quiz,
                        'sort_order' => 2,
                        'pass_threshold' => 70,
                        'xp_reward' => 20,
                        'content_json' => [
                            'questions' => [
                                [
                                    'text' => 'Khi người nói thở dài và giọng chùng xuống, họ thường đang biểu hiện cảm xúc gì?',
                                    'options' => [
                                        'Hào hứng và phấn khích',
                                        'Mệt mỏi, thất vọng hoặc lo âu',
                                        'Tức giận muốn gây hấn',
                                        'Hoàn toàn tự tin',
                                    ],
                                    'correct' => 1,
                                    'explanation' => 'Thở dài và hạ giọng là dấu hiệu phi ngôn ngữ phổ biến của sự mệt mỏi, thất vọng hoặc chịu áp lực.',
                                ],
                            ],
                        ],
                    ],
                    [
                        'title' => 'Đặt câu hỏi để làm rõ',
                        'type' => LessonType::Quiz,
                        'sort_order' => 3,
                        'pass_threshold' => 70,
                        'xp_reward' => 20,
                        'content_json' => [
                            'questions' => [
                                [
                                    'text' => 'Câu nào sau đây thể hiện kỹ năng xác nhận lại thông tin (paraphrasing)?',
                                    'options' => [
                                        'Ý bạn là dự án này cần gia hạn thêm 2 ngày đúng không?',
                                        'Bạn nói sai rồi, để tôi giải thích lại.',
                                        'Tôi không hiểu bạn đang nói gì cả.',
                                        'Hãy nói nhanh lên tôi đang vội.',
                                    ],
                                    'correct' => 0,
                                    'explanation' => 'Paraphrasing là nhắc lại ý của đối phương bằng ngôn từ của mình để xác minh tính chính xác.',
                                ],
                            ],
                        ],
                    ],
                    [
                        'title' => 'Phản hồi sau khi lắng nghe',
                        'type' => LessonType::Writing,
                        'sort_order' => 4,
                        'pass_threshold' => 70,
                        'xp_reward' => 25,
                        'content_json' => [
                            'prompt' => 'Một người bạn cùng lớp tâm sự rằng họ cảm thấy quá tải vì vừa đi làm thêm vừa phải chạy deadline đồ án. Hãy viết phản hồi thể hiện sự đồng cảm và gợi ý họ cách thư giãn/sắp xếp thời gian.',
                            'rubric' => 'Đánh giá mức độ thấu hiểu, không phán xét, ngôn từ chân thành và đề xuất giải pháp nhẹ nhàng.',
                            'sample_answer' => 'Mình hiểu bạn đang phải chịu rất nhiều áp lực trong giai đoạn này. Việc vừa đi làm vừa làm đồ án thực sự rất vất vả. Tối nay bạn có muốn tạm nghỉ 1 tiếng đi uống trà sữa với mình để xả stress không? Sau đó tụi mình cùng lập lại to-do list ưu tiên nhé.',
                        ],
                    ],
                ],
            ],
            [
                'title' => 'Phản hồi tích cực',
                'subtitle' => 'Kỹ năng 3',
                'icon' => 'thumb_up',
                'sort_order' => 4,
                'lessons' => [
                    [
                        'title' => 'Góp ý cụ thể và tôn trọng',
                        'type' => LessonType::Theory,
                        'sort_order' => 1,
                        'pass_threshold' => 0,
                        'xp_reward' => 15,
                        'content_json' => [
                            'markdown' => "## Nghệ Thuật Phản Hồi (Feedback)\n\nPhản hồi tốt là phản hồi giúp đối phương tiến bộ, không phải để chỉ trích hay hạ thấp.\n\n### Mô hình Bồi đắp (SBI - Situation, Behavior, Impact):\n- **Situation (Tình huống):** Xác định thời gian, địa điểm cụ thể.\n- **Behavior (Hành vi):** Nêu hành động có thể quan sát được.\n- **Impact (Tác động):** Giải thích kết quả hoặc ảnh hưởng của hành vi đó.",
                            'images' => [],
                        ],
                    ],
                    [
                        'title' => 'Tiếp nhận góp ý bình tĩnh',
                        'type' => LessonType::Quiz,
                        'sort_order' => 2,
                        'pass_threshold' => 70,
                        'xp_reward' => 20,
                        'content_json' => [
                            'questions' => [
                                [
                                    'text' => 'Khi nhận được lời góp ý tiêu cực từ sếp hoặc thầy cô, phản xạ đầu tiên nên là gì?',
                                    'options' => [
                                        'Lập tức phản bác và giải thích lý do',
                                        'Hít thở sâu, lắng nghe trọn vẹn và cảm ơn vì phản hồi',
                                        'Bỏ về và không nói chuyện tiếp',
                                        'Đổ lỗi cho đồng nghiệp khác',
                                    ],
                                    'correct' => 1,
                                    'explanation' => 'Bình tĩnh lắng nghe và cảm ơn giúp bạn duy trì sự chuyên nghiệp và tiếp thu được góc nhìn khách quan.',
                                ],
                            ],
                        ],
                    ],
                    [
                        'title' => 'Phản hồi trong tình huống khó',
                        'type' => LessonType::Writing,
                        'sort_order' => 3,
                        'pass_threshold' => 70,
                        'xp_reward' => 25,
                        'content_json' => [
                            'prompt' => 'Đồng nghiệp trong nhóm thường xuyên nộp phần công việc muộn 1-2 ngày làm ảnh hưởng tiến độ cả nhóm. Hãy viết một email hoặc tin nhắn góp ý mang tính xây dựng gửi đồng nghiệp này.',
                            'rubric' => 'Áp dụng nguyên tắc tôn trọng, nêu rõ tình huống, hành vi và tác động đến nhóm, đề xuất cách phối hợp.',
                            'sample_answer' => 'Chào Huy, mình nhận thấy ở 2 sprint gần đây, phần việc của bạn bị trễ hạn một chút nên cả nhóm phải dời lịch review. Mình hiểu công việc đợt này khá nhiều. Nếu gặp khó khăn ở khâu nào, bạn cứ báo sớm trên nhóm để mọi người hỗ trợ nhé.',
                        ],
                    ],
                ],
            ],
            [
                'title' => 'Thuyết trình cuốn hút',
                'subtitle' => 'Kỹ năng 4',
                'icon' => 'slideshow',
                'sort_order' => 5,
                'lessons' => [
                    [
                        'title' => 'Xây dựng bố cục bài nói',
                        'type' => LessonType::Theory,
                        'sort_order' => 1,
                        'pass_threshold' => 0,
                        'xp_reward' => 15,
                        'content_json' => [
                            'markdown' => "## Bố Cục Bài Thuyết Trình Chuẩn\n\nMột bài thuyết trình hiệu quả cần 3 phần rõ ràng:\n1. **Mở đầu (15%):** Thu hút chú ý bằng câu hỏi, câu chuyện hoặc số liệu bất ngờ.\n2. **Thân bài (70%):** Tối đa 3 thông điệp chính, mỗi thông điệp có ví dụ chứng minh.\n3. **Kết luận (15%):** Kêu gọi hành động (Call to action) và tóm tắt thông điệp mang về.",
                            'images' => [],
                        ],
                    ],
                    [
                        'title' => 'Mở đầu thu hút người nghe',
                        'type' => LessonType::Quiz,
                        'sort_order' => 2,
                        'pass_threshold' => 70,
                        'xp_reward' => 20,
                        'content_json' => [
                            'questions' => [
                                [
                                    'text' => 'Phương pháp mở đầu nào sau đây ít hiệu quả nhất?',
                                    'options' => [
                                        'Kể một câu chuyện ngắn liên quan',
                                        'Đọc nguyên văn slide giới thiệu tên và mục lục dài dòng',
                                        'Đưa ra một con số thống kê gây sốc',
                                        'Đặt câu hỏi tương tác với khán giả',
                                    ],
                                    'correct' => 1,
                                    'explanation' => 'Đọc slide giới thiệu dài dòng làm khán giả mất kiên nhẫn ngay từ những giây đầu tiên.',
                                ],
                            ],
                        ],
                    ],
                    [
                        'title' => 'Trình bày luận điểm thuyết phục',
                        'type' => LessonType::Quiz,
                        'sort_order' => 3,
                        'pass_threshold' => 70,
                        'xp_reward' => 20,
                        'content_json' => [
                            'questions' => [
                                [
                                    'text' => 'Quy tắc "Rule of Three" (Quy tắc số 3) trong thuyết trình khuyên điều gì?',
                                    'options' => [
                                        'Chỉ nên nói trong 3 phút',
                                        'Bộ não con người ghi nhớ tốt nhất khi thông tin được nhóm thành 3 phần',
                                        'Cần 3 người cùng thuyết trình',
                                        'Trình bày mỗi slide 3 lần',
                                    ],
                                    'correct' => 1,
                                    'explanation' => 'Bộ não con người nhận diện cấu trúc 3 phần nhanh và ấn tượng nhất.',
                                ],
                            ],
                        ],
                    ],
                    [
                        'title' => 'Kết thúc và trả lời câu hỏi',
                        'type' => LessonType::Writing,
                        'sort_order' => 4,
                        'pass_threshold' => 70,
                        'xp_reward' => 25,
                        'content_json' => [
                            'prompt' => 'Khi kết thúc bài thuyết trình, một khán giả đặt câu hỏi mà bạn hoàn toàn chưa biết câu trả lời. Hãy viết lời đáp của bạn sao cho chuyên nghiệp, thành thật và khéo léo.',
                            'rubric' => 'Đánh giá thái độ tự tin, thành thật thừa nhận chưa có thông tin ngay, cam kết tìm hiểu và gửi lại sau.',
                            'sample_answer' => 'Cảm ơn anh/chị vì một câu hỏi rất sâu sắc và thú vị. Hiện tại tôi chưa có số liệu chính xác để trả lời ngay tại đây. Tôi xin phép ghi nhận lại, sẽ đối chiếu với đội ngũ nghiên cứu và gửi câu trả lời chi tiết qua email cho anh/chị trong ngày mai.',
                        ],
                    ],
                ],
            ],
            [
                'title' => 'Phỏng vấn chuyên nghiệp',
                'subtitle' => 'Kỹ năng 5',
                'icon' => 'work',
                'sort_order' => 6,
                'lessons' => [
                    [
                        'title' => 'Giới thiệu bản thân ngắn gọn',
                        'type' => LessonType::Theory,
                        'sort_order' => 1,
                        'pass_threshold' => 0,
                        'xp_reward' => 15,
                        'content_json' => [
                            'markdown' => "## Giới Thiệu Bản Thân Kiểu Elevator Pitch (60-90s)\n\nCấu trúc gồm 3 ý chính:\n1. **Hiện tại:** Bạn là ai, chuyên môn và đam mê của bạn là gì.\n2. **Quá khứ:** Những thành tựu hoặc trải nghiệm nổi bật đã đạt được.\n3. **Tương lai:** Tại sao bạn ứng tuyển vị trí này và bạn mang lại giá trị gì cho tổ chức.",
                            'images' => [],
                        ],
                    ],
                    [
                        'title' => 'Trả lời câu hỏi theo phương pháp STAR',
                        'type' => LessonType::Quiz,
                        'sort_order' => 2,
                        'pass_threshold' => 70,
                        'xp_reward' => 20,
                        'content_json' => [
                            'questions' => [
                                [
                                    'text' => 'Phương pháp STAR gồm những bước nào?',
                                    'options' => [
                                        'Situation, Task, Action, Result (Bối cảnh, Nhiệm vụ, Hành động, Kết quả)',
                                        'Strategy, Target, Ability, Reward (Chiến lược, Mục tiêu, Năng lực, Phần thưởng)',
                                        'Speaking, Timing, Attitude, Respect (Nói, Thời gian, Thái độ, Tôn trọng)',
                                        'Start, Talk, Ask, Repeat (Bắt đầu, Nói, Hỏi, Lặp lại)',
                                    ],
                                    'correct' => 0,
                                    'explanation' => 'STAR là chuẩn mực phỏng vấn hành vi: Situation, Task, Action, Result.',
                                ],
                            ],
                        ],
                    ],
                    [
                        'title' => 'Xử lý câu hỏi tình huống',
                        'type' => LessonType::Quiz,
                        'sort_order' => 3,
                        'pass_threshold' => 70,
                        'xp_reward' => 20,
                        'content_json' => [
                            'questions' => [
                                [
                                    'text' => 'Khi nhà tuyển dụng hỏi về điểm yếu của bạn, cách trả lời thông minh nhất là gì?',
                                    'options' => [
                                        'Tôi không có điểm yếu nào cả',
                                        'Tôi là người cầu toàn quá mức nên luôn làm việc hoàn hảo',
                                        'Nêu điểm yếu thật, nhưng tập trung vào giải pháp và tiến bộ bạn đang rèn luyện',
                                        'Nói rằng bạn ghét làm việc nhóm',
                                    ],
                                    'correct' => 2,
                                    'explanation' => 'Thừa nhận điểm yếu đi kèm kế hoạch khắc phục cụ thể thể hiện tinh thần cầu tiến và tính trung thực.',
                                ],
                            ],
                        ],
                    ],
                    [
                        'title' => 'Đặt câu hỏi cho nhà tuyển dụng',
                        'type' => LessonType::Writing,
                        'sort_order' => 4,
                        'pass_threshold' => 70,
                        'xp_reward' => 25,
                        'content_json' => [
                            'prompt' => 'Cuối buổi phỏng vấn, nhà tuyển dụng hỏi "Bạn có câu hỏi nào cho chúng tôi không?". Hãy viết 2 câu hỏi thể hiện sự quan tâm sâu sắc của bạn đến văn hóa công ty và lộ trình phát triển vị trí này.',
                            'rubric' => 'Đánh giá tính chuyên nghiệp, tránh hỏi về tiền lương ngay, tập trung vào đóng góp và văn hóa.',
                            'sample_answer' => '1. Anh/chị có thể chia sẻ về một dự án tiêu biểu mà nhóm đang triển khai và những thách thức lớn nhất mà vị trí này sẽ cần giải quyết trong 3 tháng đầu không ạ?\n2. Văn hóa làm việc và tinh thần học hỏi tại công ty được khuyến khích như thế nào trong các buổi chia sẻ nội bộ ạ?',
                        ],
                    ],
                ],
            ],
            [
                'title' => 'Tự tin bứt phá',
                'subtitle' => 'Thử thách cuối',
                'icon' => 'stars',
                'sort_order' => 7,
                'lessons' => [
                    [
                        'title' => 'Thực hành giao tiếp trong tình huống thực tế',
                        'type' => LessonType::Theory,
                        'sort_order' => 1,
                        'pass_threshold' => 0,
                        'xp_reward' => 15,
                        'content_json' => [
                            'markdown' => "## Chinh Phục Đỉnh Cao Kỹ Năng Mềm\n\nBạn đã đi qua chặng đường rèn luyện từ giao tiếp, lắng nghe đến phản hồi và thuyết trình.\n\n### Chìa khóa thành công lâu dài:\n- Luôn giữ tâm thế học hỏi (Growth mindset).\n- Thực hành kỹ năng mỗi ngày trong mọi cuộc trò chuyện.\n- Đón nhận phản hồi như món quà để nâng cấp bản thân.",
                            'images' => [],
                        ],
                    ],
                    [
                        'title' => 'Kết hợp kỹ năng thuyết trình và phản hồi',
                        'type' => LessonType::Quiz,
                        'sort_order' => 2,
                        'pass_threshold' => 70,
                        'xp_reward' => 20,
                        'content_json' => [
                            'questions' => [
                                [
                                    'text' => 'Tố chất quan trọng nhất của một người lãnh đạo truyền cảm hứng là gì?',
                                    'options' => [
                                        'Nói thật nhiều để lấn át người khác',
                                        'Khả năng lắng nghe chân thành và truyền đạt tầm nhìn rõ ràng',
                                        'Luôn ra lệnh và không chấp nhận phản biện',
                                        'Giữ bí mật mọi thông tin',
                                    ],
                                    'correct' => 1,
                                    'explanation' => 'Lãnh đạo truyền cảm hứng kết hợp giữa lắng nghe thấu cảm và giao tiếp thuyết phục.',
                                ],
                            ],
                        ],
                    ],
                    [
                        'title' => 'Tổng kết kế hoạch phát triển cá nhân',
                        'type' => LessonType::Writing,
                        'sort_order' => 3,
                        'pass_threshold' => 70,
                        'xp_reward' => 30,
                        'content_json' => [
                            'prompt' => 'Hãy viết bản cam kết hành động cá nhân (Action Plan) trong 30 ngày tới: Bạn sẽ áp dụng ít nhất 2 kỹ năng mềm nào đã học vào cuộc sống thực tế và đo lường kết quả ra sao?',
                            'rubric' => 'Đánh giá tính khả thi, cam kết hành động, tiêu chí đo lường rõ ràng.',
                            'sample_answer' => 'Trong 30 ngày tới, tôi cam kết: 1. Áp dụng kỹ thuật lắng nghe chủ động trong mọi cuộc họp nhóm, không ngắt lời đồng nghiệp. 2. Mỗi tuần chuẩn bị và thuyết trình 1 chủ đề ngắn 5 phút theo mô hình PREP. Tiêu chí đo lường là nhận được phản hồi tích cực từ ít nhất 3 thành viên trong nhóm.',
                        ],
                    ],
                ],
            ],
        ];

        foreach ($sectionsData as $sIndex => $sec) {
            $section = Section::updateOrCreate(
                [
                    'learning_path_id' => $path->id,
                    'title' => $sec['title'],
                ],
                [
                    'subtitle' => $sec['subtitle'],
                    'icon' => $sec['icon'],
                    'sort_order' => $sec['sort_order'],
                ]
            );

            foreach ($sec['lessons'] as $les) {
                Lesson::updateOrCreate(
                    [
                        'section_id' => $section->id,
                        'title' => $les['title'],
                    ],
                    [
                        'type' => $les['type'],
                        'sort_order' => $les['sort_order'],
                        'pass_threshold' => $les['pass_threshold'],
                        'xp_reward' => $les['xp_reward'],
                        'content_json' => $les['content_json'],
                    ]
                );
            }
        }
    }
}
