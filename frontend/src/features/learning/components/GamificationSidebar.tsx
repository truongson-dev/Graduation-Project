import React, { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { AppIcon as Icon, StreakFlameIcon } from '@/components/layout/AppIcon';
import { Progress } from '@/components/ui/progress';
import { useGamificationQuery } from '../api/useGamification';
import { CURRENT_TOURNAMENT } from '@/features/community/api/tournament';

function formatRefillTimer(milliseconds: number) {
  const totalSeconds = Math.max(0, Math.ceil(milliseconds / 1000));
  const hours = Math.floor(totalSeconds / 3600).toString().padStart(2, '0');
  const minutes = Math.floor((totalSeconds % 3600) / 60).toString().padStart(2, '0');
  const seconds = (totalSeconds % 60).toString().padStart(2, '0');
  return `${hours}:${minutes}:${seconds}`;
}

function HeartIcon({ active }: { active: boolean }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className={`h-4 w-4 ${active ? 'text-rose-500 fill-rose-500' : 'text-slate-300'}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
    </svg>
  );
}

export const GamificationSidebar: React.FC = () => {
  const { data: gamification } = useGamificationQuery();
  const [currentTime, setCurrentTime] = useState(Date.now());

  const livesCount = gamification?.lives_count ?? 5;
  const livesMax = gamification?.lives_max ?? 5;
  const refillAtTime = gamification?.lives_refill_at
    ? new Date(gamification.lives_refill_at).getTime()
    : null;

  useEffect(() => {
    if (livesCount > 0 || !refillAtTime) return;
    const intervalId = window.setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);
    return () => window.clearInterval(intervalId);
  }, [livesCount, refillAtTime]);

  const remainingRefillMs = refillAtTime ? Math.max(0, refillAtTime - currentTime) : 0;

  return (
    <aside className="space-y-4 xl:sticky xl:top-6">
      {/* Top 3 Quick Badges: Streak, XP, Lives */}
      <div className="grid grid-cols-3 gap-2">
        <div
          aria-label={`Chuỗi ${gamification?.current_streak ?? 0} ngày`}
          className="flex items-center justify-center gap-1.5 rounded-xl border border-orange-100 bg-white px-2 py-3 shadow-sm"
        >
          <StreakFlameIcon className="text-xl" />
          <span className="text-xs font-extrabold text-slate-700">
            {gamification?.current_streak ?? 0} ngày
          </span>
        </div>

        <div
          aria-label={`${gamification?.total_xp?.toLocaleString() ?? 0} XP`}
          className="flex items-center justify-center gap-1.5 rounded-xl border border-blue-100 bg-white px-2 py-3 shadow-sm"
        >
          <Icon name="bolt" className="text-xl text-blue-500" />
          <span className="text-xs font-extrabold text-slate-700">
            {gamification?.total_xp?.toLocaleString() ?? 0} XP
          </span>
        </div>

        <div
          aria-label={`${livesCount} tim`}
          className="flex flex-col items-center justify-center rounded-xl border border-rose-100 bg-white px-2 py-2 shadow-sm"
        >
          <div className="flex items-center gap-1">
            <HeartIcon active={livesCount > 0} />
            <span className="text-xs font-extrabold text-slate-700 tabular-nums">
              {livesCount}/{livesMax}
            </span>
          </div>
          {livesCount === 0 && refillAtTime && remainingRefillMs > 0 && (
            <span className="mt-0.5 text-[9px] font-semibold tabular-nums text-rose-600">
              {formatRefillTimer(remainingRefillMs)}
            </span>
          )}
        </div>
      </div>

      {/* Tournament Card */}
      <section className="min-h-[150px] rounded-[20px] border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-extrabold text-slate-700">
            Giải đấu {gamification?.tournament_tier || CURRENT_TOURNAMENT.tier}
          </h2>
          <Link to="/achievements" className="text-[10px] font-extrabold text-sky-600 hover:text-sky-800">
            XEM GIẢI ĐẤU
          </Link>
        </div>
        <div className="mt-4 flex items-center gap-3">
          <span
            role="img"
            aria-label={`Huy hiệu ${gamification?.tournament_tier || CURRENT_TOURNAMENT.tier}`}
            className="h-14 w-14 shrink-0 bg-no-repeat"
            style={{
              backgroundImage: "url('/achievement-tiers.png')",
              backgroundSize: '500% 200%',
              backgroundPosition: `${CURRENT_TOURNAMENT.tierColumn * 25}% ${CURRENT_TOURNAMENT.tierRow * 100}%`,
            }}
          />
          <div>
            <p className="text-xs font-bold text-slate-700">
              Vị trí hạng: {gamification?.tournament_rank ?? 9}
            </p>
            <p className="mt-1 text-xs text-slate-500">Cách nhóm thăng hạng 2 bậc!</p>
          </div>
        </div>
      </section>

      {/* Daily Quests */}
      <section className="rounded-[20px] border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-extrabold text-slate-700">Nhiệm vụ hằng ngày</h2>
          <button type="button" className="text-[10px] font-extrabold text-sky-600 hover:text-sky-800">
            XEM TẤT CẢ
          </button>
        </div>
        <div className="mt-4 space-y-5">
          {[
            { icon: 'bolt', title: 'Kiếm 20 KN hôm nay', value: Math.min(20, (gamification?.total_xp ?? 0) % 50), total: 20, tone: 'text-amber-500' },
            { icon: 'task_alt', title: 'Hoàn thành ít nhất 1 bài học', value: (gamification?.current_streak ?? 0) > 0 ? 1 : 0, total: 1, tone: 'text-emerald-500' },
            { icon: 'mic', title: 'Thực hành kỹ năng nói & viết', value: 1, total: 2, tone: 'text-sky-500' },
          ].map((task) => (
            <div key={task.title} className="flex items-center gap-3">
              <Icon name={task.icon} className={`shrink-0 text-2xl ${task.tone}`} />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold leading-snug text-slate-700">{task.title}</p>
                <div className="mt-2 flex items-center gap-2">
                  <Progress value={Math.min(100, (task.value / task.total) * 100)} className="flex-1 h-2.5" />
                  <span className="shrink-0 text-[10px] font-bold text-slate-500">
                    {task.value}/{task.total}
                  </span>
                </div>
              </div>
              <Icon name="redeem" className="shrink-0 text-xl text-amber-600" />
            </div>
          ))}
        </div>
      </section>
    </aside>
  );
};
