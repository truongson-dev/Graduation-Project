import { useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/core/utils/cn';
import type { CommunityTrendingItem } from '../types/community';

export function formatTrendingPostsCount(count: number): string {
  if (count >= 1_000_000) {
    const millions = (count / 1_000_000).toFixed(1).replace(/\.0$/, '').replace('.', ',');
    return `${millions} triệu bài viết`;
  }
  if (count >= 1000) {
    const thousands = (count / 1000).toFixed(1).replace(/\.0$/, '').replace('.', ',');
    return `${thousands}K bài viết`;
  }
  return `${count} bài viết`;
}

interface TrendingWidgetProps {
  items: CommunityTrendingItem[];
  isLoading?: boolean;
  activeTrendId?: string | null;
  onSelectTrend: (item: CommunityTrendingItem) => void;
}

const DEFAULT_VISIBLE_COUNT = 3;

export function TrendingWidget({
  items,
  isLoading = false,
  activeTrendId = null,
  onSelectTrend,
}: TrendingWidgetProps) {
  const [expanded, setExpanded] = useState(false);

  const visibleItems = expanded ? items : items.slice(0, DEFAULT_VISIBLE_COUNT);
  const canExpand = items.length > DEFAULT_VISIBLE_COUNT;

  return (
    <section
      aria-label="Đang thịnh hành"
      className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs"
    >
      <div>
        <h2 className="text-sm font-extrabold text-brand-950">Đang thịnh hành</h2>
        <p className="mt-0.5 text-[11px] leading-snug text-slate-500">
          Những chủ đề đang được bàn luận nhiều nhất
        </p>
      </div>

      {isLoading ? (
        <div className="mt-4 space-y-4">
          {[1, 2, 3].map((idx) => (
            <div key={idx} className="space-y-1.5">
              <Skeleton className="h-3.5 w-4/5" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-5 w-24 rounded-full" />
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <p className="mt-4 text-xs text-slate-400">
          Chưa có đủ bài viết để tổng hợp xu hướng.
        </p>
      ) : (
        <>
          <div className="mt-3.5 space-y-1.5">
            {visibleItems.map((item) => {
              const isSelected = activeTrendId === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => onSelectTrend(item)}
                  className={cn(
                    '-mx-2 block w-[calc(100%+1rem)] rounded-xl p-2 text-left transition-colors cursor-pointer',
                    isSelected ? 'bg-brand-50/80 ring-1 ring-brand-200' : 'hover:bg-slate-50',
                  )}
                >
                  <p className="line-clamp-1 text-[13px] font-bold text-slate-900">
                    {item.title}
                  </p>
                  <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-slate-500">
                    {item.summary}
                  </p>
                  <span className="mt-2 inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-medium tabular-nums text-slate-600">
                    {formatTrendingPostsCount(item.posts_count)}
                  </span>
                </button>
              );
            })}
          </div>

          {canExpand && (
            <button
              type="button"
              onClick={() => setExpanded((prev) => !prev)}
              className="mt-3 text-xs font-semibold text-slate-500 transition-colors hover:text-brand-900 cursor-pointer"
            >
              {expanded ? 'Thu gọn' : 'Hiển thị thêm'}
            </button>
          )}
        </>
      )}
    </section>
  );
}
