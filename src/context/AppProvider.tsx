import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, PropsWithChildren, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import {
  addActivityShoutout as addActivityShoutoutRequest,
  acceptFriendRequest as acceptFriendRequestRequest,
  createCourse as createCourseRequest,
  createGroup as createGroupRequest,
  createLeagueChallenge as createHabitRequest,
  declineFriendRequest as declineFriendRequestRequest,
  getGroupDetails,
  initializeUserProfile,
  joinGroup as joinGroupRequest,
  joinPublicGroup as joinPublicGroupRequest,
  listPublicGroups as listPublicGroupsRequest,
  loadActivityFeed as loadActivityFeedRequest,
  loadGroupMessages as loadGroupMessagesRequest,
  loadIncomingFriendRequests as loadIncomingFriendRequestsRequest,
  logRound as logRoundRequest,
  recordActivity as recordActivityRequest,
  respondToRoundInvite as respondToRoundInviteRequest,
  searchCourseCatalog as searchCourseCatalogRequest,
  sendFriendRequest as sendFriendRequestRequest,
  loadUserBundle,
  restoreSession,
  restoreHabitStreak as restoreHabitStreakRequest,
  saveProfile as saveProfileRequest,
  sendGroupMessage as sendGroupMessageRequest,
  searchUsers as searchUsersRequest,
  signIn as signInRequest,
  signOut as signOutRequest,
  signUp as signUpRequest,
  startActiveRound as startActiveRoundRequest,
  toggleHabitCheckIn as toggleHabitCheckInRequest,
  updateActiveRound as updateActiveRoundRequest,
  updateLeagueChallengeLifecycle as updateLeagueChallengeLifecycleRequest,
  updateGroup as updateGroupRequest,
  updateRoundVisibility as updateRoundVisibilityRequest,
  completeActiveRound as completeActiveRoundRequest,
  usingFirebaseBackend,
} from '@/lib/data';
import { consumeRestoreStreak } from '@/lib/shop';
import {
  ActivityInput,
  ActivityItem,
  ActivityShoutoutType,
  ActiveRound,
  AppBundle,
  Course,
  CourseHole,
  FriendRequestProfile,
  GroupDetails,
  GroupMessage,
  GroupSettingsInput,
  Habit,
  Profile,
  Round,
  RoundFormat,
  RoundHoleScore,
  RoundInvite,
  RoundInviteStatus,
  RoundVisibility,
  SessionUser,
  TeeBox,
  UserSearchResult,
} from '@/types/models';
import { CourseSearchResult } from '@/lib/courseProviders';

const FIREBASE_ACCESS_ERROR_MESSAGE =
  'Firebase Auth succeeded, but Rivl could not read or create app data. Update Firestore rules for profiles, groups, courses, rounds, active rounds, round invites, and activities, then try again.';

type ActionResult = {
  ok: boolean;
  message: string;
};

type GroupActionResult = ActionResult & {
  groupId?: string;
};

type AppContextValue = {
  authReady: boolean;
  busy: boolean;
  refreshing: boolean;
  usingFirebase: boolean;
  session: SessionUser | null;
  profile: Profile | null;
  shopInventory: Profile['shopInventory'] | null;
  habits: Habit[];
  groups: AppBundle['groups'];
  courses: Course[];
  rounds: Round[];
  activeRounds: ActiveRound[];
  roundInvites: RoundInvite[];
  searchCourses: (searchTerm: string) => Promise<CourseSearchResult[]>;
  signIn: (email: string, password: string) => Promise<ActionResult>;
  signUp: (name: string, email: string, password: string) => Promise<ActionResult>;
  signOut: () => Promise<void>;
  saveProfile: (patch: Partial<Profile>) => Promise<ActionResult>;
  createHabit: (input: { groupId: string; title: string; emoji: string; category: string; description?: string; frequency?: string }) => Promise<ActionResult>;
  updateLeagueChallengeLifecycle: (challengeId: string, action: 'archive' | 'complete' | 'reactivate') => Promise<ActionResult>;
  toggleHabitCheckIn: (habitId: string) => Promise<void>;
  restoreHabitStreak: (habitId: string) => Promise<ActionResult>;
  createGroup: (input: GroupSettingsInput) => Promise<GroupActionResult>;
  createCourse: (input: {
    groupId?: string | null;
    sourceId?: string;
    sourceProvider?: Course['sourceProvider'];
    name: string;
    location: string;
    city?: string;
    state?: string;
    country?: string;
    latitude?: number | null;
    longitude?: number | null;
    holesCount?: number;
    par: number;
    tees?: TeeBox[];
    holes?: CourseHole[];
  }) => Promise<ActionResult>;
  logRound: (input: {
    groupId?: string | null;
    relatedGroupIds?: string[];
    courseId: string;
    format: RoundFormat;
    playedOn: string;
    teeBoxId?: string | null;
    holesPlayed: 9 | 18;
    totalScore: number;
    holeScores?: RoundHoleScore[];
    playerIds: string[];
    playerNames: string[];
    teamName?: string;
    visibility: RoundVisibility;
    notes?: string;
    locationVerified?: boolean;
    distanceFromCourseMeters?: number | null;
  }) => Promise<ActionResult>;
  startActiveRound: (input: {
    groupId?: string | null;
    relatedGroupIds?: string[];
    courseId: string;
    format: RoundFormat;
    teeBoxId?: string | null;
    holesPlayed: 9 | 18;
    playerIds: string[];
    playerNames: string[];
    teamName?: string;
    visibility: RoundVisibility;
    locationVerified?: boolean;
    distanceFromCourseMeters?: number | null;
  }) => Promise<ActionResult & { activeRound?: ActiveRound }>;
  updateActiveRound: (input: { activeRoundId: string; holeScores?: RoundHoleScore[]; activeHoleIndex?: number }) => Promise<ActionResult>;
  completeActiveRound: (activeRoundId: string) => Promise<ActionResult>;
  respondToRoundInvite: (inviteId: string, status: Extract<RoundInviteStatus, 'accepted' | 'declined'>) => Promise<ActionResult>;
  updateRoundVisibility: (roundId: string, visibility: RoundVisibility) => Promise<ActionResult>;
  updateGroup: (groupId: string, input: GroupSettingsInput) => Promise<ActionResult>;
  joinGroup: (joinCode: string) => Promise<GroupActionResult>;
  joinPublicGroup: (groupId: string) => Promise<GroupActionResult>;
  listPublicGroups: () => Promise<AppBundle['groups']>;
  searchUsers: (searchTerm: string) => Promise<UserSearchResult[]>;
  sendFriendRequest: (userId: string) => Promise<ActionResult>;
  getIncomingFriendRequests: () => Promise<FriendRequestProfile[]>;
  acceptFriendRequest: (userId: string) => Promise<ActionResult>;
  declineFriendRequest: (userId: string) => Promise<ActionResult>;
  getGroupDetails: (groupId: string) => Promise<GroupDetails | null>;
  getGroupMessages: (groupId: string) => Promise<GroupMessage[]>;
  sendGroupMessage: (groupId: string, text: string) => Promise<ActionResult>;
  getActivityFeed: (groupId?: string) => Promise<ActivityItem[]>;
  recordActivity: (input: Omit<ActivityInput, 'actorId' | 'actorName'>) => Promise<void>;
  addActivityShoutout: (activityId: string, shoutoutType: ActivityShoutoutType) => Promise<ActionResult>;
};

const AppContext = createContext<AppContextValue | undefined>(undefined);

export function AppProvider({ children, fallback }: PropsWithChildren<{ fallback?: ReactNode }>) {
  const [authReady, setAuthReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [session, setSession] = useState<SessionUser | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [groups, setGroups] = useState<AppBundle['groups']>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [rounds, setRounds] = useState<Round[]>([]);
  const [activeRounds, setActiveRounds] = useState<ActiveRound[]>([]);
  const [roundInvites, setRoundInvites] = useState<RoundInvite[]>([]);

  const hydrateBundle = useCallback((bundle: AppBundle | null) => {
    setProfile(bundle?.profile ?? null);
    setHabits(bundle?.habits ?? []);
    setGroups(bundle?.groups ?? []);
    setCourses(bundle?.courses ?? []);
    setRounds(bundle?.rounds ?? []);
    setActiveRounds(bundle?.activeRounds ?? []);
    setRoundInvites(bundle?.roundInvites ?? []);
  }, []);

  const getBootstrapErrorMessage = useCallback((error: unknown) => {
    if (error instanceof Error && error.message.includes('Missing or insufficient permissions')) {
      return FIREBASE_ACCESS_ERROR_MESSAGE;
    }

    if (error instanceof Error && error.message) {
      return error.message;
    }

    return 'Something went wrong while loading your account. Please try again.';
  }, []);

  const completeAuthenticatedSession = useCallback(
    async (user: SessionUser, name = '') => {
      try {
        await initializeUserProfile(user.uid, user.email, name);
        const bundle = await loadUserBundle(user.uid);
        setSession(user);
        hydrateBundle(bundle);
        return { ok: true as const };
      } catch (error) {
        await signOutRequest();
        setSession(null);
        hydrateBundle(null);
        return {
          ok: false as const,
          message: getBootstrapErrorMessage(error),
        };
      }
    },
    [getBootstrapErrorMessage, hydrateBundle]
  );

  const refreshUserData = useCallback(
    async (user: SessionUser) => {
      setRefreshing(true);
      const bundle = await loadUserBundle(user.uid);
      hydrateBundle(bundle);
      setRefreshing(false);
    },
    [hydrateBundle]
  );

  useEffect(() => {
    async function bootstrap() {
      await AsyncStorage.setItem('habitleague:last-opened', new Date().toISOString());
      const restored = await restoreSession();
      if (restored) {
        await completeAuthenticatedSession(restored);
      }

      setAuthReady(true);
    }

    bootstrap();
  }, [completeAuthenticatedSession]);

  const signIn = useCallback(
    async (email: string, password: string) => {
      setBusy(true);
      const result = await signInRequest(email.trim(), password);

      if (!result.ok || !result.user) {
        setBusy(false);
        return { ok: false, message: result.message };
      }

      const bootstrapResult = await completeAuthenticatedSession(result.user);
      setBusy(false);
      if (!bootstrapResult.ok) {
        return bootstrapResult;
      }
      return { ok: true, message: 'Signed in.' };
    },
    [completeAuthenticatedSession]
  );

  const signUp = useCallback(
    async (name: string, email: string, password: string) => {
      setBusy(true);
      const result = await signUpRequest(name.trim(), email.trim(), password);

      if (!result.ok || !result.user) {
        setBusy(false);
        return { ok: false, message: result.message };
      }

      const bootstrapResult = await completeAuthenticatedSession(result.user, name.trim());
      setBusy(false);
      if (!bootstrapResult.ok) {
        return bootstrapResult;
      }
      return { ok: true, message: 'Account created.' };
    },
    [completeAuthenticatedSession]
  );

  const signOut = useCallback(async () => {
    await signOutRequest();
    setSession(null);
    hydrateBundle(null);
  }, [hydrateBundle]);

  const searchCourses = useCallback(async (searchTerm: string) => searchCourseCatalogRequest(searchTerm), []);

  const saveProfile = useCallback(
    async (patch: Partial<Profile>) => {
      if (!session) {
        return { ok: false, message: 'No active session.' };
      }

      setBusy(true);
      await saveProfileRequest(session.uid, patch);
      await refreshUserData(session);
      setBusy(false);
      return { ok: true, message: 'Profile saved.' };
    },
    [refreshUserData, session]
  );

  const createHabit = useCallback(
    async (input: { groupId: string; title: string; emoji: string; category: string; description?: string; frequency?: string }) => {
      if (!session) {
        return { ok: false, message: 'No active session.' };
      }

      if (!input.groupId.trim()) {
        return { ok: false, message: 'Choose a group before adding a legacy tracker.' };
      }
      if (!input.title.trim()) {
        return { ok: false, message: 'Please enter a tracker name.' };
      }

      setBusy(true);
      const challengeId = await createHabitRequest(session.uid, input);
      if (!challengeId) {
        setBusy(false);
        return { ok: false, message: 'That group could not be found.' };
      }
      await refreshUserData(session);
      setBusy(false);
      return { ok: true, message: 'Legacy tracker added.' };
    },
    [refreshUserData, session]
  );

  const toggleHabitCheckIn = useCallback(
    async (habitId: string) => {
      if (!session) {
        return;
      }

      await toggleHabitCheckInRequest(session.uid, habitId);
      await refreshUserData(session);
    },
    [refreshUserData, session]
  );

  const restoreHabitStreak = useCallback(
    async (habitId: string) => {
      if (!session || !profile) {
        return { ok: false, message: 'No active session.' };
      }
      if (profile.shopInventory.streakRestoreCredits < 1) {
        return { ok: false, message: 'Add a restore from the Shop before using it.' };
      }

      setBusy(true);
      const result = await restoreHabitStreakRequest(session.uid, habitId);
      if (result.ok) {
        const nextInventory = consumeRestoreStreak(profile.shopInventory);
        await saveProfileRequest(session.uid, { shopInventory: nextInventory });
        await refreshUserData(session);
      }
      setBusy(false);
      return result;
    },
    [profile, refreshUserData, session]
  );

  const createGroup = useCallback(
    async (input: GroupSettingsInput) => {
      if (!session) {
        return { ok: false, message: 'No active session.' };
      }

      if (!input.name.trim()) {
        return { ok: false, message: 'Please enter a group name.' };
      }
      if (input.stakesEnabled && !input.stakesText.trim()) {
        return { ok: false, message: 'Add a stakes message or turn Stakes Mode off.' };
      }
      if (input.memberLimit && input.memberLimit < 2) {
        return { ok: false, message: 'Member limit should be at least 2.' };
      }

      setBusy(true);
      const groupId = await createGroupRequest(session.uid, {
        ...input,
        name: input.name.trim(),
        description: input.description.trim(),
        stakesText: input.stakesText.trim(),
      });
      await refreshUserData(session);
      setBusy(false);
      return { ok: true, message: 'Group created.', groupId };
    },
    [refreshUserData, session]
  );

  const updateGroup = useCallback(
    async (groupId: string, input: GroupSettingsInput) => {
      if (!session) {
        return { ok: false, message: 'No active session.' };
      }

      if (!input.name.trim()) {
        return { ok: false, message: 'Please enter a group name.' };
      }
      if (input.stakesEnabled && !input.stakesText.trim()) {
        return { ok: false, message: 'Add a stakes message or turn Stakes Mode off.' };
      }
      if (input.memberLimit && input.memberLimit < 2) {
        return { ok: false, message: 'Member limit should be at least 2.' };
      }

      setBusy(true);
      const result = await updateGroupRequest(session.uid, groupId, {
        ...input,
        name: input.name.trim(),
        description: input.description.trim(),
        stakesText: input.stakesText.trim(),
      });
      if (result.ok) {
        await refreshUserData(session);
      }
      setBusy(false);
      return result;
    },
    [refreshUserData, session]
  );

  const joinGroup = useCallback(
    async (joinCode: string) => {
      if (!session) {
        return { ok: false, message: 'No active session.' };
      }

      setBusy(true);
      const result = await joinGroupRequest(session.uid, joinCode.trim().toUpperCase());
      if (result.ok) {
        await refreshUserData(session);
      }
      setBusy(false);
      return result;
    },
    [refreshUserData, session]
  );

  const createCourse = useCallback(
    async (input: {
      groupId?: string | null;
      sourceId?: string;
      sourceProvider?: Course['sourceProvider'];
      name: string;
      location: string;
      city?: string;
      state?: string;
      country?: string;
      latitude?: number | null;
      longitude?: number | null;
      holesCount?: number;
      par: number;
      tees?: TeeBox[];
      holes?: CourseHole[];
    }) => {
      if (!session) {
        return { ok: false, message: 'No active session.' };
      }
      if (!input.name.trim()) {
        return { ok: false, message: 'Please enter a course name.' };
      }

      setBusy(true);
      await createCourseRequest(session.uid, {
        ...input,
        name: input.name.trim(),
        location: input.location.trim(),
        city: input.city?.trim(),
        state: input.state?.trim(),
        country: input.country?.trim(),
      });
      await refreshUserData(session);
      setBusy(false);
      return { ok: true, message: 'Course added.' };
    },
    [refreshUserData, session]
  );

  const logRound = useCallback(
    async (input: {
      groupId?: string | null;
      relatedGroupIds?: string[];
      courseId: string;
      format: RoundFormat;
      playedOn: string;
      teeBoxId?: string | null;
      holesPlayed: 9 | 18;
      totalScore: number;
      holeScores?: RoundHoleScore[];
      playerIds: string[];
      playerNames: string[];
      teamName?: string;
      visibility: RoundVisibility;
      notes?: string;
      locationVerified?: boolean;
      distanceFromCourseMeters?: number | null;
    }) => {
      if (!session) {
        return { ok: false, message: 'No active session.' };
      }
      if (!input.courseId.trim()) {
        return { ok: false, message: 'Choose a course first.' };
      }
      if (!Number.isFinite(input.totalScore) || input.totalScore <= 0) {
        return { ok: false, message: 'Enter a valid round score.' };
      }
      if (!input.playerNames.length) {
        return { ok: false, message: 'Add the players for this round.' };
      }

      setBusy(true);
      const result = await logRoundRequest(session.uid, input);
      if (!result) {
        setBusy(false);
        return { ok: false, message: 'That course could not be found.' };
      }
      await refreshUserData(session);
      setBusy(false);
      return { ok: true, message: 'Round logged.' };
    },
    [refreshUserData, session]
  );

  const startActiveRound = useCallback(
    async (input: {
      groupId?: string | null;
      relatedGroupIds?: string[];
      courseId: string;
      format: RoundFormat;
      teeBoxId?: string | null;
      holesPlayed: 9 | 18;
      playerIds: string[];
      playerNames: string[];
      teamName?: string;
      visibility: RoundVisibility;
      locationVerified?: boolean;
      distanceFromCourseMeters?: number | null;
    }) => {
      if (!session) {
        return { ok: false, message: 'No active session.' };
      }
      if (!input.courseId.trim()) {
        return { ok: false, message: 'Choose a course first.' };
      }
      if (!input.playerIds.length || input.playerIds.length !== input.playerNames.length) {
        return { ok: false, message: 'Invite the players first.' };
      }

      setBusy(true);
      const result = await startActiveRoundRequest(session.uid, input);
      if (!result) {
        setBusy(false);
        return { ok: false, message: 'That course could not be found.' };
      }
      await refreshUserData(session);
      setBusy(false);
      return { ok: true, message: 'Round started.', activeRound: result.activeRound };
    },
    [refreshUserData, session]
  );

  const updateActiveRound = useCallback(
    async (input: { activeRoundId: string; holeScores?: RoundHoleScore[]; activeHoleIndex?: number }) => {
      if (!session) {
        return { ok: false, message: 'No active session.' };
      }
      return updateActiveRoundRequest(session.uid, input);
    },
    [session]
  );

  const completeActiveRound = useCallback(
    async (activeRoundId: string) => {
      if (!session) {
        return { ok: false, message: 'No active session.' };
      }

      setBusy(true);
      const result = await completeActiveRoundRequest(session.uid, activeRoundId);
      if (!result) {
        setBusy(false);
        return { ok: false, message: 'That round could not be posted.' };
      }
      await refreshUserData(session);
      setBusy(false);
      return { ok: true, message: 'Round posted.' };
    },
    [refreshUserData, session]
  );

  const respondToRoundInvite = useCallback(
    async (inviteId: string, status: Extract<RoundInviteStatus, 'accepted' | 'declined'>) => {
      if (!session) {
        return { ok: false, message: 'No active session.' };
      }

      setBusy(true);
      const result = await respondToRoundInviteRequest(session.uid, inviteId, status);
      if (result.ok) {
        await refreshUserData(session);
      }
      setBusy(false);
      return result;
    },
    [refreshUserData, session]
  );

  const updateRoundVisibility = useCallback(
    async (roundId: string, visibility: RoundVisibility) => {
      if (!session) {
        return { ok: false, message: 'No active session.' };
      }

      setBusy(true);
      const result = await updateRoundVisibilityRequest(session.uid, roundId, visibility);
      if (result.ok) {
        await refreshUserData(session);
      }
      setBusy(false);
      return result;
    },
    [refreshUserData, session]
  );

  const updateLeagueChallengeLifecycle = useCallback(
    async (challengeId: string, action: 'archive' | 'complete' | 'reactivate') => {
      if (!session) {
        return { ok: false, message: 'No active session.' };
      }

      setBusy(true);
      const result = await updateLeagueChallengeLifecycleRequest(session.uid, challengeId, action);
      if (result.ok) {
        await refreshUserData(session);
      }
      setBusy(false);
      return result;
    },
    [refreshUserData, session]
  );

  const joinPublicGroup = useCallback(
    async (groupId: string) => {
      if (!session) {
        return { ok: false, message: 'No active session.' };
      }

      setBusy(true);
      const result = await joinPublicGroupRequest(session.uid, groupId);
      if (result.ok) {
        await refreshUserData(session);
      }
      setBusy(false);
      return result;
    },
    [refreshUserData, session]
  );

  const listPublicGroups = useCallback(async () => listPublicGroupsRequest(session?.uid), [session?.uid]);

  const searchUsers = useCallback(
    async (searchTerm: string) => {
      if (!session) {
        return [];
      }

      return searchUsersRequest(session.uid, searchTerm);
    },
    [session]
  );

  const sendFriendRequest = useCallback(
    async (userId: string) => {
      if (!session) {
        return { ok: false, message: 'No active session.' };
      }

      setBusy(true);
      const result = await sendFriendRequestRequest(session.uid, userId);
      if (result.ok) {
        await refreshUserData(session);
      }
      setBusy(false);
      return result;
    },
    [refreshUserData, session]
  );

  const getIncomingFriendRequests = useCallback(async () => {
    if (!session) {
      return [];
    }

    return loadIncomingFriendRequestsRequest(session.uid);
  }, [session]);

  const acceptFriendRequest = useCallback(
    async (userId: string) => {
      if (!session) {
        return { ok: false, message: 'No active session.' };
      }

      setBusy(true);
      const result = await acceptFriendRequestRequest(session.uid, userId);
      if (result.ok) {
        await refreshUserData(session);
      }
      setBusy(false);
      return result;
    },
    [refreshUserData, session]
  );

  const declineFriendRequest = useCallback(
    async (userId: string) => {
      if (!session) {
        return { ok: false, message: 'No active session.' };
      }

      setBusy(true);
      const result = await declineFriendRequestRequest(session.uid, userId);
      if (result.ok) {
        await refreshUserData(session);
      }
      setBusy(false);
      return result;
    },
    [refreshUserData, session]
  );

  const getGroupMessages = useCallback(async (groupId: string) => loadGroupMessagesRequest(groupId), []);

  const sendGroupMessage = useCallback(
    async (groupId: string, text: string) => {
      if (!profile) {
        return { ok: false, message: 'No active profile.' };
      }
      if (!text.trim()) {
        return { ok: false, message: 'Write a message first.' };
      }

      await sendGroupMessageRequest(groupId, profile, text);
      return { ok: true, message: 'Message sent.' };
    },
    [profile]
  );

  const getActivityFeed = useCallback(
    async (groupId?: string) => {
      if (!session) {
        return [];
      }

      return loadActivityFeedRequest(session.uid, groupId);
    },
    [session]
  );

  const recordActivity = useCallback(
    async (input: Omit<ActivityInput, 'actorId' | 'actorName'>) => {
      if (!profile) {
        return;
      }

      await recordActivityRequest({
        ...input,
        actorId: profile.uid,
        actorName: profile.name,
      });
    },
    [profile]
  );

  const addActivityShoutout = useCallback(
    async (activityId: string, shoutoutType: ActivityShoutoutType) => {
      if (!session) {
        return { ok: false, message: 'No active session.' };
      }

      return addActivityShoutoutRequest(session.uid, activityId, shoutoutType);
    },
    [session]
  );

  const value = useMemo<AppContextValue>(
    () => ({
      authReady,
      busy,
      refreshing,
      usingFirebase: usingFirebaseBackend,
      session,
      profile,
      shopInventory: profile?.shopInventory ?? null,
      habits,
      groups,
      courses,
      rounds,
      activeRounds,
      roundInvites,
      searchCourses,
      signIn,
      signUp,
      signOut,
      saveProfile,
      createHabit,
      updateLeagueChallengeLifecycle,
      toggleHabitCheckIn,
      restoreHabitStreak,
      createGroup,
      createCourse,
      logRound,
      startActiveRound,
      updateActiveRound,
      completeActiveRound,
      respondToRoundInvite,
      updateRoundVisibility,
      updateGroup,
      joinGroup,
      joinPublicGroup,
      listPublicGroups,
      searchUsers,
      sendFriendRequest,
      getIncomingFriendRequests,
      acceptFriendRequest,
      declineFriendRequest,
      getGroupDetails,
      getGroupMessages,
      sendGroupMessage,
      getActivityFeed,
      recordActivity,
      addActivityShoutout,
    }),
    [
      authReady,
      busy,
      refreshing,
      session,
      profile,
      profile?.shopInventory,
      habits,
      groups,
      courses,
      rounds,
      activeRounds,
      roundInvites,
      searchCourses,
      signIn,
      signUp,
      signOut,
      saveProfile,
      createHabit,
      updateLeagueChallengeLifecycle,
      toggleHabitCheckIn,
      restoreHabitStreak,
      createGroup,
      createCourse,
      logRound,
      startActiveRound,
      updateActiveRound,
      completeActiveRound,
      respondToRoundInvite,
      updateRoundVisibility,
      updateGroup,
      joinGroup,
      joinPublicGroup,
      listPublicGroups,
      searchUsers,
      sendFriendRequest,
      getIncomingFriendRequests,
      acceptFriendRequest,
      declineFriendRequest,
      getGroupMessages,
      sendGroupMessage,
      getActivityFeed,
      recordActivity,
      addActivityShoutout,
    ]
  );

  if (!authReady && fallback) {
    return <>{fallback}</>;
  }

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const context = useContext(AppContext);

  if (!context) {
    throw new Error('useApp must be used inside AppProvider');
  }

  return context;
}
