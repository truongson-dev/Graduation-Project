export interface UserProfileUser {
  id: number;
  name: string;
  email: string | null;
  avatar_url?: string | null;
  created_at?: string | null;
}

export interface ProfileCommunityProfile {
  username?: string | null;
  headline?: string | null;
  bio?: string | null;
}

export interface ProfileStats {
  presentation_count: number;
  average_score: number;
  practice_duration_minutes: number;
  followers_count: number;
  following_count: number;
}

export interface ProfileAchievement {
  id: string;
  name: string;
  icon: string;
  unlocked_at?: string | null;
}

export interface ProfilePost {
  id: number;
  content: string;
  topic?: string | null;
  likes_count: number;
  replies_count: number;
  created_at?: string | null;
}

export interface UserProfileData {
  user: UserProfileUser;
  community_profile?: ProfileCommunityProfile | null;
  stats: ProfileStats;
  achievements: ProfileAchievement[];
  posts: ProfilePost[];
  is_own_profile: boolean;
  is_following?: boolean;
}

export interface UpdateProfilePayload {
  name?: string;
  username?: string | null;
  avatar_url?: string | null;
  headline?: string | null;
  bio?: string | null;
}

export interface ChangePasswordPayload {
  current_password: string;
  new_password: string;
  new_password_confirmation: string;
}

export interface ChangePasswordResponse {
  message: string;
}
