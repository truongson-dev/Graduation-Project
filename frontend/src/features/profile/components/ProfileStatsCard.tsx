import React from 'react';
import { Clock, Mic, Trophy } from 'lucide-react';
import type { ProfileStats } from '../types/profile';

export interface ProfileStatsCardProps {
  stats: ProfileStats;
}

export const ProfileStatsCard: React.FC<ProfileStatsCardProps> = ({ stats }) => {
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs">
      <h2 className="text-base font-bold text-slate-900 mb-4">
        Thống kê luyện tập
      </h2>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Metric 1: Average Score */}
        <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4 flex items-center gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600 border border-amber-200/60">
            <Trophy className="size-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500">Điểm trung bình</p>
            <p className="text-xl font-bold text-slate-900 tracking-tight">
              {stats.average_score} / 10
            </p>
          </div>
        </div>

        {/* Metric 2: Sessions count */}
        <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4 flex items-center gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 border border-blue-200/60">
            <Mic className="size-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500">Bài thuyết trình</p>
            <p className="text-xl font-bold text-slate-900 tracking-tight">
              {stats.presentation_count} bài
            </p>
          </div>
        </div>

        {/* Metric 3: Practice duration */}
        <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4 flex items-center gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200/60">
            <Clock className="size-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500">
              Thời lượng luyện tập
            </p>
            <p className="text-xl font-bold text-slate-900 tracking-tight">
              {stats.practice_duration_minutes} phút
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
