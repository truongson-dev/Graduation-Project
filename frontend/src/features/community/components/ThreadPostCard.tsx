import { memo, useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import {
  Bookmark,
  Eye,
  EyeOff,
  Lock,
  MoreHorizontal,
  Repeat2,
  Send,
  Trash2,
  UserPlus,
} from 'lucide-react';
import { cn } from '@/core/utils/cn';
import { getApiError } from '@/core/api/client';
import { useMe } from '@/features/auth/api/auth';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { CommunityAuthorAvatar } from './CommunityAuthorAvatar';
import { PollWidget } from './PollWidget';
import { ThreadsActionBar } from './ThreadsActionBar';
import {
  useCreateReplyMutation,
  useDeletePostMutation,
  useHideReplyMutation,
  useToggleFollowMutation,
  useToggleReactionMutation,
} from '../api/useCommunityMutations';
import type { CommunityPost, ReplyControl } from '../types/community';

function formatRelativeTime(isoString: string | null): string {
  if (!isoString) {
    return '';
  }
  const ts = Date.parse(isoString);
  if (!Number.isFinite(ts)) {
    return '';
  }
  const diffSec = Math.max(0, Math.floor((Date.now() - ts) / 1000));
  if (diffSec < 60) {
    return 'vừa xong';
  }
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) {
    return `${diffMin} phút trước`;
  }
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) {
    return `${diffHours} giờ trước`;
  }
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 30) {
    return `${diffDays} ngày trước`;
  }
  return new Date(ts).toLocaleDateString('vi-VN');
}

const REPLY_CONTROL_LABEL: Partial<Record<ReplyControl, string>> = {
  followers: 'Chỉ người theo dõi được trả lời',
  following: 'Chỉ người tác giả theo dõi',
  mentioned_only: 'Chỉ tài khoản được nhắc tên',
  locked: 'Đã khóa bình luận',
};

interface ThreadPostCardProps {
  post: CommunityPost;
  /** Render as part of a vertical connected thread chain */
  connectTop?: boolean;
  connectBottom?: boolean;
  /** True if rendered inside the root detail view so we don't duplicate self_thread_items */
  disableSelfThreadExpansion?: boolean;
  /** True if the current viewer owns the conversation root and can hide/unhide replies */
  canModerateReplies?: boolean;
  /** Highlight focal post in thread detail */
  isFocal?: boolean;
  /** Show compact styling inside tree replies */
  compact?: boolean;
  onReplyClick?: (post: CommunityPost) => void;
  onDeleted?: (postId: number) => void;
}

export const ThreadPostCard = memo(function ThreadPostCard({
  post,
  connectTop = false,
  connectBottom = false,
  disableSelfThreadExpansion = false,
  canModerateReplies = false,
  isFocal = false,
  compact = false,
  onReplyClick,
  onDeleted,
}: ThreadPostCardProps) {
  const { data: currentUser } = useMe();
  const [replyOpen, setReplyOpen] = useState(false);
  const [replyDraft, setReplyDraft] = useState('');
  const [replyError, setReplyError] = useState<string | null>(null);

  const toggleReaction = useToggleReactionMutation();
  const toggleFollow = useToggleFollowMutation();
  const deletePost = useDeletePostMutation();
  const hideReply = useHideReplyMutation();
  const createReply = useCreateReplyMutation();

  const isPureRepost = post.repost_of !== null;
  const displayPost = post.repost_of ?? post;
  const selfThreadItems = disableSelfThreadExpansion ? [] : displayPost.self_thread_items;
  const hasSelfThread = selfThreadItems.length > 0;
  const effectiveConnectBottom = connectBottom || hasSelfThread;

  const isOwner = currentUser?.id === displayPost.author?.id;
  const isDeleted = displayPost.status === 'deleted';
  const isHidden = displayPost.is_hidden_by_author;
  const isFollowing = Boolean(displayPost.viewer.following);
  const replyPolicyLabel = REPLY_CONTROL_LABEL[displayPost.reply_control];
  const isLocked = displayPost.reply_control === 'locked' && !isOwner;

  const handleBookmark = () => {
    toggleReaction.mutate({ postId: displayPost.id, type: 'bookmark' });
  };

  const handleFollow = () => {
    if (!displayPost.author) {
      return;
    }
    toggleFollow.mutate(displayPost.author.id);
  };

  const handleSubmitQuickReply = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = replyDraft.trim();
    if (!trimmed) {
      return;
    }
    setReplyError(null);
    createReply.mutate(
      { postId: displayPost.id, body: trimmed },
      {
        onSuccess: () => {
          setReplyDraft('');
          setReplyOpen(false);
        },
        onError: (error) => {
          setReplyError(
            getApiError(
              error,
              'Bạn không đủ quyền trả lời bài viết này hoặc nội dung không hợp lệ.',
            ).message,
          );
        },
      },
    );
  };

  if (isDeleted) {
    return (
      <div className="grid grid-cols-[40px_minmax(0,1fr)] gap-3 px-4 py-3 text-xs text-slate-400">
        <div className="flex flex-col items-center">
          {connectTop && <span className="h-3 w-0.5 bg-slate-200" />}
          <span className="h-8 w-8 rounded-full border border-dashed border-slate-200 bg-slate-50" />
          {effectiveConnectBottom && <span className="mt-1 w-0.5 flex-1 bg-slate-200" />}
        </div>
        <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/70 px-3.5 py-2.5 italic">
          Bài viết này đã được tác giả xóa.
        </div>
      </div>
    );
  }

  return (
    <article
      className={cn(
        'transition-colors',
        isFocal ? 'bg-brand-50/25' : 'bg-white',
      )}
    >
      {isPureRepost && (
        <div className="flex items-center gap-2 px-4 pt-3 text-[11px] font-semibold text-slate-500">
          <span className="flex w-10 justify-end">
            <Repeat2 className="h-3.5 w-3.5 text-teal-brand" />
          </span>
          <span>{post.author?.name ?? 'Thành viên'} đã đăng lại</span>
        </div>
      )}

      <div
        className={cn(
          'grid grid-cols-[40px_minmax(0,1fr)] gap-3 px-4',
          compact ? 'py-3' : 'py-4',
        )}
      >
        {/* Left Avatar + Thread Connector Column */}
        <div className="flex flex-col items-center">
          {connectTop && (
            <span aria-hidden="true" className="mb-1 h-2.5 w-0.5 rounded-full bg-slate-200" />
          )}
          <CommunityAuthorAvatar
            author={displayPost.author}
            size={compact ? 'sm' : 'md'}
            linkToProfile={Boolean(displayPost.author?.id)}
          />
          {effectiveConnectBottom && (
            <span
              aria-hidden="true"
              className="mt-1.5 min-h-4 w-0.5 flex-1 rounded-full bg-slate-200"
            />
          )}
        </div>

        {/* Right Content Column */}
        <div className="min-w-0">
          {/* Header Row */}
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                {displayPost.author?.id ? (
                  <Link
                    to={`/profile/${displayPost.author.id}`}
                    className="truncate text-sm font-bold text-slate-900 hover:underline hover:text-blue-600 transition"
                  >
                    {displayPost.author?.name ?? 'Thành viên SoftSkill'}
                  </Link>
                ) : (
                  <span className="truncate text-sm font-bold text-slate-900">
                    {displayPost.author?.name ?? 'Thành viên SoftSkill'}
                  </span>
                )}
                {displayPost.author?.id ? (
                  <Link
                    to={`/profile/${displayPost.author.id}`}
                    className="truncate text-xs text-slate-400 hover:underline hover:text-blue-600 transition"
                  >
                    @{displayPost.author?.username ?? 'member'}
                  </Link>
                ) : (
                  <span className="truncate text-xs text-slate-400">
                    @{displayPost.author?.username ?? 'member'}
                  </span>
                )}
                <span className="text-xs text-slate-300">·</span>
                <time className="text-xs text-slate-400">
                  {formatRelativeTime(displayPost.created_at)}
                </time>
              </div>
              {!compact && displayPost.author?.headline && (
                <p className="truncate text-[11px] text-slate-500">
                  {displayPost.author.headline}
                </p>
              )}
            </div>

            <div className="flex shrink-0 items-center gap-1">
              {!isOwner && displayPost.author && !compact && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleFollow}
                  aria-pressed={isFollowing}
                  className={cn(
                    'h-7 rounded-full px-2.5 text-[11px] font-semibold cursor-pointer',
                    isFollowing
                      ? 'bg-slate-100 text-slate-600'
                      : 'text-brand-800 hover:bg-brand-50',
                  )}
                >
                  <UserPlus className="mr-1 h-3 w-3" />
                  {isFollowing ? 'Đang theo dõi' : 'Theo dõi'}
                </Button>
              )}

              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label="Tùy chọn bài viết"
                      className="h-7 w-7 rounded-full text-slate-400 hover:text-slate-700"
                    />
                  }
                >
                  <MoreHorizontal className="h-4 w-4" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem
                    onClick={handleBookmark}
                    className="cursor-pointer gap-2 text-xs"
                  >
                    <Bookmark
                      className={cn(
                        'h-3.5 w-3.5',
                        displayPost.viewer.bookmarked && 'fill-amber-brand text-amber-brand',
                      )}
                    />
                    <span>
                      {displayPost.viewer.bookmarked ? 'Bỏ lưu bài viết' : 'Lưu bài viết'}
                    </span>
                  </DropdownMenuItem>
                  {canModerateReplies &&
                    displayPost.parent_id !== null &&
                    (displayPost.thread_group_id === null ||
                      displayPost.thread_group_id !== displayPost.root_id) && (
                    <DropdownMenuItem
                      onClick={() => hideReply.mutate(displayPost.id)}
                      className="cursor-pointer gap-2 text-xs"
                    >
                      {isHidden ? (
                        <>
                          <Eye className="h-3.5 w-3.5" />
                          <span>Hiện lại bình luận</span>
                        </>
                      ) : (
                        <>
                          <EyeOff className="h-3.5 w-3.5" />
                          <span>Ẩn bình luận này</span>
                        </>
                      )}
                    </DropdownMenuItem>
                  )}
                  {isOwner && (
                    <DropdownMenuItem
                      onClick={() =>
                        deletePost.mutate(displayPost.id, {
                          onSuccess: () => onDeleted?.(displayPost.id),
                        })
                      }
                      className="cursor-pointer gap-2 text-xs text-rose-600 focus:text-rose-700"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      <span>Xóa bài viết</span>
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Topic Tag & Reply Policy */}
          {(displayPost.topic_tag || replyPolicyLabel) && (
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
              {displayPost.topic_tag && (
                <Badge
                  variant="secondary"
                  className="rounded-full bg-brand-50 px-2.5 py-0.5 text-[10px] font-bold text-brand-800"
                >
                  #{displayPost.topic_tag.name}
                </Badge>
              )}
              {replyPolicyLabel && (
                <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500">
                  <Lock className="h-2.5 w-2.5" />
                  {replyPolicyLabel}
                </span>
              )}
            </div>
          )}

          {/* Body or Hidden Notice */}
          {isHidden ? (
            <div className="mt-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs italic text-slate-500">
              Bình luận này đã được tác giả bài viết ẩn khỏi luồng thảo luận.
            </div>
          ) : (
            displayPost.body && (
              <p
                className={cn(
                  'mt-2 whitespace-pre-wrap break-words leading-relaxed text-slate-800',
                  isFocal ? 'text-[15px] font-normal' : 'text-sm',
                )}
              >
                {displayPost.body}
              </p>
            )
          )}

          {/* Poll */}
          {!isHidden && displayPost.poll && <PollWidget poll={displayPost.poll} />}

          {/* Quote Post */}
          {!isHidden && displayPost.quote_post && (
            <div className="mt-3 block rounded-2xl border border-slate-200 bg-slate-50/60 p-3">
              <div className="flex items-center gap-2 text-xs">
                <CommunityAuthorAvatar
                  author={displayPost.quote_post.author}
                  size="sm"
                  linkToProfile={Boolean(displayPost.quote_post.author?.id)}
                />
                {displayPost.quote_post.author?.id ? (
                  <Link
                    to={`/profile/${displayPost.quote_post.author.id}`}
                    className="font-bold text-slate-800 hover:underline hover:text-blue-600 transition"
                  >
                    {displayPost.quote_post.author?.name ?? 'Thành viên'}
                  </Link>
                ) : (
                  <span className="font-bold text-slate-800">
                    {displayPost.quote_post.author?.name ?? 'Thành viên'}
                  </span>
                )}
                <span className="text-slate-400">
                  {formatRelativeTime(displayPost.quote_post.created_at)}
                </span>
              </div>
              <p className="mt-1.5 line-clamp-3 text-xs leading-relaxed text-slate-600">
                {displayPost.quote_post.body}
              </p>
            </div>
          )}

          {/* Threads-style Action Bar */}
          {!isHidden && (
            <ThreadsActionBar
              postId={displayPost.id}
              likesCount={displayPost.likes_count}
              repliesCount={displayPost.replies_count}
              repostsCount={displayPost.reposts_count}
              quotesCount={displayPost.quotes_count}
              liked={displayPost.viewer.liked}
              reposted={displayPost.viewer.reposted}
              isReplyDisabled={isLocked}
              onReplyClick={() => {
                if (onReplyClick) {
                  onReplyClick(displayPost);
                } else {
                  setReplyOpen((prev) => !prev);
                }
              }}
            />
          )}

          {/* Quick Inline Reply Box */}
          {replyOpen && !isLocked && (
            <form onSubmit={handleSubmitQuickReply} className="mt-3 space-y-2">
              <div className="flex items-center gap-2">
                <input
                  value={replyDraft}
                  onChange={(e) => setReplyDraft(e.target.value)}
                  maxLength={500}
                  placeholder={`Trả lời ${displayPost.author?.name ?? 'tác giả'}...`}
                  aria-label="Nội dung trả lời"
                  className="min-w-0 flex-1 rounded-full border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs text-slate-800 outline-none focus:border-brand-700 focus:bg-white"
                />
                <Button
                  type="submit"
                  size="sm"
                  disabled={!replyDraft.trim() || createReply.isPending}
                  className="h-8 rounded-full bg-brand-900 px-3.5 text-xs font-semibold text-white hover:bg-brand-800"
                >
                  <Send className="mr-1 h-3 w-3" />
                  Gửi
                </Button>
              </div>
              {replyError && <p className="text-[11px] text-rose-600">{replyError}</p>}
            </form>
          )}
        </div>
      </div>

      {/* Connected Self-Thread Continuation Items on Feed */}
      {hasSelfThread && (
        <div className="divide-y-0">
          {selfThreadItems.map((part, idx) => (
            <ThreadPostCard
              key={part.id}
              post={part}
              connectTop
              connectBottom={idx < selfThreadItems.length - 1 || connectBottom}
              disableSelfThreadExpansion
              canModerateReplies={canModerateReplies}
              compact
              onReplyClick={onReplyClick}
            />
          ))}
        </div>
      )}
    </article>
  );
});
