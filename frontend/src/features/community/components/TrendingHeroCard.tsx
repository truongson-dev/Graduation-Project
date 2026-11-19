import { formatTrendingPostsCount } from './TrendingWidget';
import type { CommunityTrendingItem } from '../types/community';

interface TrendingHeroCardProps {
  trend: CommunityTrendingItem;
}

export function TrendingHeroCard({ trend }: TrendingHeroCardProps) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs">
      <div className="flex flex-wrap items-baseline gap-2">
        <span className="inline-flex items-center rounded-md bg-amber-400 px-2 py-0.5 text-xs font-black tracking-tight text-brand-950">
          Thịnh hành
        </span>
        <span className="text-sm font-semibold leading-relaxed text-slate-800">
          {trend.summary}
        </span>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
        <span className="font-semibold text-slate-700">
          {formatTrendingPostsCount(trend.posts_count)}
        </span>
        <span>·</span>
        <span>Những chủ đề đang được bàn luận nhiều nhất</span>
        <span className="text-slate-400">›</span>
      </div>
    </div>
  );
}
