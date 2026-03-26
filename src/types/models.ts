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
};

export type Habit = {
  id: string;
  userId: string;
  title: string;
  emoji: string;
  category: string;
  createdAt: string;
  checkIns: string[];
};

export type Group = {
  id: string;
  name: string;
  description: string;
  ownerId: string;
  memberIds: string[];
  joinCode: string;
  createdAt: string;
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
};

export type DemoStore = {
  currentUserId: string | null;
  users: Record<string, { uid: string; email: string; password: string }>;
  profiles: Record<string, Profile>;
  habits: Record<string, Habit>;
  groups: Record<string, Group>;
};
