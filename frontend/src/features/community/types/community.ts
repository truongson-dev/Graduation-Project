export type CommunityFeedTab = 'for_you' | 'following' | 'saved' | 'liked';

export type ReplyControl =
  | 'everyone'
  | 'followers'
  | 'following'
  | 'mentioned_only'
  | 'locked';

export type CommunityPostStatus = 'published' | 'archived' | 'removed' | 'deleted';

export type CommunityReactionType = 'like' | 'bookmark';

export interface CommunityAuthor {
  id: number;
  name: string;
  username: string;
  headline: string;
  avatar_url: string | null;
}

export interface CommunityTopicTag {
  id: number;
  slug: string;
  name: string;
  description: string | null;
  color_token: string;
  posts_count: number;
}

export interface CommunityPollOption {
  id: number;
  label: string;
  votes_count: number;
  sort_order: number;
}

export interface CommunityPoll {
  id: number;
  question: string | null;
  expires_at: string | null;
  total_votes: number;
  viewer_selected_option_id: number | null;
  options: CommunityPollOption[];
}

export interface CommunityViewerState {
  liked: boolean;
  bookmarked: boolean;
  reposted: boolean;
  following?: boolean;
}

export interface CommunityPost {
  id: number;
  root_id: number | null;
  parent_id: number | null;
  thread_group_id: number | null;
  depth: number;
  body: string | null;
  reply_control: ReplyControl;
  status: CommunityPostStatus;
  is_hidden_by_author: boolean;
  likes_count: number;
  replies_count: number;
  reposts_count: number;
  quotes_count: number;
  hot_score: string;
  created_at: string | null;
  author: CommunityAuthor | null;
  topic_tag: CommunityTopicTag | null;
  poll: CommunityPoll | null;
  repost_of: CommunityPost | null;
  quote_post: CommunityPost | null;
  self_thread_items: CommunityPost[];
  viewer: CommunityViewerState;
}

export interface CommunityFeedMeta {
  next_cursor: string | null;
  has_more: boolean;
}

export interface CommunityFeedResponse {
  data: CommunityPost[];
  meta: CommunityFeedMeta;
}

export interface CommunityThreadDetailData {
  post: CommunityPost;
  root_author_id?: number | null;
  ancestors: CommunityPost[];
  self_thread_items: CommunityPost[];
  replies: CommunityPost[];
}

export interface CreateCommunityPostPayload {
  items: Array<{ body: string }>;
  topic_tag_id?: number | null;
  reply_control?: ReplyControl;
  quote_post_id?: number | null;
  poll?: {
    question?: string | null;
    options: string[];
    expires_in_hours?: number | null;
  } | null;
}

export interface ToggleReactionResponse {
  post_id: number;
  type: CommunityReactionType;
  active: boolean;
  likes_count: number;
}

export interface ToggleRepostResponse {
  post_id: number;
  active: boolean;
  reposts_count: number;
}

export interface VotePollResponse {
  poll_id: number;
  selected_option_id: number;
  total_votes: number;
  options: CommunityPollOption[];
}

export interface ToggleFollowResponse {
  user_id: number;
  following: boolean;
}

export interface CommunityPersonResult extends CommunityAuthor {
  following: boolean;
}

export type CommunitySearchFilter = 'top' | 'latest' | 'people';

export interface CommunityTrendingItem {
  id: string;
  title: string;
  summary: string;
  posts_count: number;
  topic_slug: string | null;
  post_ids: number[];
}

export interface CommunityTrendingResponse {
  data: CommunityTrendingItem[];
  meta: {
    generated_at: string;
  };
}
