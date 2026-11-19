import { CommunityAuthorAvatar } from './CommunityAuthorAvatar';
import type { CommunityAuthor } from '../types/community';

interface TrendingQuickComposerProps {
  currentUser: CommunityAuthor | null;
  keyword: string;
  onClick: () => void;
}

export function TrendingQuickComposer({
  currentUser,
  keyword,
  onClick,
}: TrendingQuickComposerProps) {
  const promptText = keyword ? `Bài viết về ${keyword}...` : 'Bắt đầu một chuỗi thảo luận mới...';

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3.5 text-left shadow-2xs transition-colors hover:bg-slate-50/80 cursor-pointer"
    >
      <CommunityAuthorAvatar author={currentUser} size="sm" />
      <span className="flex-1 text-xs text-slate-400 select-none">{promptText}</span>
    </button>
  );
}
