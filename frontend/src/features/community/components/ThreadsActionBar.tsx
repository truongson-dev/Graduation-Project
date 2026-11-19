import { useEffect, useRef, useState } from 'react';
import { Heart, MessageCircle, Repeat2, Send } from 'lucide-react';
import { cn } from '@/core/utils/cn';
import {
  useToggleReactionMutation,
  useToggleRepostMutation,
} from '../api/useCommunityMutations';

function formatThreadsCount(count: number): string | null {
  if (count <= 0) {
    return null;
  }
  if (count >= 1000) {
    const thousands = (count / 1000).toFixed(1).replace(/\.0$/, '').replace('.', ',');
    return `${thousands}K`;
  }
  return String(count);
}

export interface ThreadsActionBarProps {
  postId: number;
  likesCount: number;
  repliesCount: number;
  repostsCount: number;
  quotesCount: number;
  liked: boolean;
  reposted: boolean;
  isReplyDisabled?: boolean;
  isRepostDisabled?: boolean;
  replyAriaLabel?: string;
  compact?: boolean;
  onReplyClick: () => void;
}

/** Shared Threads-inspired 4-action toolbar (Like, Reply, Repost, Share). */
export function ThreadsActionBar({
  postId,
  likesCount,
  repliesCount,
  repostsCount,
  quotesCount,
  liked,
  reposted,
  isReplyDisabled = false,
  isRepostDisabled = false,
  replyAriaLabel = 'Trả lời bài viết',
  compact = false,
  onReplyClick,
}: ThreadsActionBarProps) {
  const [copiedShare, setCopiedShare] = useState(false);
  const shareTimerRef = useRef<number | null>(null);
  const toggleReaction = useToggleReactionMutation();
  const toggleRepost = useToggleRepostMutation();

  useEffect(() => {
    return () => {
      if (shareTimerRef.current !== null) {
        window.clearTimeout(shareTimerRef.current);
      }
    };
  }, []);

  const handleShare = () => {
    const shareUrl =
      typeof window !== 'undefined'
        ? `${window.location.origin}/community#post-${postId}`
        : `/community#post-${postId}`;
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      void navigator.clipboard.writeText(shareUrl).catch(() => {});
    }
    setCopiedShare(true);
    if (shareTimerRef.current !== null) {
      window.clearTimeout(shareTimerRef.current);
    }
    shareTimerRef.current = window.setTimeout(() => setCopiedShare(false), 1800);
  };

  const formattedLikes = formatThreadsCount(likesCount);
  const formattedReplies = formatThreadsCount(repliesCount);
  const formattedReposts = formatThreadsCount(repostsCount);
  const formattedQuotes = formatThreadsCount(quotesCount);

  const btnClass = compact
    ? 'inline-flex h-7 items-center gap-1 rounded-full px-1.5 text-xs font-medium transition-colors'
    : 'inline-flex h-8 items-center gap-1.5 rounded-full px-2 text-[13px] font-medium transition-colors';
  const iconClass = compact ? 'h-4 w-4' : 'h-[18px] w-[18px]';
  const repostIconClass = compact ? 'h-[17px] w-[17px]' : 'h-[19px] w-[19px]';
  const sendIconClass = compact ? 'h-[15px] w-[15px]' : 'h-[17px] w-[17px]';

  return (
    <div
      className={cn(
        'flex items-center',
        compact ? 'mt-1 -ml-1.5 gap-0.5' : 'mt-2.5 -ml-2 gap-0.5 sm:gap-1.5',
      )}
    >
      <button
        type="button"
        onClick={() => toggleReaction.mutate({ postId, type: 'like' })}
        aria-pressed={liked}
        aria-label="Thích bài viết"
        className={cn(
          btnClass,
          'cursor-pointer',
          liked
            ? 'text-rose-600 hover:bg-rose-50/70'
            : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
        )}
      >
        <Heart
          strokeWidth={1.85}
          className={cn(
            iconClass,
            'transition-transform',
            liked && 'fill-rose-500 text-rose-500 scale-105',
          )}
        />
        {formattedLikes && <span className="tabular-nums">{formattedLikes}</span>}
      </button>

      <button
        type="button"
        disabled={isReplyDisabled}
        onClick={onReplyClick}
        aria-label={replyAriaLabel}
        className={cn(
          btnClass,
          isReplyDisabled
            ? 'cursor-not-allowed text-slate-300'
            : 'cursor-pointer text-slate-600 hover:bg-slate-100 hover:text-slate-900',
        )}
      >
        <MessageCircle strokeWidth={1.85} className={iconClass} />
        {formattedReplies && <span className="tabular-nums">{formattedReplies}</span>}
      </button>

      <button
        type="button"
        disabled={isRepostDisabled}
        onClick={() => toggleRepost.mutate(postId)}
        aria-pressed={reposted}
        aria-label="Đăng lại bài viết"
        title={isRepostDisabled ? 'Chỉ hỗ trợ đăng lại bài viết gốc' : undefined}
        className={cn(
          btnClass,
          isRepostDisabled
            ? 'cursor-not-allowed text-slate-300'
            : reposted
              ? 'cursor-pointer text-teal-brand hover:bg-emerald-50/70'
              : 'cursor-pointer text-slate-600 hover:bg-slate-100 hover:text-slate-900',
        )}
      >
        <Repeat2 strokeWidth={1.85} className={repostIconClass} />
        {formattedReposts && <span className="tabular-nums">{formattedReposts}</span>}
      </button>

      <button
        type="button"
        onClick={handleShare}
        aria-label="Chia sẻ bài viết"
        title={copiedShare ? 'Đã sao chép liên kết' : 'Sao chép liên kết'}
        className={cn(
          btnClass,
          'cursor-pointer',
          copiedShare
            ? 'bg-brand-50/70 text-brand-800'
            : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
        )}
      >
        <Send strokeWidth={1.85} className={sendIconClass} />
        {copiedShare ? (
          <span className="text-[11px] font-semibold">Đã chép</span>
        ) : (
          formattedQuotes && <span className="tabular-nums">{formattedQuotes}</span>
        )}
      </button>
    </div>
  );
}
