import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
  type RefObject,
} from 'react';
import {
  ChevronDown,
  Eye,
  EyeOff,
  Image as ImageIcon,
  MessageCircle,
  MoreHorizontal,
  Send,
  Smile,
  Sticker,
  Trash2,
  X,
} from 'lucide-react';
import { cn } from '@/core/utils/cn';
import { getApiError } from '@/core/api/client';
import { useMe } from '@/features/auth/api/auth';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { useBranchReplies, useThreadDetail } from '../api/useThreadDetail';
import {
  useCreateReplyMutation,
  useDeletePostMutation,
  useHideReplyMutation,
} from '../api/useCommunityMutations';
import { CommunityAuthorAvatar } from './CommunityAuthorAvatar';
import { buildCurrentAuthorSummary } from '../utils/communityAuthor';
import { ThreadPostCard } from './ThreadPostCard';
import { ThreadsActionBar } from './ThreadsActionBar';
import type { CommunityAuthor, CommunityPost } from '../types/community';

const MAX_REPLY_CHARS = 500;

const QUICK_EMOJIS = ['😊', '👍', '👏', '🎉', '🔥', '💡', '❤️', '😂', '🙌', '✨', '🤔', '💯'];

type CommentSortMode = 'newest' | 'top';

function formatCompactTime(isoString: string | null): string {
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
    return `${diffMin} phút`;
  }
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) {
    return `${diffHours} giờ`;
  }
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 30) {
    return `${diffDays} ngày`;
  }
  return new Date(ts).toLocaleDateString('vi-VN');
}

function insertTextAtCursor(
  textarea: HTMLTextAreaElement | null,
  currentValue: string,
  snippet: string,
  setValue: (next: string) => void,
) {
  if (!textarea) {
    setValue((currentValue + snippet).slice(0, MAX_REPLY_CHARS));
    return;
  }

  const start = textarea.selectionStart ?? currentValue.length;
  const end = textarea.selectionEnd ?? currentValue.length;
  const next = (
    currentValue.slice(0, start) +
    snippet +
    currentValue.slice(end)
  ).slice(0, MAX_REPLY_CHARS);

  setValue(next);
  const nextCursor = Math.min(start + snippet.length, MAX_REPLY_CHARS);
  window.requestAnimationFrame(() => {
    textarea.focus();
    textarea.setSelectionRange(nextCursor, nextCursor);
  });
}

interface ComposerActionBarProps {
  draft: string;
  setDraft: (value: string) => void;
  textareaRef: RefObject<HTMLTextAreaElement | null>;
  isPending: boolean;
  submitAriaLabel: string;
}

function ComposerActionBar({
  draft,
  setDraft,
  textareaRef,
  isPending,
  submitAriaLabel,
}: ComposerActionBarProps) {
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [comingSoonHint, setComingSoonHint] = useState<string | null>(null);
  const hintTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (hintTimerRef.current !== null) {
        window.clearTimeout(hintTimerRef.current);
      }
    };
  }, []);

  const showComingSoon = (label: string) => {
    setEmojiOpen(false);
    setComingSoonHint(`Tính năng đính kèm ${label} sẽ sớm được hỗ trợ.`);
    if (hintTimerRef.current !== null) {
      window.clearTimeout(hintTimerRef.current);
    }
    hintTimerRef.current = window.setTimeout(() => {
      setComingSoonHint((prev) =>
        prev?.includes(label) ? null : prev,
      );
    }, 2400);
  };

  return (
    <div className="mt-1.5 space-y-1.5">
      {emojiOpen && (
        <div className="flex flex-wrap items-center gap-1 rounded-xl border border-slate-200 bg-white p-1.5 shadow-sm">
          {QUICK_EMOJIS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => {
                insertTextAtCursor(textareaRef.current, draft, emoji, setDraft);
                setEmojiOpen(false);
              }}
              className="flex h-7 w-7 items-center justify-center rounded-lg text-base transition-colors hover:bg-slate-100 cursor-pointer"
            >
              {emoji}
            </button>
          ))}
        </div>
      )}

      {comingSoonHint && (
        <p className="text-[11px] font-medium text-brand-800">{comingSoonHint}</p>
      )}

      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-0.5 text-slate-500">
          <button
            type="button"
            onClick={() => {
              setComingSoonHint(null);
              setEmojiOpen((prev) => !prev);
            }}
            aria-label="Chèn biểu tượng cảm xúc"
            title="Biểu tượng cảm xúc"
            className={cn(
              'inline-flex h-8 w-8 items-center justify-center rounded-full transition-colors cursor-pointer',
              emojiOpen
                ? 'bg-brand-100 text-brand-900'
                : 'hover:bg-slate-200/70 hover:text-slate-800',
            )}
          >
            <Smile className="h-4 w-4" />
          </button>

          <button
            type="button"
            onClick={() => showComingSoon('ảnh')}
            aria-label="Đính kèm hình ảnh"
            title="Đính kèm hình ảnh"
            className="inline-flex h-8 w-8 items-center justify-center rounded-full transition-colors hover:bg-slate-200/70 hover:text-slate-800 cursor-pointer"
          >
            <ImageIcon className="h-4 w-4" />
          </button>

          <button
            type="button"
            onClick={() => showComingSoon('GIF')}
            aria-label="Chèn GIF"
            title="Chèn GIF"
            className="inline-flex h-8 items-center justify-center rounded-full px-1.5 transition-colors hover:bg-slate-200/70 hover:text-slate-800 cursor-pointer"
          >
            <span className="rounded border border-current px-1 py-px text-[9px] font-extrabold leading-none tracking-tight">
              GIF
            </span>
          </button>

          <button
            type="button"
            onClick={() => showComingSoon('nhãn dán')}
            aria-label="Chèn nhãn dán"
            title="Nhãn dán"
            className="inline-flex h-8 w-8 items-center justify-center rounded-full transition-colors hover:bg-slate-200/70 hover:text-slate-800 cursor-pointer"
          >
            <Sticker className="h-4 w-4" />
          </button>
        </div>

        <div className="flex items-center gap-2">
          {draft.length >= 400 && (
            <span className="text-[11px] tabular-nums font-medium text-amber-600">
              {draft.length}/{MAX_REPLY_CHARS}
            </span>
          )}

          <button
            type="submit"
            disabled={!draft.trim() || isPending}
            aria-label={submitAriaLabel}
            className={cn(
              'inline-flex h-8 w-8 items-center justify-center rounded-full transition-colors',
              draft.trim() && !isPending
                ? 'bg-brand-900 text-white hover:bg-brand-800 cursor-pointer'
                : 'text-slate-400 cursor-not-allowed',
            )}
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

interface InlineReplyComposerProps {
  currentAuthor: CommunityAuthor | null;
  targetPost: CommunityPost;
  onSuccess: () => void;
  onCancel: () => void;
}

interface InlineReplyComposerProps {
  currentAuthor: CommunityAuthor | null;
  targetPost: CommunityPost;
  onSuccess: () => void;
  onCancel: () => void;
  noTopPadding?: boolean;
}

function InlineReplyComposer({
  currentAuthor,
  targetPost,
  onSuccess,
  onCancel,
  noTopPadding = false,
}: InlineReplyComposerProps) {
  const createReply = useCreateReplyMutation();
  const [draft, setDraft] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    window.setTimeout(() => {
      inputRef.current?.focus();
    }, 20);
  }, [targetPost.id]);

  useEffect(() => {
    const el = inputRef.current;
    if (!el) {
      return;
    }
    el.style.height = 'auto';
    const maxInlineH = 200;
    if (el.scrollHeight > maxInlineH) {
      el.style.height = `${maxInlineH}px`;
      el.style.overflowY = 'auto';
    } else {
      el.style.height = `${el.scrollHeight}px`;
      el.style.overflowY = 'hidden';
      el.scrollTop = 0;
    }
  }, [draft]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = draft.trim();
    if (!trimmed || createReply.isPending) {
      return;
    }
    setErrorMsg(null);
    createReply.mutate(
      { postId: targetPost.id, body: trimmed },
      {
        onSuccess: () => {
          setDraft('');
          onSuccess();
        },
        onError: (err) => {
          setErrorMsg(
            getApiError(err, 'Không thể gửi phản hồi lúc này.').message,
          );
        },
      },
    );
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onCancel();
    }
  };

  return (
    <div className={cn('relative flex gap-2.5', noTopPadding ? 'pt-0' : 'pt-2')}>
      <CommunityAuthorAvatar author={currentAuthor} size="sm" />
      <form
        onSubmit={handleSubmit}
        className="min-w-0 flex-1 rounded-2xl border border-slate-200 bg-slate-100/80 px-3.5 py-2.5 focus-within:border-brand-300 focus-within:bg-white"
      >
        <div className="mb-1 flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1 rounded-md bg-brand-100/80 px-1.5 py-0.5 text-[11px] font-semibold text-brand-900">
            @{targetPost.author?.name ?? 'Thành viên'}
          </span>
          <button
            type="button"
            onClick={onCancel}
            aria-label="Đóng ô trả lời"
            className="rounded-full p-0.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700 cursor-pointer"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        <textarea
          ref={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={1}
          maxLength={MAX_REPLY_CHARS}
          placeholder={`Trả lời ${targetPost.author?.name ?? 'thành viên'}...`}
          aria-label={`Trả lời ${targetPost.author?.name ?? 'bình luận'}`}
          className="block w-full resize-none overflow-x-hidden whitespace-pre-wrap [overflow-wrap:anywhere] bg-transparent py-0.5 text-xs leading-relaxed text-slate-800 placeholder:text-slate-400 outline-none sm:text-sm"
        />

        <ComposerActionBar
          draft={draft}
          setDraft={setDraft}
          textareaRef={inputRef}
          isPending={createReply.isPending}
          submitAriaLabel="Gửi phản hồi"
        />

        {errorMsg && <p className="mt-1 text-[11px] text-rose-600">{errorMsg}</p>}
      </form>
    </div>
  );
}

interface DialogCommentItemProps {
  comment: CommunityPost;
  currentUserId: number | null;
  currentAuthor: CommunityAuthor | null;
  canModerateReplies: boolean;
  isLocked: boolean;
  activeInlineReplyId: number | null;
  onToggleInlineReply: (commentId: number | null) => void;
  onReplySubmitted?: () => void;
  hasConnectorBelow?: boolean;
  isNested?: boolean;
  hideInlineComposer?: boolean;
}

function DialogCommentItem({
  comment,
  currentUserId,
  currentAuthor,
  canModerateReplies,
  isLocked,
  activeInlineReplyId,
  onToggleInlineReply,
  onReplySubmitted,
  hasConnectorBelow = false,
  isNested = false,
  hideInlineComposer = false,
}: DialogCommentItemProps) {
  const hideReply = useHideReplyMutation();
  const deletePost = useDeletePostMutation();

  const isOwner = currentUserId !== null && currentUserId === comment.author?.id;
  const isDeleted = comment.status === 'deleted';
  const isHidden = comment.is_hidden_by_author;
  const isReplyingHere = activeInlineReplyId === comment.id;

  if (isDeleted) {
    return (
      <div className="flex gap-2.5 py-1.5 text-xs italic text-slate-400">
        <span className="h-7 w-7 shrink-0 rounded-full border border-dashed border-slate-200 bg-slate-50" />
        <div className="rounded-2xl bg-slate-50 px-3 py-2">
          Bình luận này đã bị xóa.
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-2.5">
      <div className="flex w-8 shrink-0 flex-col items-center">
        <CommunityAuthorAvatar author={comment.author} size="sm" />
        {hasConnectorBelow && (
          <span
            aria-hidden="true"
            data-testid="comment-spine-connector"
            className="mt-1 w-0.5 flex-1 rounded-t-full bg-slate-200"
          />
        )}
      </div>

      <div className="min-w-0 flex-1 pb-1.5">
        <div className="group flex items-start gap-1.5">
          <div
            data-testid={`comment-bubble-${comment.id}`}
            data-replying={isReplyingHere ? 'true' : 'false'}
            className={cn(
              'min-w-0 rounded-2xl px-3.5 py-2 transition-colors',
              isReplyingHere
                ? 'bg-blue-100 ring-1 ring-blue-400 shadow-2xs'
                : 'bg-slate-100/85',
            )}
          >
            <div className="flex flex-wrap items-center gap-x-1.5">
              <span className="text-xs font-bold text-slate-900">
                {comment.author?.name ?? 'Thành viên'}
              </span>
              {comment.author?.headline && !isNested && (
                <span className="hidden text-[11px] text-slate-400 sm:inline">
                  · {comment.author.headline}
                </span>
              )}
              {comment.created_at && (
                <span className="text-[11px] font-normal text-slate-400">
                  · {formatCompactTime(comment.created_at)}
                </span>
              )}
            </div>

            {isHidden ? (
              <p className="mt-0.5 text-xs italic text-slate-500">
                Bình luận này đã được tác giả bài viết ẩn.
              </p>
            ) : (
              <p className="mt-0.5 whitespace-pre-wrap break-words text-[13px] leading-relaxed text-slate-800">
                {comment.body}
              </p>
            )}
          </div>

          {(isOwner || canModerateReplies) && (
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <button
                    type="button"
                    aria-label="Tùy chọn bình luận"
                    className="mt-1 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-slate-400 opacity-70 transition-opacity hover:bg-slate-100 hover:text-slate-700 group-hover:opacity-100 cursor-pointer"
                  />
                }
              >
                <MoreHorizontal className="h-3.5 w-3.5" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-44">
                {canModerateReplies && (
                  <DropdownMenuItem
                    onClick={() => hideReply.mutate(comment.id)}
                    className="cursor-pointer gap-2 text-xs"
                  >
                    {isHidden ? (
                      <>
                        <Eye className="h-3.5 w-3.5" />
                        <span>Hiện bình luận</span>
                      </>
                    ) : (
                      <>
                        <EyeOff className="h-3.5 w-3.5" />
                        <span>Ẩn bình luận</span>
                      </>
                    )}
                  </DropdownMenuItem>
                )}
                {isOwner && (
                  <DropdownMenuItem
                    onClick={() => deletePost.mutate(comment.id)}
                    className="cursor-pointer gap-2 text-xs text-rose-600 focus:text-rose-700"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Xóa bình luận</span>
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {!isHidden && (
          <div className="px-2">
            <ThreadsActionBar
              compact
              postId={comment.id}
              likesCount={comment.likes_count}
              repliesCount={comment.replies_count}
              repostsCount={comment.reposts_count}
              quotesCount={comment.quotes_count}
              liked={comment.viewer.liked}
              reposted={comment.viewer.reposted}
              isReplyDisabled={isLocked}
              isRepostDisabled
              replyAriaLabel="Trả lời"
              onReplyClick={() =>
                onToggleInlineReply(isReplyingHere ? null : comment.id)
              }
            />
          </div>
        )}

        {isReplyingHere && !isLocked && !hideInlineComposer && (
          <InlineReplyComposer
            currentAuthor={currentAuthor}
            targetPost={comment}
            onSuccess={() => {
              onToggleInlineReply(null);
              onReplySubmitted?.();
            }}
            onCancel={() => onToggleInlineReply(null)}
          />
        )}
      </div>
    </div>
  );
}

interface DialogCommentBranchProps {
  reply: CommunityPost;
  childrenByParent: Map<number, CommunityPost[]>;
  level?: number;
  currentUserId: number | null;
  currentAuthor: CommunityAuthor | null;
  canModerateReplies: boolean;
  isLocked: boolean;
  activeInlineReplyId: number | null;
  onToggleInlineReply: (commentId: number | null) => void;
}

function DialogCommentBranch({
  reply,
  childrenByParent,
  level = 1,
  currentUserId,
  currentAuthor,
  canModerateReplies,
  isLocked,
  activeInlineReplyId,
  onToggleInlineReply,
}: DialogCommentBranchProps) {
  const showTreeConnectors = level >= 2;
  const [expanded, setExpanded] = useState(false);
  const [loadMoreOpen, setLoadMoreOpen] = useState(false);
  const {
    data: branchData,
    fetchNextPage,
    hasNextPage,
    isFetching,
  } = useBranchReplies(reply.id, loadMoreOpen);

  const nestedChildren = childrenByParent.get(reply.id) ?? [];

  const mergedChildren = useMemo(() => {
    const byId = new Map<number, CommunityPost>();
    for (const child of nestedChildren) {
      byId.set(child.id, child);
    }
    if (branchData) {
      for (const page of branchData.pages) {
        for (const item of page.data) {
          byId.set(item.id, item);
        }
      }
    }
    return Array.from(byId.values());
  }, [nestedChildren, branchData]);

  const branchLoaded = Boolean(branchData?.pages?.length);
  const totalRepliesCount = Math.max(reply.replies_count, mergedChildren.length);
  const hiddenCount = Math.max(0, totalRepliesCount - mergedChildren.length);
  const hasAnyReplies = !reply.is_hidden_by_author && totalRepliesCount > 0;
  const isInlineComposerInBranch =
    showTreeConnectors && !isLocked && activeInlineReplyId === reply.id;
  const showCollapsedToggle = hasAnyReplies && !expanded;
  const showChildren = hasAnyReplies && expanded && mergedChildren.length > 0;
  const showLoadingInitial =
    hasAnyReplies && expanded && mergedChildren.length === 0 && isFetching;
  const showMoreBtn =
    hasAnyReplies &&
    expanded &&
    (branchLoaded ? Boolean(hasNextPage) : hiddenCount > 0 || Boolean(hasNextPage));
  const showTreeBranchList =
    showTreeConnectors &&
    (expanded || isInlineComposerInBranch) &&
    (showCollapsedToggle ||
      showLoadingInitial ||
      showChildren ||
      showMoreBtn ||
      isInlineComposerInBranch);

  const handleBranchReplySuccess = () => {
    onToggleInlineReply(null);
    setExpanded(true);
    setLoadMoreOpen(true);
  };

  return (
    <div>
      <DialogCommentItem
        comment={reply}
        currentUserId={currentUserId}
        currentAuthor={currentAuthor}
        canModerateReplies={canModerateReplies}
        isLocked={isLocked}
        activeInlineReplyId={activeInlineReplyId}
        onToggleInlineReply={onToggleInlineReply}
        onReplySubmitted={() => {
          setExpanded(true);
          setLoadMoreOpen(true);
        }}
        hasConnectorBelow={
          showTreeConnectors &&
          (showChildren ||
            showMoreBtn ||
            showLoadingInitial ||
            isInlineComposerInBranch)
        }
        isNested={level > 1}
        hideInlineComposer={showTreeConnectors}
      />

      {(!showTreeConnectors || !isInlineComposerInBranch) && showCollapsedToggle && (
        <div className="ml-[42px] pb-1">
          <button
            type="button"
            onClick={() => {
              setExpanded(true);
              if (hiddenCount > 0 || mergedChildren.length === 0) {
                setLoadMoreOpen(true);
              }
            }}
            className="inline-flex items-center gap-1.5 rounded-full px-1.5 py-0.5 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 cursor-pointer"
          >
            <ChevronDown className="h-3.5 w-3.5 text-slate-500" />
            <span>Xem {totalRepliesCount} câu trả lời</span>
          </button>
        </div>
      )}

      {!showTreeConnectors && showLoadingInitial && (
        <div className="ml-[42px] pb-1">
          <span className="inline-block px-1.5 py-0.5 text-xs font-medium text-slate-500">
            Đang tải câu trả lời...
          </span>
        </div>
      )}

      {!showTreeConnectors && showChildren && (
        <div className="ml-[42px]">
          {mergedChildren.map((child) => (
            <DialogCommentBranch
              key={child.id}
              reply={child}
              childrenByParent={childrenByParent}
              level={level + 1}
              currentUserId={currentUserId}
              currentAuthor={currentAuthor}
              canModerateReplies={canModerateReplies}
              isLocked={isLocked}
              activeInlineReplyId={activeInlineReplyId}
              onToggleInlineReply={onToggleInlineReply}
            />
          ))}
        </div>
      )}

      {!showTreeConnectors && showMoreBtn && (
        <div className="ml-[42px] pb-1">
          <button
            type="button"
            disabled={isFetching}
            onClick={() => {
              if (!loadMoreOpen) {
                setLoadMoreOpen(true);
              } else if (hasNextPage) {
                void fetchNextPage();
              }
            }}
            className="inline-flex items-center gap-1.5 rounded-full px-1.5 py-0.5 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 cursor-pointer"
          >
            <ChevronDown className="h-3.5 w-3.5 text-slate-500" />
            <span>
              {isFetching
                ? 'Đang tải câu trả lời...'
                : hiddenCount > 0
                  ? `Xem thêm ${hiddenCount} câu trả lời`
                  : 'Xem thêm câu trả lời'}
            </span>
          </button>
        </div>
      )}

      {showTreeBranchList && (
        <div className="relative ml-[15px] pl-[27px]">
          {showCollapsedToggle && (
            <div className="relative pb-1">
              {isInlineComposerInBranch && (
                <span
                  aria-hidden="true"
                  className="absolute -left-[27px] top-0 bottom-0 w-0.5 bg-slate-200"
                />
              )}
              <span
                aria-hidden="true"
                className="absolute -left-[27px] top-0 h-[15px] w-[24px] rounded-bl-xl border-b-2 border-l-2 border-slate-200"
              />
              <button
                type="button"
                onClick={() => {
                  setExpanded(true);
                  if (hiddenCount > 0 || mergedChildren.length === 0) {
                    setLoadMoreOpen(true);
                  }
                }}
                className="inline-flex items-center gap-1.5 rounded-full px-1.5 py-0.5 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 cursor-pointer"
              >
                <ChevronDown className="h-3.5 w-3.5 text-slate-500" />
                <span>Xem {totalRepliesCount} câu trả lời</span>
              </button>
            </div>
          )}

          {showLoadingInitial && (
            <div className="relative pb-1">
              {isInlineComposerInBranch && (
                <span
                  aria-hidden="true"
                  className="absolute -left-[27px] top-0 bottom-0 w-0.5 bg-slate-200"
                />
              )}
              <span
                aria-hidden="true"
                className="absolute -left-[27px] top-0 h-[15px] w-[24px] rounded-bl-xl border-b-2 border-l-2 border-slate-200"
              />
              <span className="inline-block px-1.5 py-0.5 text-xs font-medium text-slate-500">
                Đang tải câu trả lời...
              </span>
            </div>
          )}

          {showChildren &&
            mergedChildren.map((child, idx) => {
              const isLast =
                idx === mergedChildren.length - 1 &&
                !showMoreBtn &&
                !isInlineComposerInBranch;
              return (
                <div
                  key={child.id}
                  className="relative"
                  data-testid="nested-tree-connector"
                >
                  {!isLast && (
                    <span
                      aria-hidden="true"
                      className="absolute -left-[27px] top-0 bottom-0 w-0.5 bg-slate-200"
                    />
                  )}
                  <span
                    aria-hidden="true"
                    className="absolute -left-[27px] top-0 h-[17px] w-[24px] rounded-bl-xl border-b-2 border-l-2 border-slate-200"
                  />
                  <DialogCommentBranch
                    reply={child}
                    childrenByParent={childrenByParent}
                    level={level + 1}
                    currentUserId={currentUserId}
                    currentAuthor={currentAuthor}
                    canModerateReplies={canModerateReplies}
                    isLocked={isLocked}
                    activeInlineReplyId={activeInlineReplyId}
                    onToggleInlineReply={onToggleInlineReply}
                  />
                </div>
              );
            })}

          {showMoreBtn && (
            <div className="relative pb-1">
              {isInlineComposerInBranch && (
                <span
                  aria-hidden="true"
                  className="absolute -left-[27px] top-0 bottom-0 w-0.5 bg-slate-200"
                />
              )}
              <span
                aria-hidden="true"
                className="absolute -left-[27px] top-0 h-[15px] w-[24px] rounded-bl-xl border-b-2 border-l-2 border-slate-200"
              />
              <button
                type="button"
                disabled={isFetching}
                onClick={() => {
                  if (!loadMoreOpen) {
                    setLoadMoreOpen(true);
                  } else if (hasNextPage) {
                    void fetchNextPage();
                  }
                }}
                className="inline-flex items-center gap-1.5 rounded-full px-1.5 py-0.5 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 cursor-pointer"
              >
                <ChevronDown className="h-3.5 w-3.5 text-slate-500" />
                <span>
                  {isFetching
                    ? 'Đang tải câu trả lời...'
                    : hiddenCount > 0
                      ? `Xem thêm ${hiddenCount} câu trả lời`
                      : 'Xem thêm câu trả lời'}
                </span>
              </button>
            </div>
          )}

          {isInlineComposerInBranch && (
            <div
              className="relative pb-1"
              data-testid="branch-inline-reply-connector"
            >
              <span
                aria-hidden="true"
                className="absolute -left-[27px] top-0 h-[17px] w-[24px] rounded-bl-xl border-b-2 border-l-2 border-slate-200"
              />
              <InlineReplyComposer
                currentAuthor={currentAuthor}
                targetPost={reply}
                onSuccess={handleBranchReplySuccess}
                onCancel={() => onToggleInlineReply(null)}
                noTopPadding
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface ThreadReplyDialogProps {
  post: CommunityPost | null;
  onOpenChange: (open: boolean) => void;
}

export function ThreadReplyDialog({ post, onOpenChange }: ThreadReplyDialogProps) {
  const { data: currentUser } = useMe();
  const postId = post?.id ?? 0;
  const { data: detail, isLoading } = useThreadDetail(postId);
  const createReply = useCreateReplyMutation();

  const [sortMode, setSortMode] = useState<CommentSortMode>('newest');
  const [activeInlineReplyId, setActiveInlineReplyId] = useState<number | null>(null);
  const [bottomDraft, setBottomDraft] = useState('');
  const [bottomError, setBottomError] = useState<string | null>(null);

  const headerRef = useRef<HTMLDivElement | null>(null);
  const footerRef = useRef<HTMLDivElement | null>(null);
  const bottomTextareaRef = useRef<HTMLTextAreaElement | null>(null);

  const syncBottomTextareaHeight = useCallback(() => {
    const el = bottomTextareaRef.current;
    if (!el) {
      return;
    }

    const viewportMaxDialogH = Math.floor(
      (typeof window !== 'undefined' ? window.innerHeight : 800) * 0.9,
    );
    const headerH = headerRef.current?.offsetHeight || 53;
    const footerH = footerRef.current?.offsetHeight || 100;
    const currentTextareaH = el.offsetHeight || 24;
    const footerChromeH = Math.max(72, footerH - currentTextareaH);
    const maxTextareaH = Math.max(120, viewportMaxDialogH - headerH - footerChromeH - 8);

    el.style.height = 'auto';
    if (el.scrollHeight > maxTextareaH) {
      el.style.height = `${maxTextareaH}px`;
      el.style.overflowY = 'auto';
    } else {
      el.style.height = `${el.scrollHeight}px`;
      el.style.overflowY = 'hidden';
      el.scrollTop = 0;
    }
  }, []);

  useEffect(() => {
    if (post) {
      setActiveInlineReplyId(null);
      setBottomDraft('');
      setBottomError(null);
    }
  }, [post?.id]);

  useEffect(() => {
    syncBottomTextareaHeight();
  }, [bottomDraft, syncBottomTextareaHeight]);

  useEffect(() => {
    window.addEventListener('resize', syncBottomTextareaHeight);
    return () => window.removeEventListener('resize', syncBottomTextareaHeight);
  }, [syncBottomTextareaHeight]);

  const focalPost = detail?.post ?? post;
  const rootAuthorId =
    detail?.root_author_id ??
    detail?.ancestors[0]?.author?.id ??
    (focalPost?.root_id === null ? (focalPost?.author?.id ?? null) : null);
  const canModerateReplies =
    currentUser !== undefined &&
    currentUser !== null &&
    rootAuthorId !== null &&
    rootAuthorId === currentUser.id;
  const isLocked = focalPost?.reply_control === 'locked' && !canModerateReplies;

  const selfThreadItems =
    detail?.self_thread_items ?? focalPost?.self_thread_items ?? [];

  const currentAuthorSummary: CommunityAuthor | null = buildCurrentAuthorSummary(currentUser);

  const { level1Replies, childrenByParent } = useMemo(() => {
    const replies = detail?.replies ?? [];
    const l1: CommunityPost[] = [];
    const childMap = new Map<number, CommunityPost[]>();

    for (const item of replies) {
      if (item.parent_id === focalPost?.id || item.parent_id === null) {
        l1.push(item);
      } else {
        const list = childMap.get(item.parent_id) ?? [];
        list.push(item);
        childMap.set(item.parent_id, list);
      }
    }

    const sortedL1 = [...l1].sort((a, b) => {
      if (sortMode === 'top') {
        const scoreA = a.likes_count * 2 + a.replies_count;
        const scoreB = b.likes_count * 2 + b.replies_count;
        if (scoreB !== scoreA) {
          return scoreB - scoreA;
        }
      }
      const timeA = a.created_at ? Date.parse(a.created_at) : 0;
      const timeB = b.created_at ? Date.parse(b.created_at) : 0;
      return timeB - timeA;
    });

    return { level1Replies: sortedL1, childrenByParent: childMap };
  }, [detail?.replies, focalPost?.id, sortMode]);

  const handleBottomSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!focalPost || createReply.isPending) {
      return;
    }
    const trimmed = bottomDraft.trim();
    if (!trimmed) {
      return;
    }

    setBottomError(null);
    createReply.mutate(
      { postId: focalPost.id, body: trimmed },
      {
        onSuccess: () => {
          setBottomDraft('');
        },
        onError: (error) => {
          setBottomError(
            getApiError(
              error,
              'Không thể gửi bình luận. Bài viết có thể đã giới hạn người trả lời.',
            ).message,
          );
        },
      },
    );
  };

  return (
    <Dialog open={Boolean(post)} onOpenChange={onOpenChange}>
      <DialogContent className="flex! max-h-[90dvh] w-full flex-col! gap-0 overflow-hidden rounded-2xl border border-slate-200 bg-white p-0 shadow-2xl sm:max-w-2xl">
        {/* Centered Title Header */}
        <div ref={headerRef} className="shrink-0">
          <DialogHeader className="relative flex items-center justify-center border-b border-slate-100 px-12 py-3.5">
            <DialogTitle className="truncate text-center text-base font-extrabold text-brand-950">
              Bài viết của {focalPost?.author?.name ?? 'Thành viên'}
            </DialogTitle>
          </DialogHeader>
        </div>

        {focalPost && (
          <>
            {/* Scrollable Post + Comment Area (compresses down to 0px as composer expands upwards) */}
            <div className="min-h-0 flex-1 overflow-y-auto">
              {detail && detail.ancestors.length > 0 && (
                <div>
                  {detail.ancestors.map((ancestor, idx) => (
                    <ThreadPostCard
                      key={ancestor.id}
                      post={ancestor}
                      connectTop={idx > 0}
                      connectBottom
                      disableSelfThreadExpansion
                      canModerateReplies={canModerateReplies}
                      compact
                      onReplyClick={() => bottomTextareaRef.current?.focus()}
                    />
                  ))}
                </div>
              )}

              <ThreadPostCard
                post={focalPost}
                connectTop={Boolean(detail && detail.ancestors.length > 0)}
                connectBottom={selfThreadItems.length > 0}
                disableSelfThreadExpansion
                canModerateReplies={canModerateReplies}
                onDeleted={() => onOpenChange(false)}
                onReplyClick={() => {
                  setActiveInlineReplyId(null);
                  bottomTextareaRef.current?.focus();
                }}
              />

              {selfThreadItems.map((item, idx) => (
                <ThreadPostCard
                  key={item.id}
                  post={item}
                  connectTop
                  connectBottom={idx < selfThreadItems.length - 1}
                  disableSelfThreadExpansion
                  canModerateReplies={canModerateReplies}
                  compact
                  onReplyClick={() => {
                    setActiveInlineReplyId(null);
                    bottomTextareaRef.current?.focus();
                  }}
                />
              ))}

              <div className="flex items-center justify-between border-t border-slate-100 px-4 py-2.5">
                <div className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700">
                  <MessageCircle className="h-3.5 w-3.5 text-brand-800" />
                  <span>{focalPost.replies_count} bình luận</span>
                </div>

                <select
                  value={sortMode}
                  onChange={(e) => setSortMode(e.target.value as CommentSortMode)}
                  aria-label="Sắp xếp bình luận"
                  className="rounded-lg px-2 py-1 text-xs font-bold text-slate-600 outline-none hover:bg-slate-100 cursor-pointer"
                >
                  <option value="newest">Mới nhất</option>
                  <option value="top">Phù hợp nhất</option>
                </select>
              </div>

              <div className="px-4 pb-4">
                {isLoading ? (
                  <div className="space-y-3 py-2">
                    {[1, 2].map((idx) => (
                      <div key={idx} className="flex gap-2.5">
                        <Skeleton className="h-8 w-8 shrink-0 rounded-full" />
                        <Skeleton className="h-14 flex-1 rounded-2xl" />
                      </div>
                    ))}
                  </div>
                ) : level1Replies.length === 0 ? (
                  <div className="rounded-2xl bg-slate-50 px-4 py-6 text-center text-xs text-slate-500">
                    {focalPost.replies_count > 0
                      ? 'Các bình luận của bài viết hiện đang được tác giả ẩn.'
                      : 'Chưa có bình luận nào. Hãy viết bình luận đầu tiên bên dưới!'}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {level1Replies.map((reply) => (
                      <DialogCommentBranch
                        key={reply.id}
                        reply={reply}
                        childrenByParent={childrenByParent}
                        level={1}
                        currentUserId={currentUser?.id ?? null}
                        currentAuthor={currentAuthorSummary}
                        canModerateReplies={canModerateReplies}
                        isLocked={isLocked}
                        activeInlineReplyId={activeInlineReplyId}
                        onToggleInlineReply={setActiveInlineReplyId}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Sticky Auto-Expanding Bottom Comment Composer */}
            <div
              ref={footerRef}
              className="shrink-0 border-t border-slate-100 bg-white px-4 py-3"
            >
              {isLocked ? (
                <p className="py-1 text-center text-xs font-medium text-slate-500">
                  Tác giả đã khóa bình luận cho bài viết này.
                </p>
              ) : (
                <form onSubmit={handleBottomSubmit} className="space-y-1.5">
                  <div className="flex items-start gap-2.5">
                    <CommunityAuthorAvatar author={currentAuthorSummary} size="sm" />
                    <div className="min-w-0 flex-1 rounded-2xl bg-slate-100/90 px-3.5 py-2.5 transition-colors focus-within:bg-slate-50 focus-within:ring-2 focus-within:ring-brand-700/20">
                      <textarea
                        ref={bottomTextareaRef}
                        value={bottomDraft}
                        onChange={(e) => setBottomDraft(e.target.value)}
                        rows={1}
                        maxLength={MAX_REPLY_CHARS}
                        placeholder={`Bình luận dưới tên ${currentUser?.name ?? 'bạn'}...`}
                        aria-label="Nội dung bình luận"
                        className="block w-full resize-none overflow-x-hidden whitespace-pre-wrap [overflow-wrap:anywhere] bg-transparent py-0.5 text-sm leading-relaxed text-slate-800 placeholder:text-slate-500 outline-none"
                      />

                      <ComposerActionBar
                        draft={bottomDraft}
                        setDraft={setBottomDraft}
                        textareaRef={bottomTextareaRef}
                        isPending={createReply.isPending}
                        submitAriaLabel="Gửi bình luận"
                      />
                    </div>
                  </div>

                  {bottomError && (
                    <p className="pl-10 text-xs font-medium text-rose-600">
                      {bottomError}
                    </p>
                  )}
                </form>
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
