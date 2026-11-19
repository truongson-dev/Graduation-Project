import { useEffect, useRef, useState, type FormEvent } from 'react';
import { BarChart3, Lock, Plus, Send, Sparkles, Trash2, X } from 'lucide-react';
import { cn } from '@/core/utils/cn';
import { getApiError } from '@/core/api/client';
import { useMe } from '@/features/auth/api/auth';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { CommunityAuthorAvatar } from './CommunityAuthorAvatar';
import { buildCurrentAuthorSummary } from '../utils/communityAuthor';
import { useCreatePostMutation } from '../api/useCommunityMutations';
import type { CommunityTopicTag, ReplyControl } from '../types/community';

const MAX_BODY_CHARS = 500;
const MAX_THREAD_PARTS = 6;

const REPLY_CONTROL_OPTIONS: Array<{ value: ReplyControl; label: string }> = [
  { value: 'everyone', label: 'Mọi người' },
  { value: 'followers', label: 'Người theo dõi bạn' },
  { value: 'following', label: 'Người bạn đang theo dõi' },
  { value: 'mentioned_only', label: 'Chỉ người được nhắc tên (@)' },
  { value: 'locked', label: 'Khóa trả lời' },
];

interface ThreadComposerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  topics: CommunityTopicTag[];
  defaultTopicSlug?: string | null;
}

export function ThreadComposerDialog({
  open,
  onOpenChange,
  topics,
  defaultTopicSlug = null,
}: ThreadComposerDialogProps) {
  const { data: currentUser } = useMe();
  const createPost = useCreatePostMutation();

  const defaultTopicId =
    topics.find((t) => t.slug === defaultTopicSlug)?.id ?? topics[0]?.id ?? null;

  const partIdRef = useRef(1);
  const hasTouchedTopicRef = useRef(false);
  const [parts, setParts] = useState<Array<{ id: number; body: string }>>(() => [
    { id: partIdRef.current++, body: '' },
  ]);
  const [selectedTopicId, setSelectedTopicId] = useState<number | null>(defaultTopicId);
  const [replyControl, setReplyControl] = useState<ReplyControl>('everyone');
  const [pollEnabled, setPollEnabled] = useState(false);
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState<string[]>(['', '']);
  const [pollExpiryHours, setPollExpiryHours] = useState<number>(24);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      hasTouchedTopicRef.current = false;
      return;
    }

    if (!hasTouchedTopicRef.current && defaultTopicId !== null) {
      setSelectedTopicId(defaultTopicId);
    }
  }, [open, defaultTopicId]);

  const authorSummary = buildCurrentAuthorSummary(currentUser);

  const resetForm = () => {
    hasTouchedTopicRef.current = false;
    setParts([{ id: partIdRef.current++, body: '' }]);
    setSelectedTopicId(defaultTopicId);
    setReplyControl('everyone');
    setPollEnabled(false);
    setPollQuestion('');
    setPollOptions(['', '']);
    setPollExpiryHours(24);
    setFormError(null);
  };

  const handleUpdatePart = (index: number, value: string) => {
    setParts((prev) =>
      prev.map((item, idx) => (idx === index ? { ...item, body: value } : item)),
    );
  };

  const handleAddPart = () => {
    if (parts.length >= MAX_THREAD_PARTS) {
      return;
    }
    setParts((prev) => [...prev, { id: partIdRef.current++, body: '' }]);
  };

  const handleRemovePart = (index: number) => {
    if (parts.length <= 1) {
      return;
    }
    setParts((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleUpdatePollOption = (index: number, value: string) => {
    setPollOptions((prev) => prev.map((opt, idx) => (idx === index ? value : opt)));
  };

  const handleAddPollOption = () => {
    if (pollOptions.length >= 4) {
      return;
    }
    setPollOptions((prev) => [...prev, '']);
  };

  const handleRemovePollOption = (index: number) => {
    if (pollOptions.length <= 2) {
      return;
    }
    setPollOptions((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (parts.length > 1 && parts.some((p) => p.body.trim().length === 0)) {
      setFormError('Vui lòng nhập nội dung cho tất cả các phần trong chuỗi hoặc xóa phần trống.');
      return;
    }

    const cleanedParts = parts.map((p) => p.body.trim()).filter(Boolean);
    if (cleanedParts.length === 0) {
      setFormError('Vui lòng nhập nội dung cho bài viết.');
      return;
    }

    if (cleanedParts.some((p) => p.length > MAX_BODY_CHARS)) {
      setFormError(`Mỗi đoạn trong chuỗi bài viết tối đa ${MAX_BODY_CHARS} ký tự.`);
      return;
    }

    let pollPayload:
      | { question?: string | null; options: string[]; expires_in_hours?: number | null }
      | undefined;

    if (pollEnabled) {
      const cleanedOptions = pollOptions.map((o) => o.trim()).filter(Boolean);
      if (cleanedOptions.length < 2) {
        setFormError('Bình chọn cần ít nhất 2 phương án có nội dung.');
        return;
      }
      const uniqueOptions = new Set(cleanedOptions.map((o) => o.toLowerCase()));
      if (uniqueOptions.size !== cleanedOptions.length) {
        setFormError('Các phương án bình chọn không được trùng lặp.');
        return;
      }
      pollPayload = {
        question: pollQuestion.trim() || null,
        options: cleanedOptions,
        expires_in_hours: pollExpiryHours > 0 ? pollExpiryHours : null,
      };
    }

    createPost.mutate(
      {
        items: cleanedParts.map((body) => ({ body })),
        topic_tag_id: selectedTopicId,
        reply_control: replyControl,
        ...(pollPayload ? { poll: pollPayload } : {}),
      },
      {
        onSuccess: () => {
          resetForm();
          onOpenChange(false);
        },
        onError: (error) => {
          setFormError(
            getApiError(error, 'Không thể đăng bài lúc này. Vui lòng kiểm tra lại nội dung.')
              .message,
          );
        },
      },
    );
  };

  const hasValidBody = parts.some(
    (p) => p.body.trim().length > 0 && p.body.trim().length <= MAX_BODY_CHARS,
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90dvh] w-full flex-col gap-0 overflow-hidden rounded-2xl border border-slate-200 bg-white p-0 sm:max-w-xl">
        <DialogHeader className="border-b border-slate-100 px-5 py-3.5">
          <div className="flex items-center justify-between pr-8">
            <DialogTitle className="flex items-center gap-2 text-base font-extrabold text-brand-950">
              <Sparkles className="h-4 w-4 text-teal-brand" />
              Tạo chuỗi thảo luận mới
            </DialogTitle>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
            {/* Topic selector */}
            {topics.length > 0 && (
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Chủ đề kỹ năng mềm
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {topics.map((topic) => {
                    const active = selectedTopicId === topic.id;
                    return (
                      <button
                        key={topic.id}
                        type="button"
                        onClick={() => {
                          hasTouchedTopicRef.current = true;
                          setSelectedTopicId(active ? null : topic.id);
                        }}
                        className={cn(
                          'rounded-full border px-3 py-1 text-xs font-semibold transition-colors cursor-pointer',
                          active
                            ? 'border-brand-900 bg-brand-900 text-white'
                            : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300',
                        )}
                      >
                        #{topic.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Self-thread composer parts */}
            <div className="space-y-0">
              {parts.map((part, index) => {
                const isLast = index === parts.length - 1;
                const charCount = part.body.length;
                const nearLimit = charCount >= 450;

                return (
                  <div
                    key={part.id}
                    className="grid grid-cols-[40px_minmax(0,1fr)] gap-3 pb-3"
                  >
                    <div className="flex flex-col items-center">
                      <CommunityAuthorAvatar author={authorSummary} size="md" />
                      {!isLast && (
                        <span
                          aria-hidden="true"
                          className="mt-1.5 min-h-8 w-0.5 flex-1 rounded-full bg-slate-200"
                        />
                      )}
                    </div>

                    <div className="min-w-0 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold text-slate-800">
                          {currentUser?.name ?? 'Bạn'}
                          {parts.length > 1 && (
                            <span className="ml-2 text-[11px] font-medium text-slate-400">
                              Phần {index + 1}/{parts.length}
                            </span>
                          )}
                        </span>

                        {parts.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemovePart(index)}
                            aria-label={`Xóa phần ${index + 1}`}
                            className="inline-flex h-6 w-6 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600 cursor-pointer"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>

                      <textarea
                        value={part.body}
                        onChange={(e) => handleUpdatePart(index, e.target.value)}
                        rows={index === 0 ? 3 : 2}
                        maxLength={MAX_BODY_CHARS}
                        placeholder={
                          index === 0
                            ? 'Chia sẻ tình huống giao tiếp, thuyết trình hoặc đặt câu hỏi cho cộng đồng...'
                            : 'Viết tiếp ý trong chuỗi của bạn...'
                        }
                        className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 py-2.5 text-sm leading-relaxed text-slate-800 outline-none focus:border-brand-700 focus:bg-white"
                      />

                      <div className="flex items-center justify-between text-[11px]">
                        <div className="flex items-center gap-2">
                          {index === 0 && (
                            <button
                              type="button"
                              onClick={() => setPollEnabled((prev) => !prev)}
                              className={cn(
                                'inline-flex items-center gap-1 rounded-full border px-2.5 py-1 font-semibold transition-colors cursor-pointer',
                                pollEnabled
                                  ? 'border-brand-700 bg-brand-50 text-brand-900'
                                  : 'border-slate-200 text-slate-600 hover:bg-slate-50',
                              )}
                            >
                              <BarChart3 className="h-3.5 w-3.5" />
                              {pollEnabled ? 'Bỏ bình chọn' : 'Thêm bình chọn'}
                            </button>
                          )}
                        </div>

                        <span
                          className={cn(
                            'tabular-nums font-medium',
                            nearLimit ? 'text-amber-600 font-bold' : 'text-slate-400',
                          )}
                        >
                          {charCount}/{MAX_BODY_CHARS}
                        </span>
                      </div>

                      {/* Poll Builder attached to root post */}
                      {index === 0 && pollEnabled && (
                        <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-3.5 space-y-2.5">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-700">
                              Cuộc bình chọn nhanh
                            </span>
                            <select
                              value={pollExpiryHours}
                              onChange={(e) => setPollExpiryHours(Number(e.target.value))}
                              aria-label="Thời hạn bình chọn"
                              className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-medium text-slate-600 outline-none"
                            >
                              <option value={24}>Kết thúc sau 24 giờ</option>
                              <option value={72}>Kết thúc sau 3 ngày</option>
                              <option value={168}>Kết thúc sau 7 ngày</option>
                              <option value={0}>Không giới hạn</option>
                            </select>
                          </div>

                          <input
                            value={pollQuestion}
                            onChange={(e) => setPollQuestion(e.target.value)}
                            maxLength={200}
                            placeholder="Câu hỏi bình chọn (không bắt buộc)..."
                            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 outline-none focus:border-brand-700"
                          />

                          <div className="space-y-2">
                            {pollOptions.map((opt, optIdx) => (
                              <div key={optIdx} className="flex items-center gap-2">
                                <input
                                  value={opt}
                                  onChange={(e) => handleUpdatePollOption(optIdx, e.target.value)}
                                  maxLength={100}
                                  placeholder={`Lựa chọn ${optIdx + 1}`}
                                  className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 outline-none focus:border-brand-700"
                                />
                                {pollOptions.length > 2 && (
                                  <button
                                    type="button"
                                    onClick={() => handleRemovePollOption(optIdx)}
                                    aria-label={`Xóa lựa chọn ${optIdx + 1}`}
                                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-200/60 hover:text-rose-600 cursor-pointer"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                )}
                              </div>
                            ))}
                          </div>

                          {pollOptions.length < 4 && (
                            <button
                              type="button"
                              onClick={handleAddPollOption}
                              className="inline-flex items-center gap-1 text-xs font-semibold text-brand-800 hover:text-brand-950 cursor-pointer"
                            >
                              <Plus className="h-3.5 w-3.5" />
                              Thêm lựa chọn (tối đa 4)
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {parts.length < MAX_THREAD_PARTS && (
                <div className="grid grid-cols-[40px_minmax(0,1fr)] gap-3 pt-1">
                  <div className="flex justify-center">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full border border-dashed border-slate-300 text-slate-400">
                      <Plus className="h-3.5 w-3.5" />
                    </span>
                  </div>
                  <div>
                    <button
                      type="button"
                      onClick={handleAddPart}
                      className="text-xs font-semibold text-slate-500 hover:text-brand-900 cursor-pointer"
                    >
                      + Thêm vào chuỗi ({parts.length}/{MAX_THREAD_PARTS})
                    </button>
                  </div>
                </div>
              )}
            </div>

            {formError && (
              <p className="rounded-xl bg-rose-50 px-3.5 py-2 text-xs font-medium text-rose-700">
                {formError}
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 bg-slate-50/70 px-5 py-3">
            <label className="inline-flex items-center gap-1.5 text-xs text-slate-600">
              <Lock className="h-3.5 w-3.5 text-slate-400" />
              <select
                value={replyControl}
                onChange={(e) => setReplyControl(e.target.value as ReplyControl)}
                aria-label="Ai có thể trả lời"
                className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 outline-none focus:border-brand-700"
              >
                {REPLY_CONTROL_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </label>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onOpenChange(false)}
                className="rounded-full text-xs font-semibold text-slate-600"
              >
                Hủy
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={!hasValidBody || createPost.isPending}
                className="rounded-full bg-brand-900 px-5 text-xs font-bold text-white hover:bg-brand-800"
              >
                <Send className="mr-1.5 h-3.5 w-3.5" />
                {createPost.isPending ? 'Đang đăng...' : 'Đăng bài'}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
