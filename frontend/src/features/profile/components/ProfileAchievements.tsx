import React from 'react';
import { Link } from 'react-router';
import { Award, ChevronRight } from 'lucide-react';
import { AppIcon } from '@/components/layout/AppIcon';
import type { ProfileAchievement } from '../types/profile';

export interface ProfileAchievementsProps {
  achievements: ProfileAchievement[];
}

export const ProfileAchievements: React.FC<ProfileAchievementsProps> = ({
  achievements,
}) => {
  const formatDate = (isoString?: string | null) => {
    if (!isoString) return null;
    try {
      return new Date(isoString).toLocaleDateString('vi-VN');
    } catch {
      return null;
    }
  };

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Award className="size-5 text-amber-500" />
          <h2 className="text-base font-bold text-slate-900">
            Huy hiệu & Thành tựu
          </h2>
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
            {achievements.length}
          </span>
        </div>

        <Link
          to="/achievements"
          className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700 transition"
        >
          <span>Xem tất cả</span>
          <ChevronRight className="size-3.5" />
        </Link>
      </div>

      {achievements.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {achievements.map((item) => {
            const dateStr = formatDate(item.unlocked_at);
            return (
              <div
                key={item.id}
                className="group relative flex flex-col items-center rounded-xl border border-slate-100 bg-slate-50/70 p-4 text-center transition hover:border-amber-200 hover:bg-amber-50/30"
              >
                <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-xl bg-white shadow-xs text-amber-500 ring-1 ring-slate-200/60 group-hover:scale-105 transition-transform">
                  <AppIcon name={item.icon} className="size-6 text-amber-500" />
                </div>
                <h3 className="text-xs font-bold text-slate-800 line-clamp-1">
                  {item.name}
                </h3>
                {dateStr && (
                  <p className="mt-1 text-[11px] text-slate-400">
                    Đạt được: {dateStr}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400 mb-3">
            <Award className="size-6" />
          </div>
          <p className="text-sm font-medium text-slate-600">
            Chưa có huy hiệu nào
          </p>
          <p className="text-xs text-slate-400 mt-1">
            Hãy tích cực luyện tập thuyết trình để mở khóa các danh hiệu!
          </p>
        </div>
      )}
    </div>
  );
};
