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
  incomingFriendRequestIds: string[];
  outgoingFriendRequestIds: string[];
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

export type RoundFormat = 'individual' | 'scramble2' | 'scramble3' | 'scramble4';
export type LegacyGameMode = 'stroke' | 'scramble';
export type GameMode = RoundFormat;
export type RoundVisibility = 'friends' | 'public';
export type CourseProviderId = 'mock' | 'manual' | 'golfapi' | 'golfcourseapi' | 'igolf' | 'opengolfapi';

export type TeeBox = {
  id: string;
  name: string;
  color: string;
  totalYards: number | null;
  rating: number | null;
  slope: number | null;
};

export type CourseHole = {
  number: number;
  par: number;
  handicapIndex: number | null;
  yardagesByTee: Record<string, number>;
};

export type RoundHoleScore = {
  holeNumber: number;
  score: number;
};

export type Course = {
  id: string;
  groupId: string;
  sourceId: string;
  sourceProvider: CourseProviderId;
  name: string;
  location: string;
  city: string;
  state: string;
  country: string;
  latitude: number | null;
  longitude: number | null;
  holesCount: number;
  par: number;
  tees: TeeBox[];
  holes: CourseHole[];
  createdBy: string;
  createdAt: string;
};

export type Round = {
  id: string;
  groupId: string | null;
  relatedGroupIds: string[];
  courseId: string;
  courseSourceId: string;
  courseSourceProvider: CourseProviderId;
  courseName: string;
  createdBy: string;
  userId: string;
  playerIds: string[];
  playerNames: string[];
  playerName: string;
  totalScore: number;
  scoreToPar: number | null;
  format: RoundFormat;
  gameMode: GameMode;
  teeBoxId: string | null;
  teeBoxName: string;
  holesPlayed: 9 | 18;
  holeScores: RoundHoleScore[];
  teamName: string;
  teamMemberIds: string[];
  dateKey: string;
  playedOn: string;
  notes: string;
  photoUrls: string[];
  visibility: RoundVisibility;
  locationVerified: boolean;
  distanceFromCourseMeters: number | null;
  createdAt: string;
};

export type Habit = {
  id: string;
  userId: string;
  groupId: string;
  challengeId: string;
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

export type LeagueChallengeStatus = 'active' | 'archived' | 'completed';

export type LeagueChallenge = {
  id: string;
  groupId: string;
  title: string;
  emoji: string;
  category: string;
  description: string;
  frequency: string;
  createdBy: string;
  createdAt: string;
  status: LeagueChallengeStatus;
  startDateKey: string;
  endDateKey: string | null;
  archivedAt: string | null;
  archivedBy: string | null;
  completedAt: string | null;
  winnerUserId: string | null;
  winnerDisplayName: string | null;
  active: boolean;
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

export type ActivityType =
  | 'check_in'
  | 'rank_movement'
  | 'league_join'
  | 'connection'
  | 'challenge_update'
  | 'round_logged'
  | 'personal_best'
  | 'course_leader';

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
  courseId: string | null;
  courseName: string | null;
  roundId: string | null;
  gameMode: GameMode | null;
  score: number | null;
  scoreToPar: number | null;
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
  courseId?: string | null;
  courseName?: string | null;
  roundId?: string | null;
  gameMode?: GameMode | null;
  score?: number | null;
  scoreToPar?: number | null;
  targetUserId?: string | null;
  targetUserName?: string | null;
  summaryOverride?: string;
  spotsMoved?: number;
  rank?: number | null;
};

export type AppBundle = {
  profile: Profile;
  habits: Habit[];
  groups: Group[];
  courses: Course[];
  rounds: Round[];
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
  challenges: LeagueChallenge[];
  challengeParticipations: Habit[];
  courses: Course[];
  rounds: Round[];
  leaderboard: LeaderboardEntry[];
  previousWeekLeaderboard: LeaderboardEntry[];
};

export type CourseLeaderboardEntry = {
  entryId: string;
  userId: string | null;
  name: string;
  totalScore: number;
  scoreToPar: number | null;
  playedOn: string;
  roundsPlayed: number;
  format: RoundFormat;
  gameMode: GameMode;
  visibility: RoundVisibility;
  groupId: string | null;
  teamName: string | null;
  locationVerified: boolean;
  distanceFromCourseMeters: number | null;
  indicatorLabel: string;
};

export type PersonalBest = {
  roundId: string;
  totalScore: number;
  scoreToPar: number | null;
  playedOn: string;
  improvement: number | null;
};

export type UserSearchResult = {
  uid: string;
  name: string;
  username: string;
  bio: string;
  sharedGroupNames: string[];
  isConnected: boolean;
  friendState: 'none' | 'requested' | 'incoming' | 'friends';
};

export type FriendRequestProfile = {
  uid: string;
  name: string;
  username: string;
  bio: string;
};

export type DemoStore = {
  currentUserId: string | null;
  users: Record<string, { uid: string; email: string; password: string }>;
  profiles: Record<string, Profile>;
  challenges: Record<string, LeagueChallenge>;
  habits: Record<string, Habit>;
  courses: Record<string, Course>;
  rounds: Record<string, Round>;
  groups: Record<string, Group>;
  groupMessages: Record<string, GroupMessage[]>;
  activities: ActivityItem[];
};
