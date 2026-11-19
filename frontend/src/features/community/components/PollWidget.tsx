import { useState } from 'react';
import { CheckCircle2, Clock } from 'lucide-react';
import { getApiError } from '@/core/api/client';
import { cn } from '@/core/utils/cn';
import type { CommunityPoll } from '../types/community';
import { useVotePollMutation } from '../api/useCommunityMutations';

interface PollWidgetProps {
  poll: CommunityPoll;
}

function isPollExpired(expiresAt: string | null): boolean {
  if (!expiresAt) {
    return false;
  }
  const ts = Date.parse(expiresAt);
  return Number.isFinite(ts) && ts < Date.now();
}

function formatExpiryLabel(expiresAt: string | null): string | null {
  if (!expiresAt) {
    return null;
  }
  const diffMs = Date.parse(expiresAt) - Date.now();
  if (!Number.isFinite(diffMs)) {
    return null;
  }
  if (diffMs <= 0) {
    return 'Đã kết thúc';
  }
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  if (hours >= 24) {
    return `Còn ${Math.ceil(hours / 24)} ngày`;
  }
  if (hours >= 1) {
    return `Còn ${hours} giờ`;
  }
  const minutes = Math.max(1, Math.floor(diffMs / (1000 * 60)));
  return `Còn ${minutes} phút`;
}

export function PollWidget({ poll }: PollWidgetProps) {
  const voteMutation = useVotePollMutation();
  const [localExpired, setLocalExpired] = useState(false);
  const expired = localExpired || isPollExpired(poll.expires_at);
  const expiryLabel = formatExpiryLabel(poll.expires_at);
  const hasVoted = poll.viewer_selected_option_id !== null;
  const showResults = hasVoted || expired;
  const voteError = localExpired
    ? 'Bình chọn này đã kết thúc.'
    : voteMutation.isError
      ? getApiError(voteMutation.error, 'Không thể ghi nhận bình chọn lúc này.').message
      : null;

  const handleSelectOption = (optionId: number) => {
    if (isPollExpired(poll.expires_at)) {
      setLocalExpired(true);
      return;
    }
    if (expired || voteMutation.isPending) {
      return;
    }
    if (poll.viewer_selected_option_id === optionId) {
      return;
    }
    voteMutation.mutate({ pollId: poll.id, optionId });
  };

  return (
    <div
      className="mt-3 rounded-2xl border border-slate-200/90 bg-slate-50/70 p-3.5"
      onClick={(e) => e.stopPropagation()}
    >
      {poll.question && (
        <p className="mb-2.5 text-xs font-bold text-slate-800">{poll.question}</p>
      )}

      <div className="space-y-2">
        {poll.options.map((option) => {
          const isSelected = poll.viewer_selected_option_id === option.id;
          const percentage =
            poll.total_votes > 0
              ? Math.round((option.votes_count / poll.total_votes) * 100)
              : 0;

          return (
            <button
              key={option.id}
              type="button"
              disabled={expired}
              aria-pressed={isSelected}
              onClick={() => handleSelectOption(option.id)}
              className={cn(
                'relative flex w-full items-center justify-between overflow-hidden rounded-xl border px-3.5 py-2.5 text-left text-xs transition-all',
                expired ? 'cursor-default' : 'cursor-pointer',
                isSelected
                  ? 'border-brand-700 bg-white font-semibold text-brand-950 shadow-2xs'
                  : 'border-slate-200 bg-white text-slate-700 hover:border-brand-300',
              )}
            >
              {showResults && (
                <span
                  aria-hidden="true"
                  className={cn(
                    'absolute inset-y-0 left-0 transition-all duration-300',
                    isSelected ? 'bg-brand-100/80' : 'bg-slate-100/90',
                  )}
                  style={{ width: `${percentage}%` }}
                />
              )}

              <span className="relative z-10 flex min-w-0 items-center gap-2 pr-2">
                {isSelected && (
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-brand-700" />
                )}
                <span className="truncate">{option.label}</span>
              </span>

              {showResults && (
                <span
                  className={cn(
                    'relative z-10 shrink-0 tabular-nums font-bold',
                    isSelected ? 'text-brand-900' : 'text-slate-500',
                  )}
                >
                  {percentage}%
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500">
        <span className="tabular-nums font-medium">
          {poll.total_votes.toLocaleString('vi-VN')} lượt bình chọn
          {!expired && hasVoted ? ' · Nhấn lựa chọn khác để đổi' : ''}
        </span>
        {expiryLabel && (
          <span className="inline-flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {expiryLabel}
          </span>
        )}
      </div>
      {voteError && (
        <p className="mt-2 text-[11px] font-medium text-rose-600">{voteError}</p>
      )}
    </div>
  );
}
