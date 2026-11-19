import { cn } from '@/core/utils/cn';
import type { CommunityTopicTag } from '../types/community';

interface TopicPillBarProps {
  topics: CommunityTopicTag[];
  selectedSlug: string | null;
  onSelect: (slug: string | null) => void;
  isLoading?: boolean;
}

export function TopicPillBar({
  topics,
  selectedSlug,
  onSelect,
  isLoading = false,
}: TopicPillBarProps) {
  if (isLoading) {
    return (
      <div className="flex gap-2 overflow-x-auto pb-1">
        {[1, 2, 3, 4].map((idx) => (
          <div
            key={idx}
            className="h-8 w-28 shrink-0 animate-pulse rounded-full bg-slate-100"
          />
        ))}
      </div>
    );
  }

  if (topics.length === 0) {
    return null;
  }

  return (
    <div
      role="tablist"
      aria-label="Lọc theo chủ đề"
      className="flex items-center gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      <button
        type="button"
        role="tab"
        aria-selected={selectedSlug === null}
        onClick={() => onSelect(null)}
        className={cn(
          'shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors cursor-pointer',
          selectedSlug === null
            ? 'border-brand-900 bg-brand-900 text-white shadow-xs'
            : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50',
        )}
      >
        Tất cả chủ đề
      </button>

      {topics.map((topic) => {
        const active = selectedSlug === topic.slug;
        return (
          <button
            key={topic.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onSelect(active ? null : topic.slug)}
            className={cn(
              'inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors cursor-pointer',
              active
                ? 'border-brand-900 bg-brand-900 text-white shadow-xs'
                : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50',
            )}
          >
            <span>{topic.name}</span>
            {topic.posts_count > 0 && (
              <span
                className={cn(
                  'rounded-full px-1.5 py-0.5 text-[10px] font-bold',
                  active ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500',
                )}
              >
                {topic.posts_count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
