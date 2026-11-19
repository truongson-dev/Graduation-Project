<?php

namespace App\Services\Learning;

use App\Models\User;
use App\Models\UserDailyStreak;
use App\Models\UserGamification;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class GamificationService
{
    public const MAX_LIVES = 5;

    /**
     * Get or create the user's gamification profile, checking lazy life refills.
     */
    public function getGamification(User $user): UserGamification
    {
        $gamification = UserGamification::firstOrCreate(
            ['user_id' => $user->id],
            [
                'total_xp' => 0,
                'current_streak' => 0,
                'longest_streak' => 0,
                'lives_count' => self::MAX_LIVES,
                'tournament_tier' => 'Đồng',
            ]
        );

        $this->checkAndRefillLives($gamification);

        return $gamification;
    }

    /**
     * Check if 24 hours have passed to refill lives to max.
     */
    public function checkAndRefillLives(UserGamification $gamification): void
    {
        if ($gamification->lives_count === 0 && $gamification->lives_refill_at !== null) {
            if (now()->greaterThanOrEqualTo($gamification->lives_refill_at)) {
                $gamification->update([
                    'lives_count' => self::MAX_LIVES,
                    'lives_refill_at' => null,
                ]);
            }
        }
    }

    /**
     * Consume one life when an attempt fails. Returns updated gamification.
     */
    public function consumeLife(User $user): UserGamification
    {
        $gamification = $this->getGamification($user);

        if ($gamification->lives_count > 0) {
            $newCount = $gamification->lives_count - 1;
            $refillAt = $newCount === 0 ? now()->addHours(24) : null;

            $gamification->update([
                'lives_count' => $newCount,
                'lives_refill_at' => $refillAt,
            ]);
        }

        return $gamification;
    }

    /**
     * Award XP to user and log it for today's daily streak.
     */
    public function awardXp(User $user, int $amount): void
    {
        if ($amount <= 0) {
            return;
        }

        $gamification = $this->getGamification($user);
        $gamification->increment('total_xp', $amount);

        $today = now()->toDateString();
        $streak = UserDailyStreak::firstOrCreate(
            ['user_id' => $user->id, 'date' => $today],
            ['xp_earned' => 0, 'lessons_completed' => 0]
        );

        $streak->increment('xp_earned', $amount);
    }

    /**
     * Record a completed lesson for today and recalculate streak.
     */
    public function recordActivity(User $user): void
    {
        $today = now()->toDateString();
        $streak = UserDailyStreak::firstOrCreate(
            ['user_id' => $user->id, 'date' => $today],
            ['xp_earned' => 0, 'lessons_completed' => 0]
        );

        $streak->increment('lessons_completed');

        // Recalculate streak
        $this->recalculateStreak($user);
    }

    /**
     * Recalculate consecutive days streak backwards from today.
     */
    public function recalculateStreak(User $user): int
    {
        $activityDates = UserDailyStreak::where('user_id', $user->id)
            ->where('lessons_completed', '>', 0)
            ->orderByDesc('date')
            ->pluck('date')
            ->map(fn ($d) => Carbon::parse($d)->toDateString())
            ->flip()
            ->all();

        $currentStreak = 0;
        $checkDate = Carbon::today();

        // If no activity today, check if yesterday had activity (so streak hasn't broken yet)
        if (! isset($activityDates[$checkDate->toDateString()])) {
            $checkDate->subDay();
        }

        while (isset($activityDates[$checkDate->toDateString()])) {
            $currentStreak++;
            $checkDate->subDay();
        }

        $gamification = $this->getGamification($user);
        $longest = max($gamification->longest_streak, $currentStreak);

        $gamification->update([
            'current_streak' => $currentStreak,
            'longest_streak' => $longest,
        ]);

        return $currentStreak;
    }

    /**
     * Get weekly leaderboard based on XP earned this week.
     *
     * @return array<string, mixed>
     */
    public function getWeeklyLeaderboard(User $user): array
    {
        $gamification = $this->getGamification($user);
        $weekStart = now()->startOfWeek()->toDateString();

        $rankings = UserDailyStreak::select('user_id', DB::raw('SUM(xp_earned) as total_xp'))
            ->where('date', '>=', $weekStart)
            ->groupBy('user_id')
            ->orderByDesc('total_xp')
            ->limit(20)
            ->with('user')
            ->get()
            ->map(function ($row, $index) {
                return [
                    'rank' => $index + 1,
                    'user_id' => $row->user_id,
                    'user_name' => $row->user->name ?? 'Người dùng',
                    'avatar_url' => $row->user->avatar_url ?? null,
                    'xp_this_week' => (int) $row->total_xp,
                ];
            });

        $userWeeklyXp = (int) UserDailyStreak::where('user_id', $user->id)
            ->where('date', '>=', $weekStart)
            ->sum('xp_earned');

        $userRank = 1;
        $usersAhead = UserDailyStreak::select('user_id')
            ->where('date', '>=', $weekStart)
            ->groupBy('user_id')
            ->havingRaw('SUM(xp_earned) > ?', [$userWeeklyXp])
            ->get();
        $userRank += $usersAhead->count();

        return [
            'tier' => $gamification->tournament_tier,
            'week_start' => $weekStart,
            'rankings' => $rankings->all(),
            'user_rank' => $userRank,
            'user_xp_this_week' => $userWeeklyXp,
        ];
    }

    /**
     * Get streak data for the current week.
     *
     * @return array<string, mixed>
     */
    public function getStreakData(User $user): array
    {
        $gamification = $this->getGamification($user);
        $startOfWeek = now()->startOfWeek();
        $todayStr = now()->toDateString();

        $streaksThisWeek = UserDailyStreak::where('user_id', $user->id)
            ->where('date', '>=', $startOfWeek->toDateString())
            ->get()
            ->keyBy(fn ($item) => Carbon::parse($item->date)->toDateString());

        $days = [];
        $dayLabels = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

        for ($i = 0; $i < 7; $i++) {
            $date = $startOfWeek->copy()->addDays($i);
            $dStr = $date->toDateString();
            $record = $streaksThisWeek->get($dStr);

            $days[] = [
                'day' => $dayLabels[$i],
                'date' => $dStr,
                'completed' => $record ? ($record->lessons_completed > 0) : false,
                'xp' => $record ? (int) $record->xp_earned : 0,
            ];
        }

        return [
            'current_streak' => $gamification->current_streak,
            'longest_streak' => $gamification->longest_streak,
            'this_week' => $days,
            'completed_today' => isset($streaksThisWeek[$todayStr]) && $streaksThisWeek[$todayStr]->lessons_completed > 0,
        ];
    }
}
