<?php

namespace App\Services\Learning;

use App\Ai\Agents\AnswerGrader;
use App\Enums\LessonProgressStatus;
use App\Enums\LessonType;
use App\Models\Lesson;
use App\Models\User;
use App\Models\UserLessonAttempt;
use App\Models\UserLessonProgress;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\HttpException;

class LessonAttemptService
{
    public function __construct(
        protected ProgressService $progressService,
        protected GamificationService $gamificationService,
    ) {}

    /**
     * Submit an attempt for a lesson and calculate score/feedback.
     *
     * @param  array<string, mixed>  $input
     * @return array<string, mixed>
     */
    public function submit(User $user, Lesson $lesson, array $input): array
    {
        $gamification = $this->gamificationService->getGamification($user);

        // 1. Check if user has lives
        if ($gamification->lives_count <= 0) {
            throw ValidationException::withMessages([
                'lives' => ['Bạn đã hết tim. Vui lòng đợi thời gian hồi phục hoặc quay lại sau.'],
            ]);
        }

        // 2. Check if lesson is unlocked
        $progress = UserLessonProgress::firstOrCreate(
            ['user_id' => $user->id, 'lesson_id' => $lesson->id],
            ['status' => LessonProgressStatus::Locked]
        );

        if ($progress->status === LessonProgressStatus::Locked) {
            abort(403, 'Bài học này đang bị khóa. Bạn cần hoàn thành các bài học trước.');
        }

        $results = null;
        $aiFeedback = null;
        $score = 0;
        $passed = false;

        // 3. Grade by lesson type
        switch ($lesson->type) {
            case LessonType::Theory:
                $score = 100;
                $passed = true;
                break;

            case LessonType::Quiz:
                $questions = $lesson->content_json['questions'] ?? [];
                $submittedAnswers = $input['answers'] ?? [];
                $totalQuestions = count($questions);
                $correctCount = 0;
                $results = [];

                foreach ($questions as $index => $q) {
                    $correctIndex = $q['correct'] ?? 0;
                    $userAnswer = $submittedAnswers[$index] ?? null;
                    $isCorrect = ($userAnswer === $correctIndex);

                    if ($isCorrect) {
                        $correctCount++;
                    }

                    $results[] = [
                        'question_index' => $index,
                        'correct' => $isCorrect,
                        'correct_answer' => $correctIndex,
                        'explanation' => $q['explanation'] ?? '',
                    ];
                }

                $score = $totalQuestions > 0 ? (int) round(($correctCount / $totalQuestions) * 100) : 0;
                $passed = $score >= $lesson->pass_threshold;
                break;

            case LessonType::Writing:
                $provider = (string) config('ai.default', 'gemini');
                $apiKey = config("ai.providers.{$provider}.key");

                if (blank($apiKey)) {
                    throw new HttpException(503, 'Trợ lý AI chưa được cấu hình. Vui lòng liên hệ quản trị viên.');
                }

                $content = (string) ($input['content'] ?? '');
                $skill = $lesson->section?->title ?? 'Kỹ năng mềm';
                $promptQuestion = $lesson->content_json['prompt'] ?? $lesson->title;
                $rubric = $lesson->content_json['rubric'] ?? null;

                $grader = new AnswerGrader(
                    skill: $skill,
                    question: $promptQuestion,
                    answer: $content,
                    context: $rubric
                );

                $sections = [
                    'KỸ NĂNG: '.$skill,
                    "CÂU HỎI / TÌNH HUỐNG:\n<<<\n".$promptQuestion."\n>>>",
                ];
                if ($rubric !== null) {
                    $sections[] = "TIÊU CHÍ CHẤM ĐIỂM:\n<<<\n".$rubric."\n>>>";
                }
                $sections[] = "CÂU TRẢ LỜI CỦA NGƯỜI HỌC:\n<<<\n".$content."\n>>>";
                $promptText = implode("\n\n", $sections);

                $response = $grader->prompt($promptText);
                $gradeData = $response->structured;

                $score = isset($gradeData['score']) ? (int) $gradeData['score'] : 0;
                $passed = $score >= $lesson->pass_threshold;
                $aiFeedback = [
                    'summary' => $gradeData['summary'] ?? '',
                    'strengths' => $gradeData['strengths'] ?? [],
                    'improvements' => $gradeData['improvements'] ?? [],
                ];
                break;
        }

        // 4. Save attempt record
        $attemptCount = UserLessonAttempt::where('user_id', $user->id)
            ->where('lesson_id', $lesson->id)
            ->count();

        $attempt = UserLessonAttempt::create([
            'user_id' => $user->id,
            'lesson_id' => $lesson->id,
            'attempt_number' => $attemptCount + 1,
            'answers_json' => $input,
            'score' => $score,
            'ai_feedback' => $aiFeedback,
            'passed' => $passed,
        ]);

        $nextLesson = null;
        $xpEarned = 0;
        $alreadyPassed = ($progress->status === LessonProgressStatus::Passed);

        // 5. Update progress & gamification
        if ($passed) {
            $progress->status = LessonProgressStatus::Passed;
            $progress->completed_at = now();
            $progress->best_score = max($progress->best_score ?? 0, $score);

            if (! $alreadyPassed) {
                $xpEarned = $lesson->xp_reward;
                $progress->xp_earned = $xpEarned;
                $this->gamificationService->awardXp($user, $xpEarned);
            }

            $progress->save();
            $next = $this->progressService->unlockNext($user, $lesson);
            if ($next) {
                $nextLesson = [
                    'id' => $next->id,
                    'title' => $next->title,
                ];
            }
            $this->gamificationService->recordActivity($user);
        } else {
            if (! $alreadyPassed) {
                $progress->status = LessonProgressStatus::Failed;
            }
            $progress->best_score = max($progress->best_score ?? 0, $score);
            $progress->save();

            // Consume 1 life on failure
            $this->gamificationService->consumeLife($user);
        }

        return [
            'attempt_id' => $attempt->id,
            'score' => $score,
            'passed' => $passed,
            'xp_earned' => $xpEarned,
            'results' => $results,
            'ai_feedback' => $aiFeedback,
            'next_lesson' => $nextLesson,
        ];
    }
}
