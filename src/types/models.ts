export type SessionUser = {
  uid: string;
  email: string;
};

export type Profile = {
  uid: string;
  email: string;
  name: string;
  username: string;
  bio: string;
  weeklyGoal: number;
  onboardingCompleted: boolean;
  groupIds: string[];
  friendIds: string[];
  shopInventory: ShopInventory;
};

export type ShopProductId = 'restore_streak' | 'streak_freeze' | 'premium_placeholder';

export type ShopInventory = {
  streakRestoreCredits: number;
  streakRestoreCooldownUntil: string | null;
  streakFreezeCredits: number;
  streakFreezeCooldownUntil: string | null;
  premiumPlaceholderOwned: boolean;
};

export type Habit = {
  id: string;
  userId: string;
  title: string;
  emoji: string;
  category: string;
  createdAt: string;
  checkIns: string[];
  restoreUsedForDate: string | null;
  restoreUsedAt: string | null;
};

export type HabitRestoreEligibility = {
  canRestoreStreak: boolean;
  brokenOn: string | null;
  lostStreak: number;
  restoreBy: string | null;
  restoreUsed: boolean;
  premiumRestorePlaceholder: boolean;
};

export type HabitStreakStatus = {
  currentStreak: number;
  checkedInToday: boolean;
  checkedInYesterday: boolean;
  justBroken: boolean;
  lastCompletedDate: string | null;
  restoreEligibility: HabitRestoreEligibility;
};

export type Group = {
  id: string;
  name: string;
  description: string;
  ownerId: string;
  memberIds: string[];
  joinCode: string;
  visibility: 'public' | 'private';
  inviteOnly: boolean;
  discoverable: boolean;
  stakesEnabled: boolean;
  stakesText: string;
  memberLimit: number | null;
  createdAt: string;
};

export type GroupSettingsInput = {
  name: string;
  description: string;
  visibility: 'public' | 'private';
  stakesEnabled: boolean;
  stakesText: string;
  memberLimit?: number | null;
};

export type GroupMessage = {
  id: string;
  groupId: string;
  senderId: string;
  senderName: string;
  text: string;
  createdAt: string;
};

export type ActivityType = 'check_in' | 'rank_movement' | 'league_join' | 'connection';

export type ActivityShoutoutType = 'keep_going' | 'on_fire' | 'nice_work';

export type ActivityShoutouts = Record<ActivityShoutoutType, string[]>;

export type ActivityItem = {
  id: string;
  type: ActivityType;
  actorId: string;
  actorName: string;
  groupId: string | null;
  groupName: string | null;
  habitId: string | null;
  habitTitle: string | null;
  targetUserId: string | null;
  targetUserName: string | null;
  summary: string;
  createdAt: string;
  shoutouts: ActivityShoutouts;
};

export type ActivityInput = {
  type: ActivityType;
  actorId: string;
  actorName: string;
  groupId?: string | null;
  groupName?: string | null;
  habitId?: string | null;
  habitTitle?: string | null;
  targetUserId?: string | null;
  targetUserName?: string | null;
  spotsMoved?: number;
  rank?: number | null;
};

export type AppBundle = {
  profile: Profile;
  habits: Habit[];
  groups: Group[];
};

export type LeaderboardEntry = {
  userId: string;
  name: string;
  weeklyCheckIns: number;
  completedHabits: number;
};

export type GroupDetails = {
  group: Group;
  members: Profile[];
  leaderboard: LeaderboardEntry[];
  previousWeekLeaderboard: LeaderboardEntry[];
};

export type UserSearchResult = {
  uid: string;
  name: string;
  username: string;
  bio: string;
  sharedGroupNames: string[];
  isConnected: boolean;
};

export type DemoStore = {
  currentUserId: string | null;
  users: Record<string, { uid: string; email: string; password: string }>;
  profiles: Record<string, Profile>;
  habits: Record<string, Habit>;
  groups: Record<string, Group>;
  groupMessages: Record<string, GroupMessage[]>;
  activities: ActivityItem[];
};
