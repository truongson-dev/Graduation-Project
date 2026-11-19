import React from 'react';
import { Heart, MessageCircle, MessageSquare } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { ProfilePost } from '../types/profile';

export interface ProfilePostsListProps {
  posts: ProfilePost[];
}

export const ProfilePostsList: React.FC<ProfilePostsListProps> = ({ posts }) => {
  const formatPostDate = (isoString?: string | null): string => {
    if (!isoString) return '';
    try {
      const date = new Date(isoString);
      return new Intl.DateTimeFormat('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      }).format(date);
    } catch {
      return '';
    }
  };

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-bold text-slate-900">
          Bài viết cộng đồng
        </h2>
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
          {posts.length} bài
        </span>
      </div>

      {posts.length > 0 ? (
        <div className="space-y-3">
          {posts.map((post) => {
            const dateStr = formatPostDate(post.created_at);
            return (
              <div
                key={post.id}
                className="rounded-xl border border-slate-100 bg-slate-50/50 p-4 transition hover:bg-slate-50 hover:border-slate-200"
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  {post.topic ? (
                    <Badge
                      variant="secondary"
                      className="bg-blue-50 text-blue-700 hover:bg-blue-100 text-xs font-medium"
                    >
                      {post.topic}
                    </Badge>
                  ) : (
                    <div />
                  )}
                  {dateStr && (
                    <span className="text-xs text-slate-400">{dateStr}</span>
                  )}
                </div>

                <p className="text-sm text-slate-800 whitespace-pre-line leading-relaxed">
                  {post.content}
                </p>

                <div className="flex items-center gap-4 mt-3 pt-3 border-t border-slate-100 text-xs text-slate-500">
                  <div className="flex items-center gap-1.5">
                    <Heart className="size-3.5 text-rose-500" />
                    <span>{post.likes_count}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <MessageCircle className="size-3.5 text-blue-500" />
                    <span>{post.replies_count}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400 mb-3">
            <MessageSquare className="size-6" />
          </div>
          <p className="text-sm font-medium text-slate-600">
            Chưa có bài viết nào
          </p>
          <p className="text-xs text-slate-400 mt-1">
            Các bài viết và thảo luận bạn đăng tải trên cộng đồng sẽ xuất hiện tại đây.
          </p>
        </div>
      )}
    </div>
  );
};
