import AsyncStorage from '@react-native-async-storage/async-storage';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut as firebaseSignOut } from 'firebase/auth';
import {
  addDoc,
  arrayRemove,
  arrayUnion,
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';

import { firebaseAuth, firebaseConfigured, firestore } from '@/lib/firebase';
import { CourseSearchResult, getDefaultCourseProvider, MOCK_COURSES } from '@/lib/courseProviders';
import { getCurrentDateKey, getCurrentWeekEndKey, getCurrentWeekKeys, getDateKeysBetween, getPreviousWeekKeys } from '@/lib/date';
import { getRoundDisplayName, getRoundFormatLabel, isScrambleFormat, normalizeRoundFormat } from '@/lib/golf';
import { getDefaultShopInventory, normalizeShopInventory } from '@/lib/shop';
import { getHabitStreakStatus } from '@/lib/streaks';
import {
  ActivityInput,
  ActivityItem,
  ActivityShoutoutType,
  ActivityShoutouts,
  ActiveRound,
  AppBundle,
  Course,
  DemoStore,
  FriendRequestProfile,
  Group,
  GroupDetails,
  GroupMessage,
  GroupSettingsInput,
  Habit,
  LeagueChallenge,
  LeagueChallengeStatus,
  LeaderboardEntry,
  Profile,
  RoundFormat,
  RoundInvite,
  RoundInviteStatus,
  RoundVisibility,
  Round,
  RoundHoleScore,
  TeeBox,
  SessionUser,
  UserSearchResult,
} from '@/types/models';

const STORAGE_KEY = 'habitleague:demo-store';

export const usingFirebaseBackend = firebaseConfigured && !!firebaseAuth && !!firestore;

const blankStore: DemoStore = {
  currentUserId: null,
  users: {},
  profiles: {},
  challenges: {},
  habits: {},
  courses: {},
  rounds: {},
  activeRounds: {},
  roundInvites: {},
  groups: {},
  groupMessages: {},
  activities: [],
};

export type LogRoundInput = {
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
};

export type StartActiveRoundInput = {
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
};

export type UpdateActiveRoundInput = {
  activeRoundId: string;
  holeScores?: RoundHoleScore[];
  activeHoleIndex?: number;
};

export async function restoreSession(): Promise<SessionUser | null> {
  if (usingFirebaseBackend && firebaseAuth?.currentUser?.email) {
    return {
      uid: firebaseAuth.currentUser.uid,
      email: firebaseAuth.currentUser.email,
    };
  }

  const store = await readDemoStore();
  if (!store.currentUserId) {
    return null;
  }

  const user = store.users[store.currentUserId];
  return user ? { uid: user.uid, email: user.email } : null;
}

export async function signIn(email: string, password: string) {
  if (usingFirebaseBackend && firebaseAuth) {
    try {
      const credential = await signInWithEmailAndPassword(firebaseAuth, email, password);
      return { ok: true, message: 'Signed in.', user: { uid: credential.user.uid, email: credential.user.email ?? email } };
    } catch (error) {
      return { ok: false, message: getErrorMessage(error) };
    }
  }

  const store = await readDemoStore();
  const normalizedEmail = normalizeDemoEmailAlias(email);
  const user = Object.values(store.users).find((entry) => normalizeDemoEmailAlias(entry.email) === normalizedEmail);
  if (!user || user.password !== password) {
    return { ok: false, message: 'Use demo@rivl.app / password123 or create a new account.' };
  }

  store.currentUserId = user.uid;
  await writeDemoStore(store);
  return { ok: true, message: 'Signed in.', user: { uid: user.uid, email: user.email } };
}

export async function signUp(name: string, email: string, password: string) {
  if (usingFirebaseBackend && firebaseAuth) {
    try {
      const credential = await createUserWithEmailAndPassword(firebaseAuth, email, password);
      return { ok: true, message: 'Account created.', user: { uid: credential.user.uid, email: credential.user.email ?? email } };
    } catch (error) {
      return { ok: false, message: getErrorMessage(error) };
    }
  }

  const store = await readDemoStore();
  const exists = Object.values(store.users).some((entry) => entry.email.toLowerCase() === email.toLowerCase());
  if (exists) {
    return { ok: false, message: 'That email already exists in demo mode.' };
  }

  const uid = createId('user');
  store.users[uid] = { uid, email, password };
  store.currentUserId = uid;
  store.profiles[uid] = buildProfile(uid, email, name);
  await writeDemoStore(store);
  return { ok: true, message: 'Account created.', user: { uid, email } };
}

export async function signOut() {
  if (usingFirebaseBackend && firebaseAuth) {
    await firebaseSignOut(firebaseAuth);
    return;
  }

  const store = await readDemoStore();
  store.currentUserId = null;
  await writeDemoStore(store);
}

export async function initializeUserProfile(uid: string, email: string, name = '') {
  if (usingFirebaseBackend && firestore) {
    const profileRef = doc(firestore, 'profiles', uid);
    const snapshot = await getDoc(profileRef);
    if (!snapshot.exists()) {
      await setDoc(profileRef, buildProfile(uid, email, name));
    }
    return;
  }

  const store = await readDemoStore();
  if (!store.profiles[uid]) {
    store.profiles[uid] = buildProfile(uid, email, name);
    await writeDemoStore(store);
  }
}

export async function loadUserBundle(uid: string): Promise<AppBundle | null> {
  const db = firestore;

  if (usingFirebaseBackend && db) {
    const profileSnapshot = await getDoc(doc(db, 'profiles', uid));
    if (!profileSnapshot.exists()) {
      return null;
    }

    const profile = normalizeProfile(profileSnapshot.data() as Profile);
    const habitsSnapshot = await getDocs(query(collection(db, 'habits'), where('userId', '==', uid)));
    const defaultGroupId = profile.groupIds[0] ?? '';
    const habits = habitsSnapshot.docs
      .map((entry) => normalizeHabit(entry.data() as Habit, defaultGroupId))
      .filter((habit): habit is Habit => Boolean(habit))
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
    const groups = await Promise.all(
      (profile.groupIds ?? []).map(async (groupId) => {
        const snapshot = await getDoc(doc(db, 'groups', groupId));
        return snapshot.exists() ? normalizeGroup(snapshot.data() as Group) : null;
      })
    );
    const groupIds = (groups.filter(Boolean) as Group[]).map((group) => group.id);
    const [courses, groupRounds, playerRounds, loadedActiveRounds, roundInvites] = await Promise.all([
      loadCoursesForGroups(groupIds, true),
      loadRoundsForGroups(groupIds),
      loadRoundsForPlayer(uid),
      loadActiveRoundsForUser(uid),
      loadRoundInvitesForUser(uid),
    ]);
    const rounds = dedupeRounds([...groupRounds, ...playerRounds]);
    const activeRounds = filterVisibleActiveRounds(uid, loadedActiveRounds, roundInvites);

    return {
      profile,
      habits,
      groups: groups.filter(Boolean) as Group[],
      courses,
      rounds,
      activeRounds,
      roundInvites,
    };
  }

  const store = await readDemoStore();
  const profile = normalizeProfile(store.profiles[uid]);
  if (!profile) {
    return null;
  }

  const defaultGroupId = profile.groupIds[0] ?? '';
  const habits = Object.values(store.habits)
    .map((habit) => normalizeHabit(habit, defaultGroupId))
    .filter((habit): habit is Habit => habit !== null && habit.userId === uid)
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  const groups = (profile.groupIds ?? [])
    .map((groupId) => normalizeGroup(store.groups[groupId]))
    .filter((group): group is Group => Boolean(group));
  const groupIds = groups.map((group) => group.id);
  const courses = Object.values(store.courses)
    .map((course) => normalizeCourse(course))
    .filter((course): course is Course => course !== null && (!course.groupId || groupIds.includes(course.groupId)))
    .sort((left, right) => left.name.localeCompare(right.name));
  const rounds = Object.values(store.rounds)
    .map((round) => normalizeRound(round))
    .filter((round): round is Round => {
      if (!round) {
        return false;
      }
      return (
        round.createdBy === uid ||
        round.playerIds.includes(uid) ||
        round.playerIds.some((playerId) => profile.friendIds.includes(playerId)) ||
        round.relatedGroupIds.some((groupId) => groupIds.includes(groupId)) ||
        round.visibility === 'public'
      );
    })
    .sort((left, right) => right.playedOn.localeCompare(left.playedOn) || right.createdAt.localeCompare(left.createdAt));
  const loadedActiveRounds = Object.values(store.activeRounds ?? {})
    .map((round) => normalizeActiveRound(round))
    .filter((round): round is ActiveRound => Boolean(round))
    .filter((round) => round.status === 'active' && round.playerIds.includes(uid))
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
  const roundInvites = Object.values(store.roundInvites ?? {})
    .map((invite) => normalizeRoundInvite(invite))
    .filter((invite): invite is RoundInvite => Boolean(invite))
    .filter((invite) => invite.inviteeId === uid || invite.inviterId === uid)
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  const activeRounds = filterVisibleActiveRounds(uid, loadedActiveRounds, roundInvites);

  return {
    profile,
    habits,
    groups,
    courses,
    rounds,
    activeRounds,
    roundInvites,
  };
}

export async function saveProfile(uid: string, patch: Partial<Profile>) {
  if (usingFirebaseBackend && firestore) {
    await updateDoc(doc(firestore, 'profiles', uid), patch);
    return;
  }

  const store = await readDemoStore();
  store.profiles[uid] = { ...store.profiles[uid], ...patch };
  await writeDemoStore(store);
}

export async function searchUsers(uid: string, searchTerm: string): Promise<UserSearchResult[]> {
  const normalizedTerm = searchTerm.trim().toLowerCase();

  if (usingFirebaseBackend && firestore) {
    try {
      const [profileSnapshot, profilesSnapshot, groupsSnapshot] = await Promise.all([
        getDoc(doc(firestore, 'profiles', uid)),
        getDocs(query(collection(firestore, 'profiles'), limit(25))),
        getDocs(query(collection(firestore, 'groups'), where('discoverable', '==', true), limit(25))),
      ]);
      const currentProfile = normalizeProfile(profileSnapshot.data() as Profile);
      const groups = groupsSnapshot.docs.map((entry) => normalizeGroup(entry.data() as Group)).filter((group): group is Group => Boolean(group));
      const profiles = profilesSnapshot.docs.map((entry) => normalizeProfile(entry.data() as Profile));
      return buildUserSearchResults(uid, currentProfile, profiles, groups, normalizedTerm);
    } catch (error) {
      if (isFirestorePermissionError(error)) {
        return [];
      }
      throw error;
    }
  }

  const store = await readDemoStore();
  const currentProfile = normalizeProfile(store.profiles[uid]);
  const profiles = Object.values(store.profiles).map((profile) => normalizeProfile(profile));
  const groups = Object.values(store.groups).map((group) => normalizeGroup(group)).filter((group): group is Group => Boolean(group));
  return buildUserSearchResults(uid, currentProfile, profiles, groups, normalizedTerm);
}

export async function sendFriendRequest(uid: string, friendId: string) {
  if (uid === friendId) {
    return { ok: false, message: 'You cannot send a request to yourself.' };
  }

  if (usingFirebaseBackend && firestore) {
    const [profileSnapshot, friendSnapshot] = await Promise.all([
      getDoc(doc(firestore, 'profiles', uid)),
      getDoc(doc(firestore, 'profiles', friendId)),
    ]);
    if (!profileSnapshot.exists() || !friendSnapshot.exists()) {
      return { ok: false, message: 'That user could not be found.' };
    }

    const profile = normalizeProfile(profileSnapshot.data() as Profile);
    const friend = normalizeProfile(friendSnapshot.data() as Profile);
    if (profile.friendIds.includes(friendId)) {
      return { ok: false, message: 'You are already friends.' };
    }
    if (profile.outgoingFriendRequestIds.includes(friendId)) {
      return { ok: false, message: 'Request already sent.' };
    }
    if (profile.incomingFriendRequestIds.includes(friendId)) {
      return acceptFriendRequest(uid, friendId);
    }

    await updateDoc(doc(firestore, 'profiles', uid), { outgoingFriendRequestIds: arrayUnion(friendId) });
    await updateDoc(doc(firestore, 'profiles', friendId), { incomingFriendRequestIds: arrayUnion(uid) });
    return { ok: true, message: `Friend request sent to ${friend.name}.` };
  }

  const store = await readDemoStore();
  const profile = normalizeProfile(store.profiles[uid]);
  const friend = normalizeProfile(store.profiles[friendId]);
  if (!profile || !friend) {
    return { ok: false, message: 'That user could not be found.' };
  }

  if (profile.friendIds.includes(friendId)) {
    return { ok: false, message: 'You are already friends.' };
  }
  if (profile.outgoingFriendRequestIds.includes(friendId)) {
    return { ok: false, message: 'Request already sent.' };
  }
  if (profile.incomingFriendRequestIds.includes(friendId)) {
    return acceptFriendRequest(uid, friendId);
  }

  store.profiles[uid] = {
    ...profile,
    outgoingFriendRequestIds: [...new Set([...profile.outgoingFriendRequestIds, friendId])],
  };
  store.profiles[friendId] = {
    ...friend,
    incomingFriendRequestIds: [...new Set([...friend.incomingFriendRequestIds, uid])],
  };
  await writeDemoStore(store);
  return { ok: true, message: `Friend request sent to ${friend.name}.` };
}

export async function loadIncomingFriendRequests(uid: string): Promise<FriendRequestProfile[]> {
  if (usingFirebaseBackend && firestore) {
    try {
      const db = firestore;
      const profileSnapshot = await getDoc(doc(db, 'profiles', uid));
      const profile = normalizeProfile(profileSnapshot.data() as Profile);
      const requesters = await Promise.all(
        profile.incomingFriendRequestIds.map(async (requesterId) => {
          const snapshot = await getDoc(doc(db, 'profiles', requesterId));
          return normalizeProfile(snapshot.data() as Profile);
        })
      );
      return requesters.filter(Boolean).map(buildFriendRequestProfile);
    } catch (error) {
      if (isFirestorePermissionError(error)) {
        return [];
      }
      throw error;
    }
  }

  const store = await readDemoStore();
  const profile = normalizeProfile(store.profiles[uid]);
  if (!profile) {
    return [];
  }

  return profile.incomingFriendRequestIds
    .map((requesterId) => normalizeProfile(store.profiles[requesterId]))
    .filter(Boolean)
    .map(buildFriendRequestProfile);
}

export async function acceptFriendRequest(uid: string, requesterId: string) {
  if (uid === requesterId) {
    return { ok: false, message: 'You cannot accept your own request.' };
  }

  if (usingFirebaseBackend && firestore) {
    const [profileSnapshot, requesterSnapshot] = await Promise.all([
      getDoc(doc(firestore, 'profiles', uid)),
      getDoc(doc(firestore, 'profiles', requesterId)),
    ]);
    if (!profileSnapshot.exists() || !requesterSnapshot.exists()) {
      return { ok: false, message: 'That request could not be found.' };
    }

    const profile = normalizeProfile(profileSnapshot.data() as Profile);
    const requester = normalizeProfile(requesterSnapshot.data() as Profile);
    if (!profile.incomingFriendRequestIds.includes(requesterId) && !requester.outgoingFriendRequestIds.includes(uid)) {
      return { ok: false, message: 'That request is no longer pending.' };
    }

    await updateDoc(doc(firestore, 'profiles', uid), {
      friendIds: arrayUnion(requesterId),
      incomingFriendRequestIds: arrayRemove(requesterId),
      outgoingFriendRequestIds: arrayRemove(requesterId),
    });
    await updateDoc(doc(firestore, 'profiles', requesterId), {
      friendIds: arrayUnion(uid),
      outgoingFriendRequestIds: arrayRemove(uid),
      incomingFriendRequestIds: arrayRemove(uid),
    });
    await recordActivity({
      type: 'connection',
      actorId: requesterId,
      actorName: requester.name,
      targetUserId: uid,
      targetUserName: profile.name,
    });
    return { ok: true, message: `You and ${requester.name} are now friends.` };
  }

  const store = await readDemoStore();
  const profile = normalizeProfile(store.profiles[uid]);
  const requester = normalizeProfile(store.profiles[requesterId]);
  if (!profile || !requester) {
    return { ok: false, message: 'That request could not be found.' };
  }
  if (!profile.incomingFriendRequestIds.includes(requesterId) && !requester.outgoingFriendRequestIds.includes(uid)) {
    return { ok: false, message: 'That request is no longer pending.' };
  }

  store.profiles[uid] = {
    ...profile,
    friendIds: [...new Set([...profile.friendIds, requesterId])],
    incomingFriendRequestIds: profile.incomingFriendRequestIds.filter((entry) => entry !== requesterId),
    outgoingFriendRequestIds: profile.outgoingFriendRequestIds.filter((entry) => entry !== requesterId),
  };
  store.profiles[requesterId] = {
    ...requester,
    friendIds: [...new Set([...requester.friendIds, uid])],
    outgoingFriendRequestIds: requester.outgoingFriendRequestIds.filter((entry) => entry !== uid),
    incomingFriendRequestIds: requester.incomingFriendRequestIds.filter((entry) => entry !== uid),
  };
  store.activities = [
    buildActivity({
      type: 'connection',
      actorId: requesterId,
      actorName: requester.name,
      targetUserId: uid,
      targetUserName: profile.name,
    }),
    ...(store.activities ?? []),
  ].slice(0, 80);
  await writeDemoStore(store);
  return { ok: true, message: `You and ${requester.name} are now friends.` };
}

export async function declineFriendRequest(uid: string, requesterId: string) {
  if (usingFirebaseBackend && firestore) {
    await updateDoc(doc(firestore, 'profiles', uid), { incomingFriendRequestIds: arrayRemove(requesterId) });
    await updateDoc(doc(firestore, 'profiles', requesterId), { outgoingFriendRequestIds: arrayRemove(uid) });
    return { ok: true, message: 'Request declined.' };
  }

  const store = await readDemoStore();
  const profile = normalizeProfile(store.profiles[uid]);
  const requester = normalizeProfile(store.profiles[requesterId]);
  if (!profile || !requester) {
    return { ok: false, message: 'That request could not be found.' };
  }

  store.profiles[uid] = {
    ...profile,
    incomingFriendRequestIds: profile.incomingFriendRequestIds.filter((entry) => entry !== requesterId),
  };
  store.profiles[requesterId] = {
    ...requester,
    outgoingFriendRequestIds: requester.outgoingFriendRequestIds.filter((entry) => entry !== uid),
  };
  await writeDemoStore(store);
  return { ok: true, message: 'Request declined.' };
}

export async function createHabit(
  uid: string,
  input: { groupId: string; title: string; emoji: string; category: string; description?: string; frequency?: string }
) {
  return createLeagueChallenge(uid, input);
}

export async function createLeagueChallenge(
  uid: string,
  input: { groupId: string; title: string; emoji: string; category: string; description?: string; frequency?: string }
) {
  const challenge = buildLeagueChallenge(uid, input);

  if (usingFirebaseBackend && firestore) {
    const groupSnapshot = await getDoc(doc(firestore, 'groups', input.groupId));
    const group = normalizeGroup(groupSnapshot.data() as Group);
    if (!group) {
      return null;
    }

    await setDoc(doc(firestore, 'challenges', challenge.id), challenge);
    await createChallengeParticipationsForMembers(group.memberIds, challenge);
    return challenge.id;
  }

  const store = await readDemoStore();
  const group = normalizeGroup(store.groups[input.groupId]);
  if (!group) {
    return null;
  }

  store.challenges[challenge.id] = challenge;
  createDemoParticipationsForMembers(store, group.memberIds, challenge);
  await writeDemoStore(store);
  return challenge.id;
}

export async function updateLeagueChallengeLifecycle(
  uid: string,
  challengeId: string,
  action: 'archive' | 'complete' | 'reactivate'
) {
  if (usingFirebaseBackend && firestore) {
    const db = firestore;
    const challengeSnapshot = await getDoc(doc(db, 'challenges', challengeId));
    if (!challengeSnapshot.exists()) {
      return { ok: false, message: 'That challenge could not be found.' };
    }

    const challenge = normalizeChallenge(challengeSnapshot.data() as LeagueChallenge);
    if (!challenge) {
      return { ok: false, message: 'That challenge could not be found.' };
    }

    const groupSnapshot = await getDoc(doc(db, 'groups', challenge.groupId));
    const group = normalizeGroup(groupSnapshot.data() as Group);
    if (!group) {
      return { ok: false, message: 'That group could not be found.' };
    }
    if (!canManageChallenge(uid, group, challenge)) {
      return { ok: false, message: 'Only the group owner or tracker creator can do that.' };
    }

    const participationSnapshot = await getDocs(query(collection(db, 'habits'), where('challengeId', '==', challenge.id)));
    const participations = participationSnapshot.docs
      .map((entry) => normalizeHabit(entry.data() as Habit, challenge.groupId))
      .filter((entry): entry is Habit => Boolean(entry));
    const profiles = await Promise.all(
      group.memberIds.map(async (memberId) => {
        const snapshot = await getDoc(doc(db, 'profiles', memberId));
        return normalizeProfile(snapshot.data() as Profile);
      })
    );
    const patch = buildChallengeLifecyclePatch(action, uid, challenge, participations, profiles.filter(Boolean) as Profile[]);
    await updateDoc(doc(db, 'challenges', challenge.id), patch);
    return { ok: true, message: getChallengeLifecycleMessage(action, patch.status) };
  }

  const store = await readDemoStore();
  const challenge = normalizeChallenge(store.challenges[challengeId]);
  if (!challenge) {
    return { ok: false, message: 'That challenge could not be found.' };
  }
  const group = normalizeGroup(store.groups[challenge.groupId]);
  if (!group) {
    return { ok: false, message: 'That group could not be found.' };
  }
  if (!canManageChallenge(uid, group, challenge)) {
    return { ok: false, message: 'Only the group owner or tracker creator can do that.' };
  }

  const participations = Object.values(store.habits)
    .map((entry) => normalizeHabit(entry, challenge.groupId))
    .filter((entry): entry is Habit => Boolean(entry))
    .filter((entry) => entry.challengeId === challenge.id);
  const profiles = group.memberIds
    .map((memberId) => normalizeProfile(store.profiles[memberId]))
    .filter((entry): entry is Profile => Boolean(entry));
  const patch = buildChallengeLifecyclePatch(action, uid, challenge, participations, profiles);
  store.challenges[challenge.id] = { ...challenge, ...patch };
  await writeDemoStore(store);
  return { ok: true, message: getChallengeLifecycleMessage(action, patch.status) };
}

export async function toggleHabitCheckIn(uid: string, habitId: string) {
  const todayKey = new Date().toISOString().slice(0, 10);

  if (usingFirebaseBackend && firestore) {
    const habitRef = doc(firestore, 'habits', habitId);
    const snapshot = await getDoc(habitRef);
    if (!snapshot.exists()) {
      return;
    }

    const habit = normalizeHabit(snapshot.data() as Habit);
    if (!habit) {
      return;
    }
    await updateDoc(habitRef, {
      checkIns: habit.checkIns.includes(todayKey) ? arrayRemove(todayKey) : arrayUnion(todayKey),
    });
    return;
  }

  const store = await readDemoStore();
  const habit = store.habits[habitId];
  const normalizedHabit = normalizeHabit(habit);
  if (!normalizedHabit || normalizedHabit.userId !== uid) {
    return;
  }

  const nextCheckIns = normalizedHabit.checkIns.includes(todayKey)
    ? normalizedHabit.checkIns.filter((entry) => entry !== todayKey)
    : [...normalizedHabit.checkIns, todayKey];

  store.habits[habitId] = { ...normalizedHabit, checkIns: nextCheckIns };
  await writeDemoStore(store);
}

export async function restoreHabitStreak(uid: string, habitId: string) {
  const todayKey = new Date().toISOString().slice(0, 10);
  const restoreDate = new Date(`${todayKey}T00:00:00.000Z`);
  restoreDate.setUTCDate(restoreDate.getUTCDate() - 1);
  const restoreKey = restoreDate.toISOString().slice(0, 10);

  if (usingFirebaseBackend && firestore) {
    const habitRef = doc(firestore, 'habits', habitId);
    const snapshot = await getDoc(habitRef);
    if (!snapshot.exists()) {
      return { ok: false, message: 'That habit could not be found.' };
    }

    const habit = normalizeHabit(snapshot.data() as Habit);
    if (!habit || habit.userId !== uid) {
      return { ok: false, message: 'That habit could not be found.' };
    }

    const streakStatus = getHabitStreakStatus(habit);
    if (!streakStatus.restoreEligibility.canRestoreStreak) {
      return { ok: false, message: 'This streak is no longer eligible for a restore.' };
    }

    await updateDoc(habitRef, {
      checkIns: arrayUnion(restoreKey),
      restoreUsedForDate: restoreKey,
      restoreUsedAt: new Date().toISOString(),
    });
    return { ok: true, message: 'Streak restored. Premium restore placeholder applied.' };
  }

  const store = await readDemoStore();
  const habit = normalizeHabit(store.habits[habitId]);
  if (!habit || habit.userId !== uid) {
    return { ok: false, message: 'That habit could not be found.' };
  }

  const streakStatus = getHabitStreakStatus(habit);
  if (!streakStatus.restoreEligibility.canRestoreStreak) {
    return { ok: false, message: 'This streak is no longer eligible for a restore.' };
  }

  store.habits[habitId] = {
    ...habit,
    checkIns: [...new Set([...habit.checkIns, restoreKey])].sort(),
    restoreUsedForDate: restoreKey,
    restoreUsedAt: new Date().toISOString(),
  };
  await writeDemoStore(store);
  return { ok: true, message: 'Streak restored. Premium restore placeholder applied.' };
}

export async function createGroup(uid: string, input: GroupSettingsInput) {
  const group: Group = buildGroup(uid, input);

  if (usingFirebaseBackend && firestore) {
    await setDoc(doc(firestore, 'groups', group.id), group);
    await updateDoc(doc(firestore, 'profiles', uid), { groupIds: arrayUnion(group.id) });
    return group.id;
  }

  const store = await readDemoStore();
  store.groups[group.id] = group;
  store.groupMessages[group.id] = seedWelcomeMessages(group, store.profiles[uid]?.name || 'New teammate', uid);
  store.profiles[uid].groupIds = [...new Set([...(store.profiles[uid].groupIds ?? []), group.id])];
  await writeDemoStore(store);
  return group.id;
}

export async function searchCourseCatalog(searchTerm: string): Promise<CourseSearchResult[]> {
  return getDefaultCourseProvider().searchCourses(searchTerm);
}

export async function createCourse(
  uid: string,
  input: {
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
    holes?: Course['holes'];
  }
) {
  const course = buildCourse(uid, input);

  if (usingFirebaseBackend && firestore) {
    await setDoc(doc(firestore, 'courses', course.id), course);
    return course.id;
  }

  const store = await readDemoStore();
  store.courses[course.id] = course;
  await writeDemoStore(store);
  return course.id;
}

export async function logRound(
  uid: string,
  input: LogRoundInput
) {
  if (usingFirebaseBackend && firestore) {
    const [courseSnapshot, profileSnapshot] = await Promise.all([
      getDoc(doc(firestore, 'courses', input.courseId)),
      getDoc(doc(firestore, 'profiles', uid)),
    ]);
    const course = normalizeCourse(courseSnapshot.data() as Course);
    const profile = normalizeProfile(profileSnapshot.data() as Profile);
    if (!course || !profile) {
      return null;
    }

    const existingRounds = await loadRoundsForCourseSource(course.sourceId);
    const storeRound = buildRound(uid, profile, course, input);
    await setDoc(doc(firestore, 'rounds', storeRound.id), storeRound);
    await recordRoundActivities(storeRound, course, existingRounds, profile);
    return storeRound;
  }

  const store = await readDemoStore();
  const course = normalizeCourse(store.courses[input.courseId]);
  const profile = normalizeProfile(store.profiles[uid]);
  if (!course || !profile) {
    return null;
  }

  const existingRounds = Object.values(store.rounds)
    .map((round) => normalizeRound(round))
    .filter((round): round is Round => {
      if (!round) {
        return false;
      }
      return round.courseSourceId === course.sourceId;
    });
  const storeRound = buildRound(uid, profile, course, input);
  store.rounds[storeRound.id] = storeRound;
  await writeDemoStore(store);
  await recordRoundActivities(storeRound, course, existingRounds, profile);
  return storeRound;
}

export async function startActiveRound(uid: string, input: StartActiveRoundInput) {
  const profile = await loadProfileById(uid);
  const course = await loadCourseById(input.courseId);
  if (!profile || !course) {
    return null;
  }

  const activeRound = buildActiveRound(uid, profile, course, input);
  const invites = buildRoundInvites(activeRound, profile);

  const db = firestore;
  if (usingFirebaseBackend && db) {
    await setDoc(doc(db, 'activeRounds', activeRound.id), activeRound);
    await Promise.all(invites.map((invite) => setDoc(doc(db, 'roundInvites', invite.id), invite)));
    return { activeRound, invites };
  }

  const store = await readDemoStore();
  store.activeRounds[activeRound.id] = activeRound;
  invites.forEach((invite) => {
    store.roundInvites[invite.id] = invite;
  });
  await writeDemoStore(store);
  return { activeRound, invites };
}

export async function updateActiveRound(uid: string, input: UpdateActiveRoundInput) {
  const activeRound = await loadActiveRoundById(input.activeRoundId);
  if (!activeRound || !activeRound.playerIds.includes(uid) || activeRound.status !== 'active') {
    return { ok: false, message: 'That round could not be updated.' };
  }

  const patch: Partial<ActiveRound> = {
    updatedAt: new Date().toISOString(),
  };
  if (input.holeScores) {
    patch.holeScores = normalizeHoleScores(input.holeScores, activeRound.holesPlayed);
  }
  if (typeof input.activeHoleIndex === 'number') {
    patch.activeHoleIndex = Math.max(0, Math.min(activeRound.holesPlayed - 1, input.activeHoleIndex));
  }

  const db = firestore;
  if (usingFirebaseBackend && db) {
    await updateDoc(doc(db, 'activeRounds', activeRound.id), patch);
    return { ok: true, message: 'Round saved.' };
  }

  const store = await readDemoStore();
  store.activeRounds[activeRound.id] = { ...activeRound, ...patch };
  await writeDemoStore(store);
  return { ok: true, message: 'Round saved.' };
}

export async function completeActiveRound(uid: string, activeRoundId: string) {
  const activeRound = await loadActiveRoundById(activeRoundId);
  if (!activeRound || !activeRound.playerIds.includes(uid) || activeRound.status !== 'active') {
    return null;
  }

  const totalScore = activeRound.holeScores.reduce((sum, hole) => sum + hole.score, 0);
  const invitesBeforeComplete = (await loadRoundInvitesForUser(uid)).filter((invite) => invite.activeRoundId === activeRound.id);
  const acceptedIds = new Set([
    activeRound.createdBy,
    ...invitesBeforeComplete.filter((invite) => invite.status !== 'declined').map((invite) => invite.inviteeId),
  ]);
  const finalPlayerIds = activeRound.playerIds.filter((playerId) => acceptedIds.has(playerId));
  const finalPlayerNames = finalPlayerIds.map((playerId) => activeRound.playerNames[activeRound.playerIds.indexOf(playerId)] || 'Player');
  const round = await logRound(uid, {
    groupId: activeRound.groupId,
    relatedGroupIds: activeRound.relatedGroupIds,
    courseId: activeRound.courseId,
    format: activeRound.format,
    playedOn: activeRound.dateKey,
    teeBoxId: activeRound.teeBoxId,
    holesPlayed: activeRound.holesPlayed,
    totalScore,
    holeScores: activeRound.holeScores,
    playerIds: finalPlayerIds,
    playerNames: finalPlayerNames,
    teamName: activeRound.teamName,
    visibility: activeRound.visibility,
    locationVerified: activeRound.locationVerified,
    distanceFromCourseMeters: activeRound.distanceFromCourseMeters,
  });
  if (!round) {
    return null;
  }

  const completedPatch: Partial<ActiveRound> = {
    status: 'completed',
    completedRoundId: round.id,
    updatedAt: new Date().toISOString(),
  };

  const db = firestore;
  if (usingFirebaseBackend && db) {
    await updateDoc(doc(db, 'activeRounds', activeRound.id), completedPatch);
    await Promise.all(invitesBeforeComplete.map((invite) => updateDoc(doc(db, 'roundInvites', invite.id), { roundId: round.id })));
    return round;
  }

  const store = await readDemoStore();
  store.activeRounds[activeRound.id] = { ...activeRound, ...completedPatch };
  Object.values(store.roundInvites)
    .filter((invite) => invite.activeRoundId === activeRound.id)
    .forEach((invite) => {
      store.roundInvites[invite.id] = { ...invite, roundId: round.id };
    });
  await writeDemoStore(store);
  return round;
}

export async function respondToRoundInvite(uid: string, inviteId: string, status: Extract<RoundInviteStatus, 'accepted' | 'declined'>) {
  const invite = await loadRoundInviteById(inviteId);
  if (!invite || invite.inviteeId !== uid || invite.status !== 'pending') {
    return { ok: false, message: 'That invite could not be updated.' };
  }

  const patch: Partial<RoundInvite> = {
    status,
    respondedAt: new Date().toISOString(),
  };

  if (usingFirebaseBackend && firestore) {
    await updateDoc(doc(firestore, 'roundInvites', invite.id), patch);
    return { ok: true, message: status === 'accepted' ? 'Invite accepted.' : 'Invite declined.' };
  }

  const store = await readDemoStore();
  store.roundInvites[invite.id] = { ...invite, ...patch };
  await writeDemoStore(store);
  return { ok: true, message: status === 'accepted' ? 'Invite accepted.' : 'Invite declined.' };
}

export async function updateRoundVisibility(uid: string, roundId: string, visibility: RoundVisibility) {
  if (usingFirebaseBackend && firestore) {
    const roundRef = doc(firestore, 'rounds', roundId);
    const snapshot = await getDoc(roundRef);
    const round = normalizeRound(snapshot.data() as Round);
    if (!round || !round.playerIds.includes(uid)) {
      return { ok: false, message: 'That round could not be updated.' };
    }
    await updateDoc(roundRef, { visibility });
    return { ok: true, message: visibility === 'public' ? 'Round is public.' : 'Round is private.' };
  }

  const store = await readDemoStore();
  const round = normalizeRound(store.rounds[roundId]);
  if (!round || !round.playerIds.includes(uid)) {
    return { ok: false, message: 'That round could not be updated.' };
  }
  store.rounds[roundId] = { ...round, visibility };
  await writeDemoStore(store);
  return { ok: true, message: visibility === 'public' ? 'Round is public.' : 'Round is private.' };
}

export async function updateGroup(uid: string, groupId: string, input: GroupSettingsInput) {
  if (usingFirebaseBackend && firestore) {
    const groupRef = doc(firestore, 'groups', groupId);
    const snapshot = await getDoc(groupRef);
    if (!snapshot.exists()) {
      return { ok: false, message: 'That group could not be found.' };
    }

    const existing = normalizeGroup(snapshot.data() as Group);
    if (!existing) {
      return { ok: false, message: 'That group could not be found.' };
    }
    if (existing.ownerId !== uid) {
      return { ok: false, message: 'Only the group owner can edit settings.' };
    }
    if (input.memberLimit && input.memberLimit < existing.memberIds.length) {
      return { ok: false, message: 'Member limit cannot be smaller than the current member count.' };
    }

    await updateDoc(groupRef, buildGroupPatch(input));
    return { ok: true, message: 'Group updated.' };
  }

  const store = await readDemoStore();
  const existing = normalizeGroup(store.groups[groupId]);
  if (!existing) {
    return { ok: false, message: 'That group could not be found.' };
  }
  if (existing.ownerId !== uid) {
    return { ok: false, message: 'Only the group owner can edit settings.' };
  }
  if (input.memberLimit && input.memberLimit < existing.memberIds.length) {
    return { ok: false, message: 'Member limit cannot be smaller than the current member count.' };
  }

  store.groups[groupId] = { ...existing, ...buildGroupPatch(input) };
  await writeDemoStore(store);
  return { ok: true, message: 'Group updated.' };
}

export async function listPublicGroups(uid?: string): Promise<Group[]> {
  if (usingFirebaseBackend && firestore) {
    try {
      const snapshot = await getDocs(query(collection(firestore, 'groups'), where('discoverable', '==', true), limit(8)));
      return snapshot.docs
        .map((entry) => normalizeGroup(entry.data() as Group))
        .filter((group): group is Group => Boolean(group))
        .filter((group) => !uid || !group.memberIds.includes(uid))
        .filter((group) => !group.memberLimit || group.memberIds.length < group.memberLimit)
        .sort((left, right) => right.memberIds.length - left.memberIds.length);
    } catch (error) {
      if (isFirestorePermissionError(error)) {
        return [];
      }
      throw error;
    }
  }

  const store = await readDemoStore();
  return Object.values(store.groups)
    .map((entry) => normalizeGroup(entry))
    .filter((group): group is Group => Boolean(group))
    .filter((group) => group.discoverable && group.visibility === 'public')
    .filter((group) => !uid || !group.memberIds.includes(uid))
    .filter((group) => !group.memberLimit || group.memberIds.length < group.memberLimit)
    .sort((left, right) => right.memberIds.length - left.memberIds.length);
}

export async function loadGroupMessages(groupId: string): Promise<GroupMessage[]> {
  if (usingFirebaseBackend && firestore) {
    try {
      const snapshot = await getDocs(query(collection(firestore, 'groups', groupId, 'messages'), orderBy('createdAt', 'asc')));
      return snapshot.docs
        .map((entry) => normalizeMessage({ id: entry.id, ...(entry.data() as Omit<GroupMessage, 'id'>) }))
        .filter((message): message is GroupMessage => Boolean(message));
    } catch (error) {
      if (isFirestorePermissionError(error)) {
        return [];
      }
      throw error;
    }
  }

  const store = await readDemoStore();
  return (store.groupMessages[groupId] ?? [])
    .map((message) => normalizeMessage(message))
    .filter((message): message is GroupMessage => Boolean(message));
}

export async function sendGroupMessage(groupId: string, sender: Profile, text: string) {
  const message = buildMessage(groupId, sender, text);

  if (usingFirebaseBackend && firestore) {
    await addDoc(collection(firestore, 'groups', groupId, 'messages'), message);
    return;
  }

  const store = await readDemoStore();
  const currentMessages = store.groupMessages[groupId] ?? [];
  store.groupMessages[groupId] = [...currentMessages, message];
  await writeDemoStore(store);
}

export async function loadActivityFeed(uid: string, groupId?: string): Promise<ActivityItem[]> {
  if (usingFirebaseBackend && firestore) {
    try {
      const profileSnapshot = await getDoc(doc(firestore, 'profiles', uid));
      const profile = normalizeProfile(profileSnapshot.data() as Profile);
      const snapshot = await getDocs(query(collection(firestore, 'activities'), orderBy('createdAt', 'desc'), limit(50)));
      return snapshot.docs
        .map((entry) => normalizeActivity(entry.data() as ActivityItem))
        .filter((activity): activity is ActivityItem => Boolean(activity))
        .filter((activity) => activityMatchesFeed(activity, uid, profile, groupId))
        .slice(0, groupId ? 8 : 12);
    } catch (error) {
      if (isFirestorePermissionError(error)) {
        return [];
      }
      throw error;
    }
  }

  const store = await readDemoStore();
  const profile = normalizeProfile(store.profiles[uid]);
  return (store.activities ?? [])
    .map((activity) => normalizeActivity(activity))
    .filter((activity): activity is ActivityItem => Boolean(activity))
    .filter((activity) => activityMatchesFeed(activity, uid, profile, groupId))
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
    .slice(0, groupId ? 8 : 12);
}

export async function recordActivity(input: ActivityInput) {
  const activity = buildActivity(input);

  if (usingFirebaseBackend && firestore) {
    await setDoc(doc(firestore, 'activities', activity.id), activity);
    return activity;
  }

  const store = await readDemoStore();
  store.activities = [activity, ...(store.activities ?? [])].slice(0, 80);
  await writeDemoStore(store);
  return activity;
}

export async function addActivityShoutout(uid: string, activityId: string, shoutoutType: ActivityShoutoutType) {
  if (usingFirebaseBackend && firestore) {
    const activityRef = doc(firestore, 'activities', activityId);
    const snapshot = await getDoc(activityRef);
    if (!snapshot.exists()) {
      return { ok: false, message: 'That activity is no longer available.' };
    }

    const activity = normalizeActivity(snapshot.data() as ActivityItem);
    if (!activity) {
      return { ok: false, message: 'That activity is no longer available.' };
    }

    const nextShoutouts = addShoutoutUser(activity.shoutouts, shoutoutType, uid);
    await updateDoc(activityRef, { shoutouts: nextShoutouts });
    return { ok: true, message: 'Shoutout sent.' };
  }

  const store = await readDemoStore();
  const activity = normalizeActivity((store.activities ?? []).find((entry) => entry.id === activityId));
  if (!activity) {
    return { ok: false, message: 'That activity is no longer available.' };
  }

  store.activities = (store.activities ?? []).map((entry) =>
    entry.id === activityId ? { ...activity, shoutouts: addShoutoutUser(activity.shoutouts, shoutoutType, uid) } : entry
  );
  await writeDemoStore(store);
  return { ok: true, message: 'Shoutout sent.' };
}

function buildGroup(ownerId: string, input: GroupSettingsInput): Group {
  const visibility = input.visibility;

  return {
    id: createId('group'),
    name: input.name,
    description: input.description,
    ownerId,
    memberIds: [ownerId],
    joinCode: createJoinCode(),
    visibility,
    inviteOnly: visibility === 'private',
    discoverable: visibility === 'public',
    stakesEnabled: input.stakesEnabled,
    stakesText: input.stakesEnabled ? input.stakesText.trim() : '',
    memberLimit: input.memberLimit ?? null,
    createdAt: new Date().toISOString(),
  };
}

function buildGroupPatch(input: GroupSettingsInput) {
  const visibility = input.visibility;

  return {
    name: input.name.trim(),
    description: input.description.trim(),
    visibility,
    inviteOnly: visibility === 'private',
    discoverable: visibility === 'public',
    stakesEnabled: input.stakesEnabled,
    stakesText: input.stakesEnabled ? input.stakesText.trim() : '',
    memberLimit: typeof input.memberLimit === 'number' && input.memberLimit > 0 ? input.memberLimit : null,
  };
}

export async function joinGroup(uid: string, joinCode: string) {
  if (usingFirebaseBackend && firestore) {
    const match = await getDocs(query(collection(firestore, 'groups'), where('joinCode', '==', joinCode), limit(1)));
    if (!match.docs.length) {
      return { ok: false, message: 'That join code was not found.' };
    }

    const group = normalizeGroup(match.docs[0].data() as Group);
    if (!group) {
      return { ok: false, message: 'That join code was not found.' };
    }
    if (group.memberLimit && group.memberIds.length >= group.memberLimit && !group.memberIds.includes(uid)) {
      return { ok: false, message: 'This group is full right now.' };
    }
    const profileSnapshot = await getDoc(doc(firestore, 'profiles', uid));
    const profile = normalizeProfile(profileSnapshot.data() as Profile);
    await updateDoc(doc(firestore, 'groups', group.id), { memberIds: arrayUnion(uid) });
    await updateDoc(doc(firestore, 'profiles', uid), { groupIds: arrayUnion(group.id) });
    await ensureMemberParticipationsForGroup(uid, group.id);
    await recordActivity({
      type: 'league_join',
      actorId: uid,
      actorName: profile.name,
      groupId: group.id,
      groupName: group.name,
    });
    return { ok: true, message: 'Joined group.', groupId: group.id };
  }

  const store = await readDemoStore();
  const group = Object.values(store.groups)
    .map((entry) => normalizeGroup(entry))
    .filter((entry): entry is Group => Boolean(entry))
    .find((entry) => entry.joinCode === joinCode);
  if (!group) {
    return { ok: false, message: 'That join code was not found.' };
  }
  if (group.memberLimit && group.memberIds.length >= group.memberLimit && !group.memberIds.includes(uid)) {
    return { ok: false, message: 'This group is full right now.' };
  }

  store.groups[group.id] = { ...group, memberIds: [...new Set([...group.memberIds, uid])] };
  store.profiles[uid].groupIds = [...new Set([...(store.profiles[uid].groupIds ?? []), group.id])];
  ensureDemoMemberParticipationsForGroup(store, uid, group.id);
  store.activities = [
    buildActivity({
      type: 'league_join',
      actorId: uid,
      actorName: store.profiles[uid].name,
      groupId: group.id,
      groupName: group.name,
    }),
    ...(store.activities ?? []),
  ].slice(0, 80);
  await writeDemoStore(store);
  return { ok: true, message: 'Joined group.', groupId: group.id };
}

export async function joinPublicGroup(uid: string, groupId: string) {
  if (usingFirebaseBackend && firestore) {
    const groupRef = doc(firestore, 'groups', groupId);
    const snapshot = await getDoc(groupRef);
    if (!snapshot.exists()) {
      return { ok: false, message: 'That public group could not be found.' };
    }

    const group = normalizeGroup(snapshot.data() as Group);
    if (!group || group.visibility !== 'public' || !group.discoverable) {
      return { ok: false, message: 'That group is not open for public joining.' };
    }
    if (group.memberLimit && group.memberIds.length >= group.memberLimit && !group.memberIds.includes(uid)) {
      return { ok: false, message: 'This group is full right now.' };
    }

    const profileSnapshot = await getDoc(doc(firestore, 'profiles', uid));
    const profile = normalizeProfile(profileSnapshot.data() as Profile);
    await updateDoc(groupRef, { memberIds: arrayUnion(uid) });
    await updateDoc(doc(firestore, 'profiles', uid), { groupIds: arrayUnion(group.id) });
    await ensureMemberParticipationsForGroup(uid, group.id);
    await recordActivity({
      type: 'league_join',
      actorId: uid,
      actorName: profile.name,
      groupId: group.id,
      groupName: group.name,
    });
    return { ok: true, message: 'Joined public group.', groupId: group.id };
  }

  const store = await readDemoStore();
  const group = normalizeGroup(store.groups[groupId]);
  if (!group || group.visibility !== 'public' || !group.discoverable) {
    return { ok: false, message: 'That group is not open for public joining.' };
  }
  if (group.memberLimit && group.memberIds.length >= group.memberLimit && !group.memberIds.includes(uid)) {
    return { ok: false, message: 'This group is full right now.' };
  }

  store.groups[group.id] = { ...group, memberIds: [...new Set([...group.memberIds, uid])] };
  store.profiles[uid].groupIds = [...new Set([...(store.profiles[uid].groupIds ?? []), group.id])];
  ensureDemoMemberParticipationsForGroup(store, uid, group.id);
  store.activities = [
    buildActivity({
      type: 'league_join',
      actorId: uid,
      actorName: store.profiles[uid].name,
      groupId: group.id,
      groupName: group.name,
    }),
    ...(store.activities ?? []),
  ].slice(0, 80);
  await writeDemoStore(store);
  return { ok: true, message: 'Joined public group.', groupId: group.id };
}

export async function getGroupDetails(groupId: string): Promise<GroupDetails | null> {
  const db = firestore;

  if (usingFirebaseBackend && db) {
    try {
      const groupSnapshot = await getDoc(doc(db, 'groups', groupId));
      if (!groupSnapshot.exists()) {
        return null;
      }

      const group = normalizeGroup(groupSnapshot.data() as Group);
      if (!group) {
        return null;
      }
      const members = await Promise.all(
        group.memberIds.map(async (uid) => {
          const snapshot = await getDoc(doc(db, 'profiles', uid));
          return normalizeProfile(snapshot.data() as Profile);
        })
      );
      const [challengeSnapshot, participationSnapshot] = await Promise.all([
        getDocs(query(collection(db, 'challenges'), where('groupId', '==', group.id))),
        getDocs(query(collection(db, 'habits'), where('groupId', '==', group.id))),
      ]);
      const challenges = challengeSnapshot.docs
        .map((entry) => normalizeChallenge(entry.data() as LeagueChallenge))
        .filter((challenge): challenge is LeagueChallenge => Boolean(challenge));
      const participations = participationSnapshot.docs
        .map((entry) => normalizeHabit(entry.data() as Habit, group.id))
        .filter((habit): habit is Habit => Boolean(habit));
      const mergedChallenges = mergeLegacyChallenges(challenges, participations, group.id);
      const [courses, rounds] = await Promise.all([
        loadCoursesForGroups([group.id]),
        loadRoundsForGroups([group.id]),
      ]);

      return {
        group,
        members,
        challenges: mergedChallenges,
        challengeParticipations: participations,
        courses,
        rounds,
        leaderboard: buildLeaderboard(members, participations),
        previousWeekLeaderboard: buildLeaderboard(members, participations, getPreviousWeekKeys()),
      };
    } catch (error) {
      if (isFirestorePermissionError(error)) {
        return null;
      }
      throw error;
    }
  }

  const store = await readDemoStore();
  const group = normalizeGroup(store.groups[groupId]);
  if (!group) {
    return null;
  }

  const members = group.memberIds.map((uid) => normalizeProfile(store.profiles[uid])).filter(Boolean);
  const challenges = Object.values(store.challenges)
    .map((challenge) => normalizeChallenge(challenge))
    .filter((challenge): challenge is LeagueChallenge => Boolean(challenge))
    .filter((challenge) => challenge.groupId === group.id);
  const participations = Object.values(store.habits)
    .map((habit) => normalizeHabit(habit, group.id))
    .filter((habit): habit is Habit => habit !== null && group.memberIds.includes(habit.userId) && habit.groupId === group.id);
  const courses = Object.values(store.courses)
    .map((course) => normalizeCourse(course))
    .filter((course): course is Course => course !== null && course.groupId === group.id)
    .sort((left, right) => left.name.localeCompare(right.name));
  const rounds = Object.values(store.rounds)
    .map((round) => normalizeRound(round))
    .filter((round): round is Round => round !== null && roundBelongsToGroup(round, group))
    .sort((left, right) => right.playedOn.localeCompare(left.playedOn) || right.createdAt.localeCompare(left.createdAt));
  const mergedChallenges = mergeLegacyChallenges(challenges, participations, group.id);
  return {
    group,
    members,
    challenges: mergedChallenges,
    challengeParticipations: participations,
    courses,
    rounds,
    leaderboard: buildLeaderboard(members, participations),
    previousWeekLeaderboard: buildLeaderboard(members, participations, getPreviousWeekKeys()),
  };
}

function buildProfile(uid: string, email: string, name = ''): Profile {
  const displayName = name || 'New teammate';
  return {
    uid,
    email,
    name: displayName,
    username: createUsername(displayName, email),
    bio: '',
    weeklyGoal: 5,
    onboardingCompleted: Boolean(name),
    groupIds: [],
    friendIds: [],
    incomingFriendRequestIds: [],
    outgoingFriendRequestIds: [],
    shopInventory: getDefaultShopInventory(),
  };
}

function normalizeProfile(profile: Profile) {
  return {
    ...profile,
    name: profile?.name || 'New teammate',
    username: profile?.username || createUsername(profile?.name || 'New teammate', profile?.email || ''),
    bio: profile?.bio || '',
    weeklyGoal: profile?.weeklyGoal || 5,
    onboardingCompleted: Boolean(profile?.onboardingCompleted),
    groupIds: profile?.groupIds || [],
    friendIds: profile?.friendIds || [],
    incomingFriendRequestIds: profile?.incomingFriendRequestIds || [],
    outgoingFriendRequestIds: profile?.outgoingFriendRequestIds || [],
    shopInventory: normalizeShopInventory(profile?.shopInventory),
  };
}

function buildFriendRequestProfile(profile: Profile): FriendRequestProfile {
  return {
    uid: profile.uid,
    name: profile.name,
    username: profile.username,
    bio: profile.bio,
  };
}

async function loadCoursesForGroups(groupIds: string[], includeStandalone = false) {
  if (!usingFirebaseBackend || !firestore) {
    return [];
  }

  const db = firestore;
  const snapshots = await Promise.all([
    ...(includeStandalone ? [getDocs(query(collection(db, 'courses'), where('groupId', '==', ''), limit(50)))] : []),
    ...groupIds.map((groupId) => getDocs(query(collection(db, 'courses'), where('groupId', '==', groupId), limit(50)))),
  ]);
  return snapshots
    .flatMap((snapshot) => snapshot.docs)
    .map((entry) => normalizeCourse(entry.data() as Course))
    .filter((course): course is Course => Boolean(course))
    .filter((course, index, allCourses) => allCourses.findIndex((entry) => entry.id === course.id) === index)
    .sort((left, right) => left.name.localeCompare(right.name));
}

async function loadRoundsForGroups(groupIds: string[]) {
  if (!usingFirebaseBackend || !firestore || !groupIds.length) {
    return [];
  }

  const db = firestore;
  const snapshots = await Promise.all(groupIds.map((groupId) => getDocs(query(collection(db, 'rounds'), where('groupId', '==', groupId), limit(50)))));
  return snapshots
    .flatMap((snapshot) => snapshot.docs)
    .map((entry) => normalizeRound(entry.data() as Round))
    .filter((round): round is Round => Boolean(round))
    .sort((left, right) => right.playedOn.localeCompare(left.playedOn) || right.createdAt.localeCompare(left.createdAt));
}

async function loadRoundsForPlayer(uid: string) {
  if (!usingFirebaseBackend || !firestore) {
    return [];
  }

  try {
    const snapshot = await getDocs(query(collection(firestore, 'rounds'), where('playerIds', 'array-contains', uid), limit(50)));
    return snapshot.docs
      .map((entry) => normalizeRound(entry.data() as Round))
      .filter((round): round is Round => Boolean(round))
      .sort((left, right) => right.playedOn.localeCompare(left.playedOn) || right.createdAt.localeCompare(left.createdAt));
  } catch (error) {
    if (isFirestorePermissionError(error)) {
      return [];
    }
    throw error;
  }
}

async function loadActiveRoundsForUser(uid: string) {
  if (!usingFirebaseBackend || !firestore) {
    return [];
  }

  try {
    const snapshot = await getDocs(query(collection(firestore, 'activeRounds'), where('playerIds', 'array-contains', uid), limit(25)));
    return snapshot.docs
      .map((entry) => normalizeActiveRound(entry.data() as ActiveRound))
      .filter((round): round is ActiveRound => Boolean(round))
      .filter((round) => round.status === 'active')
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
  } catch (error) {
    if (isFirestorePermissionError(error)) {
      return [];
    }
    throw error;
  }
}

async function loadRoundInvitesForUser(uid: string) {
  if (!usingFirebaseBackend || !firestore) {
    return [];
  }

  try {
    const [incomingSnapshot, outgoingSnapshot] = await Promise.all([
      getDocs(query(collection(firestore, 'roundInvites'), where('inviteeId', '==', uid), limit(25))),
      getDocs(query(collection(firestore, 'roundInvites'), where('inviterId', '==', uid), limit(25))),
    ]);
    return Array.from(new Map([...incomingSnapshot.docs, ...outgoingSnapshot.docs].map((entry) => [entry.id, entry])).values())
      .map((entry) => normalizeRoundInvite(entry.data() as RoundInvite))
      .filter((invite): invite is RoundInvite => Boolean(invite))
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  } catch (error) {
    if (isFirestorePermissionError(error)) {
      return [];
    }
    throw error;
  }
}

async function loadProfileById(uid: string) {
  if (usingFirebaseBackend && firestore) {
    const snapshot = await getDoc(doc(firestore, 'profiles', uid));
    return normalizeProfile(snapshot.data() as Profile);
  }
  const store = await readDemoStore();
  return normalizeProfile(store.profiles[uid]);
}

async function loadCourseById(courseId: string) {
  if (usingFirebaseBackend && firestore) {
    const snapshot = await getDoc(doc(firestore, 'courses', courseId));
    return normalizeCourse(snapshot.data() as Course);
  }
  const store = await readDemoStore();
  return normalizeCourse(store.courses[courseId]);
}

async function loadActiveRoundById(activeRoundId: string) {
  if (usingFirebaseBackend && firestore) {
    const snapshot = await getDoc(doc(firestore, 'activeRounds', activeRoundId));
    return normalizeActiveRound(snapshot.data() as ActiveRound);
  }
  const store = await readDemoStore();
  return normalizeActiveRound(store.activeRounds[activeRoundId]);
}

async function loadRoundInviteById(inviteId: string) {
  if (usingFirebaseBackend && firestore) {
    const snapshot = await getDoc(doc(firestore, 'roundInvites', inviteId));
    return normalizeRoundInvite(snapshot.data() as RoundInvite);
  }
  const store = await readDemoStore();
  return normalizeRoundInvite(store.roundInvites[inviteId]);
}

function dedupeRounds(rounds: Round[]) {
  return Array.from(new Map(rounds.map((round) => [round.id, round])).values()).sort(
    (left, right) => right.playedOn.localeCompare(left.playedOn) || right.createdAt.localeCompare(left.createdAt)
  );
}

function filterVisibleActiveRounds(uid: string, activeRounds: ActiveRound[], invites: RoundInvite[]) {
  const acceptedActiveRoundIds = new Set(
    invites
      .filter((invite) => invite.inviteeId === uid && invite.status === 'accepted')
      .map((invite) => invite.activeRoundId)
  );

  return activeRounds.filter((round) => round.createdBy === uid || acceptedActiveRoundIds.has(round.id));
}

async function loadRoundsForCourseSource(sourceId: string) {
  if (!usingFirebaseBackend || !firestore || !sourceId) {
    return [];
  }

  try {
    const snapshot = await getDocs(query(collection(firestore, 'rounds'), where('courseSourceId', '==', sourceId), limit(100)));
    return snapshot.docs
      .map((entry) => normalizeRound(entry.data() as Round))
      .filter((round): round is Round => Boolean(round))
      .sort((left, right) => right.playedOn.localeCompare(left.playedOn) || right.createdAt.localeCompare(left.createdAt));
  } catch (error) {
    if (isFirestorePermissionError(error)) {
      return [];
    }
    throw error;
  }
}

function buildCourse(
  uid: string,
  input: {
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
    holes?: Course['holes'];
  }
): Course {
  const tees = normalizeTees(input.tees);
  const holes = normalizeCourseHoles(input.holes, tees, input.holesCount ?? 18, input.par);
  return {
    id: createId('course'),
    groupId: input.groupId?.trim() ?? '',
    sourceId: input.sourceId?.trim() || createId('course-source'),
    sourceProvider: input.sourceProvider ?? 'manual',
    name: input.name.trim(),
    location: input.location.trim(),
    city: input.city?.trim() ?? '',
    state: input.state?.trim() ?? '',
    country: input.country?.trim() ?? '',
    latitude: input.latitude ?? null,
    longitude: input.longitude ?? null,
    holesCount: input.holesCount ?? holes.length ?? 18,
    par: input.par,
    tees,
    holes,
    createdBy: uid,
    createdAt: new Date().toISOString(),
  };
}

function buildRound(
  uid: string,
  profile: Profile,
  course: Course,
  input: LogRoundInput
): Round {
  const normalizedHoleScores = normalizeHoleScores(input.holeScores, input.holesPlayed);
  const selectedTee = course.tees.find((tee) => tee.id === input.teeBoxId) ?? course.tees[0] ?? null;
  const roundPar = getRoundPar(course, input.holesPlayed);
  const totalScore = normalizedHoleScores.length
    ? normalizedHoleScores.reduce((sum, hole) => sum + hole.score, 0)
    : input.totalScore;
  const format = normalizeRoundFormat(input.format);
  const playerIds = [...new Set(input.playerIds.filter(Boolean))];
  const playerNames = input.playerNames.map((name) => name.trim()).filter(Boolean);
  const fallbackNames = playerIds.length ? playerIds.map((playerId) => (playerId === uid ? profile.name : 'Teammate')) : [profile.name];
  const displayNames = playerNames.length ? playerNames : fallbackNames;
  const relatedGroupIds = [...new Set([...(input.relatedGroupIds ?? []), input.groupId ?? course.groupId].filter(Boolean) as string[])];

  return {
    id: createId('round'),
    groupId: input.groupId ?? null,
    relatedGroupIds,
    courseId: input.courseId,
    courseSourceId: course.sourceId,
    courseSourceProvider: course.sourceProvider,
    courseName: course.name,
    createdBy: uid,
    userId: uid,
    playerIds,
    playerNames: displayNames,
    playerName: displayNames[0] || profile.name || 'Player',
    totalScore,
    scoreToPar: roundPar ? totalScore - roundPar : null,
    format,
    gameMode: format,
    teeBoxId: selectedTee?.id ?? input.teeBoxId ?? null,
    teeBoxName: selectedTee?.name ?? 'Default tees',
    holesPlayed: input.holesPlayed,
    holeScores: normalizedHoleScores,
    teamName: isScrambleFormat(format) ? input.teamName?.trim() || displayNames.join(' and ') || 'Scramble team' : '',
    teamMemberIds: isScrambleFormat(format) ? playerIds : [],
    dateKey: input.playedOn,
    playedOn: input.playedOn,
    notes: input.notes?.trim() ?? '',
    photoUrls: [],
    visibility: input.visibility,
    locationVerified: Boolean(input.locationVerified),
    distanceFromCourseMeters: typeof input.distanceFromCourseMeters === 'number' ? input.distanceFromCourseMeters : null,
    createdAt: new Date().toISOString(),
  };
}

function buildActiveRound(uid: string, profile: Profile, course: Course, input: StartActiveRoundInput): ActiveRound {
  const selectedTee = course.tees.find((tee) => tee.id === input.teeBoxId) ?? course.tees[0] ?? null;
  const format = normalizeRoundFormat(input.format);
  const playerIds = [...new Set(input.playerIds.filter(Boolean))];
  const playerNames = input.playerNames.map((name) => name.trim()).filter(Boolean);
  const relatedGroupIds = [...new Set([...(input.relatedGroupIds ?? []), input.groupId ?? course.groupId].filter(Boolean) as string[])];
  const timestamp = new Date().toISOString();

  return {
    id: createId('active-round'),
    createdBy: uid,
    groupId: input.groupId ?? null,
    relatedGroupIds,
    courseId: input.courseId,
    courseSourceId: course.sourceId,
    courseSourceProvider: course.sourceProvider,
    courseName: course.name,
    playerIds,
    playerNames: playerNames.length ? playerNames : [profile.name],
    format,
    teeBoxId: selectedTee?.id ?? input.teeBoxId ?? null,
    teeBoxName: selectedTee?.name ?? 'Default tees',
    holesPlayed: input.holesPlayed,
    holeScores: [],
    activeHoleIndex: 0,
    teamName: isScrambleFormat(format) ? input.teamName?.trim() || playerNames.join(' and ') || 'Scramble team' : '',
    dateKey: getCurrentDateKey(),
    visibility: input.visibility,
    locationVerified: Boolean(input.locationVerified),
    distanceFromCourseMeters: typeof input.distanceFromCourseMeters === 'number' ? input.distanceFromCourseMeters : null,
    status: 'active',
    createdAt: timestamp,
    updatedAt: timestamp,
    completedRoundId: null,
  };
}

function buildRoundInvites(activeRound: ActiveRound, inviter: Profile): RoundInvite[] {
  return activeRound.playerIds
    .map((playerId, index) => ({ playerId, playerName: activeRound.playerNames[index] || 'Player' }))
    .filter((player) => player.playerId !== inviter.uid)
    .map((player) => ({
      id: createId('round-invite'),
      activeRoundId: activeRound.id,
      roundId: null,
      inviterId: inviter.uid,
      inviterName: inviter.name,
      inviteeId: player.playerId,
      inviteeName: player.playerName,
      courseId: activeRound.courseId,
      courseName: activeRound.courseName,
      format: activeRound.format,
      teamName: activeRound.teamName,
      status: 'pending',
      createdAt: activeRound.createdAt,
      respondedAt: null,
    }));
}

function normalizeCourse(course?: Course | null) {
  if (!course?.id || !course.name) {
    return null;
  }

  return {
    ...course,
    groupId: course.groupId ?? '',
    location: course.location ?? '',
    sourceId: course.sourceId ?? course.id,
    sourceProvider: course.sourceProvider ?? 'manual',
    city: course.city ?? '',
    state: course.state ?? '',
    country: course.country ?? '',
    latitude: typeof course.latitude === 'number' ? course.latitude : null,
    longitude: typeof course.longitude === 'number' ? course.longitude : null,
    holesCount: Number(course.holesCount) || course.holes?.length || 18,
    par: Number(course.par) || 72,
    tees: normalizeTees(course.tees),
    holes: normalizeCourseHoles(course.holes, normalizeTees(course.tees), Number(course.holesCount) || course.holes?.length || 18, Number(course.par) || 72),
  };
}

function normalizeRound(round?: Round | null): Round | null {
  if (!round?.id || !round.courseId || !(round.userId || round.createdBy)) {
    return null;
  }
  const format = normalizeRoundFormat(round.format ?? round.gameMode);
  const playerIds = [...new Set((round.playerIds?.length ? round.playerIds : [round.userId || round.createdBy]).filter(Boolean))];
  const playerNames = (round.playerNames?.length ? round.playerNames : [round.playerName]).filter(Boolean);
  const groupId = round.groupId ?? null;
  const relatedGroupIds = [
    ...new Set([...(round.relatedGroupIds ?? []), groupId].filter(Boolean) as string[]),
  ];
  const holesPlayed: 9 | 18 = round.holesPlayed === 9 ? 9 : 18;

  return {
    ...round,
    groupId,
    relatedGroupIds,
    courseSourceId: round.courseSourceId ?? round.courseId,
    courseSourceProvider: round.courseSourceProvider ?? 'manual',
    courseName: round.courseName ?? 'Golf course',
    createdBy: round.createdBy ?? round.userId,
    userId: round.userId ?? round.createdBy,
    playerIds,
    playerNames,
    playerName: playerNames[0] ?? round.playerName ?? 'Player',
    totalScore: Number(round.totalScore ?? (round as Round & { score?: number }).score) || 0,
    scoreToPar:
      typeof round.scoreToPar === 'number'
        ? round.scoreToPar
        : null,
    format,
    gameMode: format,
    teeBoxId: round.teeBoxId ?? null,
    teeBoxName: round.teeBoxName ?? 'Default tees',
    holesPlayed,
    holeScores: normalizeHoleScores(round.holeScores, holesPlayed),
    teamName: isScrambleFormat(format) ? round.teamName || playerNames.join(' and ') || 'Scramble team' : '',
    teamMemberIds: isScrambleFormat(format) ? round.teamMemberIds?.length ? round.teamMemberIds : playerIds : [],
    dateKey: round.dateKey ?? round.playedOn ?? round.createdAt?.slice(0, 10) ?? getCurrentDateKey(),
    playedOn: round.playedOn ?? round.dateKey ?? getCurrentDateKey(),
    notes: round.notes ?? '',
    photoUrls: round.photoUrls ?? [],
    visibility: round.visibility === 'public' ? 'public' : 'friends',
    locationVerified: Boolean(round.locationVerified),
    distanceFromCourseMeters: typeof round.distanceFromCourseMeters === 'number' ? round.distanceFromCourseMeters : null,
  };
}

function normalizeActiveRound(round?: ActiveRound | null): ActiveRound | null {
  if (!round?.id || !round.courseId || !round.createdBy) {
    return null;
  }
  const holesPlayed: 9 | 18 = round.holesPlayed === 9 ? 9 : 18;
  const playerIds = [...new Set((round.playerIds ?? [round.createdBy]).filter(Boolean))];
  const playerNames = (round.playerNames?.length ? round.playerNames : ['Player']).filter(Boolean);

  return {
    ...round,
    groupId: round.groupId ?? null,
    relatedGroupIds: round.relatedGroupIds ?? [],
    courseSourceId: round.courseSourceId ?? round.courseId,
    courseSourceProvider: round.courseSourceProvider ?? 'manual',
    courseName: round.courseName ?? 'Golf course',
    playerIds,
    playerNames,
    format: normalizeRoundFormat(round.format),
    teeBoxId: round.teeBoxId ?? null,
    teeBoxName: round.teeBoxName ?? 'Default tees',
    holesPlayed,
    holeScores: normalizeHoleScores(round.holeScores, holesPlayed),
    activeHoleIndex: Math.max(0, Math.min(holesPlayed - 1, Number(round.activeHoleIndex) || 0)),
    teamName: round.teamName ?? '',
    dateKey: round.dateKey ?? getCurrentDateKey(),
    visibility: round.visibility === 'friends' ? 'friends' : 'public',
    locationVerified: Boolean(round.locationVerified),
    distanceFromCourseMeters: typeof round.distanceFromCourseMeters === 'number' ? round.distanceFromCourseMeters : null,
    status: round.status === 'completed' || round.status === 'abandoned' ? round.status : 'active',
    createdAt: round.createdAt ?? new Date().toISOString(),
    updatedAt: round.updatedAt ?? round.createdAt ?? new Date().toISOString(),
    completedRoundId: round.completedRoundId ?? null,
  };
}

function normalizeRoundInvite(invite?: RoundInvite | null): RoundInvite | null {
  if (!invite?.id || !invite.activeRoundId || !invite.inviterId || !invite.inviteeId) {
    return null;
  }
  const status: RoundInviteStatus = invite.status === 'accepted' || invite.status === 'declined' ? invite.status : 'pending';

  return {
    ...invite,
    roundId: invite.roundId ?? null,
    inviteeName: invite.inviteeName || 'Player',
    inviterName: invite.inviterName || 'Player',
    courseId: invite.courseId ?? '',
    courseName: invite.courseName || 'Golf course',
    format: normalizeRoundFormat(invite.format),
    teamName: invite.teamName ?? '',
    status,
    createdAt: invite.createdAt ?? new Date().toISOString(),
    respondedAt: invite.respondedAt ?? null,
  };
}

function normalizeTees(tees?: TeeBox[] | null): TeeBox[] {
  if (!tees?.length) {
    return [
      {
        id: 'default-tees',
        name: 'Default tees',
        color: 'Blue',
        totalYards: null,
        rating: null,
        slope: null,
      },
    ];
  }

  return tees.map((tee, index) => ({
    id: tee.id || `tee-${index + 1}`,
    name: tee.name || `Tee ${index + 1}`,
    color: tee.color || tee.name || 'Blue',
    totalYards: typeof tee.totalYards === 'number' ? tee.totalYards : null,
    rating: typeof tee.rating === 'number' ? tee.rating : null,
    slope: typeof tee.slope === 'number' ? tee.slope : null,
  }));
}

function normalizeCourseHoles(
  holes: Course['holes'] | undefined,
  tees: TeeBox[],
  holesCount: number,
  par: number
): Course['holes'] {
  if (holes?.length) {
    return holes.map((hole, index) => ({
      number: hole.number || index + 1,
      par: Number(hole.par) || 4,
      handicapIndex: typeof hole.handicapIndex === 'number' ? hole.handicapIndex : null,
      yardagesByTee: hole.yardagesByTee ?? {},
    }));
  }

  const targetCount = holesCount || 18;
  const basePar = Math.max(3, Math.round(par / targetCount));
  return Array.from({ length: targetCount }, (_, index) => ({
    number: index + 1,
    par: index % 5 === 0 ? basePar + 1 : index % 4 === 0 ? Math.max(3, basePar - 1) : basePar,
    handicapIndex: ((index * 3) % targetCount) + 1,
    yardagesByTee: Object.fromEntries(
      tees.map((tee) => [
        tee.id,
        tee.totalYards ? Math.max(95, Math.round(tee.totalYards / targetCount) + ((index % 3) - 1) * 12) : 0,
      ])
    ),
  }));
}

function normalizeHoleScores(holeScores?: RoundHoleScore[] | null, holesPlayed = 18): RoundHoleScore[] {
  if (!holeScores?.length) {
    return [];
  }

  return holeScores
    .filter((entry) => Number.isFinite(entry.score) && entry.score > 0 && entry.holeNumber >= 1 && entry.holeNumber <= holesPlayed)
    .map((entry) => ({
      holeNumber: entry.holeNumber,
      score: Number(entry.score),
    }))
    .sort((left, right) => left.holeNumber - right.holeNumber);
}

function getRoundPar(course: Course, holesPlayed: 9 | 18) {
  const holes = course.holes.slice(0, holesPlayed);
  if (!holes.length) {
    return course.par || null;
  }

  return holes.reduce((sum, hole) => sum + hole.par, 0);
}

function buildUserSearchResults(
  uid: string,
  currentProfile: Profile,
  profiles: Profile[],
  groups: Group[],
  normalizedTerm: string
): UserSearchResult[] {
  return profiles
    .filter((profile) => profile.uid !== uid)
    .filter((profile) => {
      if (!normalizedTerm) {
        return true;
      }

      return `${profile.name} ${profile.username}`.toLowerCase().includes(normalizedTerm);
    })
    .map((profile) => {
      const isConnected = currentProfile.friendIds.includes(profile.uid);
      const hasOutgoingRequest = currentProfile.outgoingFriendRequestIds.includes(profile.uid);
      const hasIncomingRequest = currentProfile.incomingFriendRequestIds.includes(profile.uid);
      const friendState: UserSearchResult['friendState'] = isConnected
        ? 'friends'
        : hasOutgoingRequest
          ? 'requested'
          : hasIncomingRequest
            ? 'incoming'
            : 'none';
      return {
        uid: profile.uid,
        name: profile.name,
        username: profile.username,
        bio: profile.bio,
        sharedGroupNames: groups
          .filter((group) => group.memberIds.includes(uid) && group.memberIds.includes(profile.uid))
          .map((group) => group.name),
        isConnected,
        friendState,
      };
    })
    .sort((left, right) => {
      if (left.isConnected !== right.isConnected) {
        return left.isConnected ? 1 : -1;
      }
      return right.sharedGroupNames.length - left.sharedGroupNames.length || left.name.localeCompare(right.name);
    })
    .slice(0, normalizedTerm ? 10 : 6);
}

function normalizeGroup(group?: Group | null): Group | null {
  if (!group) {
    return null;
  }

  const visibility: Group['visibility'] = group.visibility === 'public' ? 'public' : 'private';

  return {
    ...group,
    description: group.description || '',
    visibility,
    inviteOnly: group.inviteOnly ?? visibility === 'private',
    discoverable: group.discoverable ?? visibility === 'public',
    stakesEnabled: Boolean(group.stakesEnabled),
    stakesText: group.stakesText || '',
    memberLimit: typeof group.memberLimit === 'number' && group.memberLimit > 0 ? group.memberLimit : null,
  };
}

function roundBelongsToGroup(round: Round, group: Group) {
  return (
    round.groupId === group.id ||
    round.relatedGroupIds.includes(group.id) ||
    round.playerIds.some((playerId) => group.memberIds.includes(playerId)) ||
    round.createdBy === group.ownerId
  );
}

function normalizeChallenge(challenge?: LeagueChallenge | null): LeagueChallenge | null {
  if (!challenge) {
    return null;
  }

  const status = challenge.status ?? (challenge.active === false ? 'archived' : 'active');
  return {
    ...challenge,
    description: challenge.description || '',
    frequency: challenge.frequency || 'Daily',
    status,
    startDateKey: challenge.startDateKey || getCurrentDateKey(new Date(challenge.createdAt || new Date().toISOString())),
    endDateKey: challenge.endDateKey || null,
    archivedAt: challenge.archivedAt || null,
    archivedBy: challenge.archivedBy || null,
    completedAt: challenge.completedAt || null,
    winnerUserId: challenge.winnerUserId || null,
    winnerDisplayName: challenge.winnerDisplayName || null,
    active: status === 'active',
  };
}

function normalizeHabit(habit?: Habit | null, fallbackGroupId = ''): Habit | null {
  if (!habit) {
    return null;
  }

  return {
    ...habit,
    groupId: habit.groupId || fallbackGroupId,
    challengeId: habit.challengeId || habit.id,
    emoji: habit.emoji || '🔥',
    category: habit.category || 'General',
    checkIns: [...new Set(habit.checkIns || [])].sort(),
    restoreUsedForDate: habit.restoreUsedForDate || null,
    restoreUsedAt: habit.restoreUsedAt || null,
  };
}

function normalizeMessage(message?: GroupMessage | null): GroupMessage | null {
  if (!message) {
    return null;
  }

  return {
    ...message,
    text: message.text || '',
    senderName: message.senderName || 'Teammate',
    createdAt: message.createdAt || new Date().toISOString(),
  };
}

function normalizeActivity(activity?: ActivityItem | null): ActivityItem | null {
  if (!activity) {
    return null;
  }

  return {
    ...activity,
    actorName: activity.actorName || 'Someone',
    groupId: activity.groupId ?? null,
    groupName: activity.groupName ?? null,
    habitId: activity.habitId ?? null,
    habitTitle: activity.habitTitle ?? null,
    targetUserId: activity.targetUserId ?? null,
    targetUserName: activity.targetUserName ?? null,
    summary: activity.summary || buildActivitySummary(activity),
    createdAt: activity.createdAt || new Date().toISOString(),
    shoutouts: {
      ...getEmptyShoutouts(),
      ...(activity.shoutouts || {}),
    },
  };
}

function buildMessage(groupId: string, sender: Profile, text: string): GroupMessage {
  return {
    id: createId('message'),
    groupId,
    senderId: sender.uid,
    senderName: sender.name,
    text: text.trim(),
    createdAt: new Date().toISOString(),
  };
}

function buildLeagueChallenge(
  uid: string,
  input: { groupId: string; title: string; emoji: string; category: string; description?: string; frequency?: string }
): LeagueChallenge {
  const createdAt = new Date().toISOString();
  return {
    id: createId('challenge'),
    groupId: input.groupId,
    title: input.title.trim(),
    emoji: input.emoji.trim() || 'Fit',
    category: input.category.trim() || 'General',
    description: input.description?.trim() || '',
    frequency: input.frequency?.trim() || 'Daily',
    createdBy: uid,
    createdAt,
    status: 'active',
    startDateKey: getCurrentDateKey(new Date(createdAt)),
    endDateKey: getCurrentWeekEndKey(new Date(createdAt)),
    archivedAt: null,
    archivedBy: null,
    completedAt: null,
    winnerUserId: null,
    winnerDisplayName: null,
    active: true,
  };
}

function buildChallengeParticipation(challenge: LeagueChallenge, userId: string): Habit {
  return {
    id: createId('habit'),
    userId,
    groupId: challenge.groupId,
    challengeId: challenge.id,
    title: challenge.title,
    emoji: challenge.emoji,
    category: challenge.category,
    createdAt: challenge.createdAt,
    checkIns: [],
    restoreUsedForDate: null,
    restoreUsedAt: null,
  };
}

async function createChallengeParticipationsForMembers(memberIds: string[], challenge: LeagueChallenge) {
  const db = firestore;
  if (!db) {
    return;
  }

  const existingParticipations = await getDocs(query(collection(db, 'habits'), where('groupId', '==', challenge.groupId)));
  const existingKeys = new Set(
    existingParticipations.docs
      .map((entry) => normalizeHabit(entry.data() as Habit, challenge.groupId))
      .filter((entry): entry is Habit => Boolean(entry))
      .map((entry) => `${entry.challengeId}:${entry.userId}`)
  );

  await Promise.all(
    memberIds.map(async (memberId) => {
      const key = `${challenge.id}:${memberId}`;
      if (existingKeys.has(key)) {
        return;
      }

      const participation = buildChallengeParticipation(challenge, memberId);
      await setDoc(doc(db, 'habits', participation.id), participation);
    })
  );
}

function createDemoParticipationsForMembers(store: DemoStore, memberIds: string[], challenge: LeagueChallenge) {
  const existingKeys = new Set(
    Object.values(store.habits)
      .map((entry) => normalizeHabit(entry, challenge.groupId))
      .filter((entry): entry is Habit => Boolean(entry))
      .map((entry) => `${entry.challengeId}:${entry.userId}`)
  );

  memberIds.forEach((memberId) => {
    const key = `${challenge.id}:${memberId}`;
    if (existingKeys.has(key)) {
      return;
    }

    const participation = buildChallengeParticipation(challenge, memberId);
    store.habits[participation.id] = participation;
  });
}

async function ensureMemberParticipationsForGroup(uid: string, groupId: string) {
  if (!firestore) {
    return;
  }

  const challengeSnapshot = await getDocs(query(collection(firestore, 'challenges'), where('groupId', '==', groupId)));
  const challenges = challengeSnapshot.docs
    .map((entry) => normalizeChallenge(entry.data() as LeagueChallenge))
    .filter((entry): entry is LeagueChallenge => Boolean(entry));

  await Promise.all(challenges.map((challenge) => createChallengeParticipationsForMembers([uid], challenge)));
}

function ensureDemoMemberParticipationsForGroup(store: DemoStore, uid: string, groupId: string) {
  const challenges = Object.values(store.challenges)
    .map((challenge) => normalizeChallenge(challenge))
    .filter((challenge): challenge is LeagueChallenge => Boolean(challenge))
    .filter((challenge) => challenge.groupId === groupId);

  challenges.forEach((challenge) => createDemoParticipationsForMembers(store, [uid], challenge));
}

function canManageChallenge(uid: string, group: Group, challenge: LeagueChallenge) {
  return group.ownerId === uid || challenge.createdBy === uid;
}

function buildChallengeLifecyclePatch(
  action: 'archive' | 'complete' | 'reactivate',
  uid: string,
  challenge: LeagueChallenge,
  participations: Habit[],
  members: Profile[]
) {
  const timestamp = new Date().toISOString();

  if (action === 'archive') {
    return {
      status: 'archived' as LeagueChallengeStatus,
      active: false,
      archivedAt: timestamp,
      archivedBy: uid,
    };
  }

  if (action === 'reactivate') {
    return {
      status: 'active' as LeagueChallengeStatus,
      active: true,
      archivedAt: null,
      archivedBy: null,
      completedAt: null,
      winnerUserId: null,
      winnerDisplayName: null,
      endDateKey: challenge.endDateKey || getCurrentWeekEndKey(),
    };
  }

  const winner = getChallengeLeader(challenge, participations, members, true);
  return {
    status: 'completed' as LeagueChallengeStatus,
    active: false,
    completedAt: timestamp,
    endDateKey: challenge.endDateKey || getCurrentDateKey(),
    winnerUserId: winner?.userId ?? null,
    winnerDisplayName: winner?.name ?? null,
  };
}

function getChallengeLifecycleMessage(action: 'archive' | 'complete' | 'reactivate', status: LeagueChallengeStatus) {
  if (action === 'archive' || status === 'archived') {
    return 'Challenge archived.';
  }
  if (action === 'reactivate' || status === 'active') {
    return 'Challenge is live again.';
  }
  return 'Challenge marked complete.';
}

function getChallengeWindowKeys(challenge: LeagueChallenge, useCompletedWindow = false) {
  const startKey = challenge.startDateKey || getCurrentDateKey(new Date(challenge.createdAt));
  const fallbackEndKey =
    useCompletedWindow && challenge.completedAt
      ? getCurrentDateKey(new Date(challenge.completedAt))
      : challenge.endDateKey || getCurrentWeekEndKey(new Date(challenge.createdAt));
  const endKey = challenge.endDateKey || fallbackEndKey;
  if (!endKey || startKey > endKey) {
    return [startKey];
  }
  return getDateKeysBetween(startKey, endKey);
}

function getChallengeLeader(
  challenge: LeagueChallenge,
  participations: Habit[],
  members: Profile[],
  useCompletedWindow = false
) {
  const relevantParticipations = participations.filter((entry) => entry.challengeId === challenge.id);
  const keys = new Set(getChallengeWindowKeys(challenge, useCompletedWindow));
  const scores = relevantParticipations
    .map((entry) => ({
      userId: entry.userId,
      total: entry.checkIns.filter((dateKey) => keys.has(dateKey)).length,
      name: members.find((member) => member.uid === entry.userId)?.name ?? 'Teammate',
    }))
    .filter((entry) => entry.total > 0)
    .sort((left, right) => right.total - left.total || left.name.localeCompare(right.name));

  return scores[0] ?? null;
}

function mergeLegacyChallenges(challenges: LeagueChallenge[], participations: Habit[], groupId: string) {
  const challengeMap = new Map(challenges.map((challenge) => [challenge.id, challenge]));

  participations.forEach((participation) => {
    if (challengeMap.has(participation.challengeId)) {
      return;
    }

    challengeMap.set(participation.challengeId, {
      id: participation.challengeId,
      groupId,
      title: participation.title,
      emoji: participation.emoji,
      category: participation.category,
      description: '',
      frequency: 'Daily',
      createdBy: participation.userId,
      createdAt: participation.createdAt,
      status: 'active',
      startDateKey: getCurrentDateKey(new Date(participation.createdAt)),
      endDateKey: null,
      archivedAt: null,
      archivedBy: null,
      completedAt: null,
      winnerUserId: null,
      winnerDisplayName: null,
      active: true,
    });
  });

  return Array.from(challengeMap.values()).sort((left, right) => right.createdAt.localeCompare(left.createdAt));
}

function buildActivity(input: ActivityInput): ActivityItem {
  const groupName = input.groupName ?? null;
  const habitTitle = input.habitTitle ?? null;
  const courseName = input.courseName ?? null;
  const targetUserName = input.targetUserName ?? null;

  return {
    id: createId('activity'),
    type: input.type,
    actorId: input.actorId,
    actorName: input.actorName || 'Someone',
    groupId: input.groupId ?? null,
    groupName,
    habitId: input.habitId ?? null,
    habitTitle,
    courseId: input.courseId ?? null,
    courseName,
    roundId: input.roundId ?? null,
    gameMode: input.gameMode ?? null,
    score: typeof input.score === 'number' ? input.score : null,
    scoreToPar: typeof input.scoreToPar === 'number' ? input.scoreToPar : null,
    targetUserId: input.targetUserId ?? null,
    targetUserName,
    summary: buildActivitySummary(input),
    createdAt: new Date().toISOString(),
    shoutouts: getEmptyShoutouts(),
  };
}

function buildActivitySummary(input: ActivityInput) {
  if (input.summaryOverride?.trim()) {
    return input.summaryOverride.trim();
  }

  const actor = input.actorName || 'Someone';

  if (input.type === 'check_in') {
    return `${actor} updated ${input.habitTitle || 'a legacy tracker'}${input.groupName ? ` in ${input.groupName}` : ''}`;
  }

  if (input.type === 'rank_movement') {
    const spots = input.spotsMoved === 1 ? '1 spot' : `${input.spotsMoved || 0} spots`;
    return `${actor} moved up ${spots}${input.groupName ? ` in ${input.groupName}` : ''}`;
  }

  if (input.type === 'league_join') {
    return `${actor} joined ${input.groupName || 'a group'}`;
  }

  if (input.type === 'connection') {
    return `${actor} and ${input.targetUserName || 'a teammate'} connected`;
  }

  if (input.type === 'challenge_update') {
    return `${actor} updated ${input.habitTitle || 'a legacy tracker'}${input.groupName ? ` in ${input.groupName}` : ''}`;
  }

  if (input.type === 'round_logged') {
    const golfLabel = input.gameMode && isScrambleFormat(input.gameMode) ? `posted a ${getRoundFormatLabel(input.gameMode)} score` : `shot ${input.score ?? '--'}`;
    return `${actor} ${golfLabel}${input.courseName ? ` at ${input.courseName}` : ''}.`;
  }

  if (input.type === 'personal_best') {
    return `${actor} set a new personal best${input.score ? `: ${input.score}` : ''}${input.courseName ? ` at ${input.courseName}` : ''}.`;
  }

  if (input.type === 'course_leader') {
    return `${actor} took #1${input.courseName ? ` at ${input.courseName}` : ''}.`;
  }

  return `${actor} made progress`;
}

async function recordRoundActivities(round: Round, course: Course, existingRounds: Round[], profile: Profile) {
  const scoreLabel = round.scoreToPar !== null ? `${round.totalScore} (${formatSignedScore(round.scoreToPar)})` : `${round.totalScore}`;
  const groupId = round.relatedGroupIds[0] ?? round.groupId ?? null;
  const groupName = groupId ? await resolveGroupName(groupId) : null;
  const displayName = getRoundDisplayName(round);
  await recordActivity({
    type: 'round_logged',
    actorId: profile.uid,
    actorName: profile.name,
    groupId,
    groupName,
    courseId: round.courseId,
    courseName: course.name,
    roundId: round.id,
    gameMode: round.gameMode,
    score: round.totalScore,
    scoreToPar: round.scoreToPar,
    summaryOverride:
      isScrambleFormat(round.format)
        ? `${displayName} shot ${scoreLabel} at ${course.name}.`
        : `${displayName} posted ${scoreLabel} at ${course.name}.`,
  });

  if (round.format === 'individual' && isNewPersonalBest(round, existingRounds)) {
    await recordActivity({
      type: 'personal_best',
      actorId: profile.uid,
      actorName: profile.name,
      groupId,
      groupName,
      courseId: round.courseId,
      courseName: course.name,
      roundId: round.id,
      score: round.totalScore,
      scoreToPar: round.scoreToPar,
      summaryOverride: `${profile.name} set a new personal best: ${scoreLabel} at ${course.name}.`,
    });
  }

  if (becameCourseLeader(round, existingRounds)) {
    await recordActivity({
      type: 'course_leader',
      actorId: profile.uid,
      actorName: profile.name,
      groupId,
      groupName,
      courseId: round.courseId,
      courseName: course.name,
      roundId: round.id,
      score: round.totalScore,
      scoreToPar: round.scoreToPar,
      summaryOverride: `${displayName} took #1 in ${getRoundFormatLabel(round.format)} at ${course.name}.`,
    });
  }
}

function isNewPersonalBest(round: Round, existingRounds: Round[]) {
  if (round.format !== 'individual') {
    return false;
  }

  const previousRounds = existingRounds.filter((entry) => entry.playerIds.includes(round.createdBy) && entry.format === 'individual');
  if (!previousRounds.length) {
    return true;
  }

  const bestPrevious = previousRounds.slice().sort(compareRoundsForActivity)[0];
  return compareRoundsForActivity(round, bestPrevious) < 0;
}

function becameCourseLeader(round: Round, existingRounds: Round[]) {
  const sameModeRounds = existingRounds.filter(
    (entry) => entry.courseSourceId === round.courseSourceId && entry.format === round.format && entry.visibility === round.visibility
  );
  if (!sameModeRounds.length) {
    return true;
  }

  const bestPrevious = sameModeRounds.slice().sort(compareRoundsForActivity)[0];
  return compareRoundsForActivity(round, bestPrevious) < 0;
}

function compareRoundsForActivity(left: Round, right: Round) {
  if (left.scoreToPar !== null && right.scoreToPar !== null && left.scoreToPar !== right.scoreToPar) {
    return left.scoreToPar - right.scoreToPar;
  }

  return left.totalScore - right.totalScore;
}

async function resolveGroupName(groupId: string) {
  if (usingFirebaseBackend && firestore) {
    const snapshot = await getDoc(doc(firestore, 'groups', groupId));
    return normalizeGroup(snapshot.data() as Group)?.name ?? 'Golf group';
  }

  const store = await readDemoStore();
  return normalizeGroup(store.groups[groupId])?.name ?? 'Golf group';
}

function formatSignedScore(value: number) {
  if (value === 0) {
    return 'E';
  }

  return value > 0 ? `+${value}` : `${value}`;
}

function getEmptyShoutouts(): ActivityShoutouts {
  return {
    keep_going: [],
    on_fire: [],
    nice_work: [],
  };
}

function addShoutoutUser(shoutouts: ActivityShoutouts, type: ActivityShoutoutType, uid: string): ActivityShoutouts {
  return {
    ...getEmptyShoutouts(),
    ...shoutouts,
    [type]: [...new Set([...(shoutouts[type] ?? []), uid])],
  };
}

function activityMatchesFeed(activity: ActivityItem, uid: string, profile: Profile | null, groupId?: string) {
  if (groupId) {
    return activity.groupId === groupId;
  }

  if (activity.actorId === uid || activity.targetUserId === uid) {
    return true;
  }

  if (!profile) {
    return false;
  }

  return profile.friendIds.includes(activity.actorId) || Boolean(activity.groupId && profile.groupIds.includes(activity.groupId));
}

function buildLeaderboard(members: Profile[], habits: Habit[], weekKeysInput = getCurrentWeekKeys()): LeaderboardEntry[] {
  const weekKeys = new Set(weekKeysInput);

  return members
    .map((member) => {
      const memberHabits = habits.filter((habit) => habit.userId === member.uid);
      const uniqueChallenges = new Set(memberHabits.map((habit) => habit.challengeId));
      return {
        userId: member.uid,
        name: member.name,
        weeklyCheckIns: memberHabits.reduce(
          (total, habit) => total + habit.checkIns.filter((entry) => weekKeys.has(entry)).length,
          0
        ),
        completedHabits: uniqueChallenges.size,
      };
    })
    .sort((left, right) => right.weeklyCheckIns - left.weeklyCheckIns);
}

async function readDemoStore(): Promise<DemoStore> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (raw) {
    const parsed = JSON.parse(raw) as DemoStore;
    const seeded = seedDemoStore();
    return {
      ...blankStore,
      ...parsed,
      users: { ...seeded.users, ...(parsed.users || {}) },
      profiles: { ...seeded.profiles, ...(parsed.profiles || {}) },
      challenges: { ...seeded.challenges, ...(parsed.challenges || {}) },
      habits: { ...seeded.habits, ...(parsed.habits || {}) },
      courses: { ...seeded.courses, ...(parsed.courses || {}) },
      rounds: { ...seeded.rounds, ...(parsed.rounds || {}) },
      activeRounds: { ...seeded.activeRounds, ...(parsed.activeRounds || {}) },
      roundInvites: { ...seeded.roundInvites, ...(parsed.roundInvites || {}) },
      groups: { ...seeded.groups, ...(parsed.groups || {}) },
      groupMessages: { ...seeded.groupMessages, ...(parsed.groupMessages || {}) },
      activities: [...(parsed.activities || []), ...seeded.activities.filter((seededActivity) => !(parsed.activities || []).some((entry) => entry.id === seededActivity.id))],
    };
  }

  const seeded = seedDemoStore();
  await writeDemoStore(seeded);
  return seeded;
}

async function writeDemoStore(store: DemoStore) {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

function buildSeedCourseFromCatalog(courseId: string, groupId: string, createdBy: string, sourceId: string): Course {
  const sourceCourse = MOCK_COURSES.find((course) => course.sourceId === sourceId);
  if (!sourceCourse) {
    return buildCourse(createdBy, {
      groupId,
      sourceId,
      sourceProvider: 'mock',
      name: 'Course pending',
      location: '',
      par: 72,
    });
  }

  return {
    id: courseId,
    groupId,
    sourceId: sourceCourse.sourceId,
    sourceProvider: sourceCourse.sourceProvider,
    name: sourceCourse.name,
    location: sourceCourse.location,
    city: sourceCourse.city,
    state: sourceCourse.state,
    country: sourceCourse.country,
    latitude: sourceCourse.latitude,
    longitude: sourceCourse.longitude,
    holesCount: sourceCourse.holesCount,
    par: sourceCourse.par,
    tees: sourceCourse.tees,
    holes: sourceCourse.holes,
    createdBy,
    createdAt: new Date().toISOString(),
  };
}

function buildSeedRound(input: {
  id: string;
  groupId?: string | null;
  relatedGroupIds?: string[];
  course: Course;
  userId: string;
  playerName: string;
  format: RoundFormat;
  playedOn: string;
  totalScore: number;
  notes: string;
  createdAt: string;
  visibility?: RoundVisibility;
  teeBoxId?: string | null;
  holesPlayed?: 9 | 18;
  teamName?: string;
  teamMemberIds?: string[];
  playerIds?: string[];
  playerNames?: string[];
  locationVerified?: boolean;
  distanceFromCourseMeters?: number | null;
}) {
  const tee = input.course.tees.find((entry) => entry.id === input.teeBoxId) ?? input.course.tees[0] ?? null;
  const holesPlayed = input.holesPlayed ?? 18;
  const playerIds = input.playerIds ?? [input.userId];
  const playerNames = input.playerNames ?? [input.playerName];
  const relatedGroupIds = [...new Set([...(input.relatedGroupIds ?? []), input.groupId ?? input.course.groupId].filter(Boolean) as string[])];
  return {
    id: input.id,
    groupId: input.groupId ?? null,
    relatedGroupIds,
    courseId: input.course.id,
    courseSourceId: input.course.sourceId,
    courseSourceProvider: input.course.sourceProvider,
    courseName: input.course.name,
    createdBy: input.userId,
    userId: input.userId,
    playerIds,
    playerNames,
    playerName: input.playerName,
    totalScore: input.totalScore,
    scoreToPar: input.totalScore - (getRoundPar(input.course, holesPlayed) ?? input.course.par),
    format: input.format,
    gameMode: input.format,
    teeBoxId: tee?.id ?? null,
    teeBoxName: tee?.name ?? 'Default tees',
    holesPlayed,
    holeScores: [],
    teamName: isScrambleFormat(input.format) ? input.teamName ?? playerNames.join(' and ') : '',
    teamMemberIds: isScrambleFormat(input.format) ? input.teamMemberIds ?? playerIds : [],
    dateKey: input.playedOn,
    playedOn: input.playedOn,
    notes: input.notes,
    photoUrls: [],
    visibility: input.visibility ?? 'friends',
    locationVerified: Boolean(input.locationVerified),
    distanceFromCourseMeters: typeof input.distanceFromCourseMeters === 'number' ? input.distanceFromCourseMeters : null,
    createdAt: input.createdAt,
  } satisfies Round;
}

function seedDemoStore(): DemoStore {
  const demoUid = 'user-demo';
  const friendUid = 'user-friend';
  const runnerUid = 'user-runner';
  const readerUid = 'user-reader';
  const groupId = 'group-demo';
  const publicFitnessGroupId = 'group-public-fitness';
  const publicFocusGroupId = 'group-public-focus';
  const starterCourseId = 'course-starter-municipal';
  const hillsCourseId = 'course-starter-hills';
  const publicCourseId = 'course-public-dunes';
  const starterCourseSourceId = 'mock-riverview-municipal';
  const hillsCourseSourceId = 'mock-willow-creek';
  const publicCourseSourceId = 'mock-three-ridges';
  const walkChallengeId = 'challenge-starter-walk';
  const waterChallengeId = 'challenge-starter-water';
  const journalChallengeId = 'challenge-starter-journal';
  const workoutChallengeId = 'challenge-public-workout';
  const readingChallengeId = 'challenge-public-reading';
  const demoWalkParticipationId = 'habit-demo-walk';
  const friendWalkParticipationId = 'habit-friend-walk';
  const demoWaterParticipationId = 'habit-demo-water';
  const friendWaterParticipationId = 'habit-friend-water';
  const demoJournalParticipationId = 'habit-demo-journal';
  const friendJournalParticipationId = 'habit-friend-journal';
  const runnerHabitId = 'habit-runner-workout';
  const readerHabitId = 'habit-reader-reading';
  const recentKeys = getRecentDateKeys(4);
  const currentWeekKeys = getCurrentWeekKeys();
  const previousWeekKeys = getPreviousWeekKeys();
  const todayKey = getCurrentDateKey();

  return {
    ...blankStore,
    users: {
      [demoUid]: { uid: demoUid, email: 'demo@rivl.app', password: 'password123' },
      [friendUid]: { uid: friendUid, email: 'friend@rivl.app', password: 'password123' },
      [runnerUid]: { uid: runnerUid, email: 'runner@rivl.app', password: 'password123' },
      [readerUid]: { uid: readerUid, email: 'reader@rivl.app', password: 'password123' },
    },
    profiles: {
      [demoUid]: {
        uid: demoUid,
        email: 'demo@rivl.app',
        name: 'Demo Captain',
        username: 'demo-captain',
        bio: 'Keeping one regular foursome active every week.',
        weeklyGoal: 5,
        onboardingCompleted: true,
        groupIds: [groupId],
        friendIds: [friendUid],
        incomingFriendRequestIds: [readerUid],
        outgoingFriendRequestIds: [],
        shopInventory: {
          ...getDefaultShopInventory(),
          streakRestoreCredits: 1,
        },
      },
      [friendUid]: {
        uid: friendUid,
        email: 'friend@rivl.app',
        name: 'Jamie',
        username: 'jamie',
        bio: 'Always chasing a lower score at the muni.',
        weeklyGoal: 6,
        onboardingCompleted: true,
        groupIds: [groupId],
        friendIds: [demoUid],
        incomingFriendRequestIds: [],
        outgoingFriendRequestIds: [],
        shopInventory: getDefaultShopInventory(),
      },
      [runnerUid]: {
        uid: runnerUid,
        email: 'runner@rivl.app',
        name: 'Avery',
        username: 'avery-runs',
        bio: 'Weekend golfer trying to beat 80.',
        weeklyGoal: 5,
        onboardingCompleted: true,
        groupIds: [publicFitnessGroupId],
        friendIds: [],
        incomingFriendRequestIds: [],
        outgoingFriendRequestIds: [],
        shopInventory: getDefaultShopInventory(),
      },
      [readerUid]: {
        uid: readerUid,
        email: 'reader@rivl.app',
        name: 'Mika',
        username: 'mika-reads',
        bio: 'Nine holes after work whenever possible.',
        weeklyGoal: 4,
        onboardingCompleted: true,
        groupIds: [publicFocusGroupId],
        friendIds: [],
        incomingFriendRequestIds: [],
        outgoingFriendRequestIds: [demoUid],
        shopInventory: getDefaultShopInventory(),
      },
    },
    challenges: {
      [walkChallengeId]: {
        id: walkChallengeId,
        groupId,
        title: 'Practice round',
        emoji: '18',
        category: 'Golf',
        description: 'Use the older tracker to keep one practice round visible for the group.',
        frequency: 'Daily',
        createdBy: demoUid,
        createdAt: new Date().toISOString(),
        status: 'active',
        startDateKey: currentWeekKeys[0],
        endDateKey: getCurrentWeekEndKey(),
        archivedAt: null,
        archivedBy: null,
        completedAt: null,
        winnerUserId: null,
        winnerDisplayName: null,
        active: true,
      },
      [waterChallengeId]: {
        id: waterChallengeId,
        groupId,
        title: 'Short game reps',
        emoji: 'SG',
        category: 'Golf',
        description: 'A simple stand-in tracker for chipping and putting reps.',
        frequency: 'Daily',
        createdBy: friendUid,
        createdAt: new Date().toISOString(),
        status: 'active',
        startDateKey: currentWeekKeys[0],
        endDateKey: getCurrentWeekEndKey(),
        archivedAt: null,
        archivedBy: null,
        completedAt: null,
        winnerUserId: null,
        winnerDisplayName: null,
        active: true,
      },
      [journalChallengeId]: {
        id: journalChallengeId,
        groupId,
        title: 'Weekend scramble',
        emoji: '2v2',
        category: 'Golf',
        description: 'A previous competition format kept around as demo history.',
        frequency: 'Daily',
        createdBy: demoUid,
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 8).toISOString(),
        status: 'completed',
        startDateKey: previousWeekKeys[0],
        endDateKey: previousWeekKeys[previousWeekKeys.length - 1],
        archivedAt: null,
        archivedBy: null,
        completedAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
        winnerUserId: friendUid,
        winnerDisplayName: 'Jamie',
        active: false,
      },
      [workoutChallengeId]: {
        id: workoutChallengeId,
        groupId: publicFitnessGroupId,
        title: 'Range session',
        emoji: 'RS',
        category: 'Golf',
        description: 'A lightweight tracker for range work between rounds.',
        frequency: 'Daily',
        createdBy: runnerUid,
        createdAt: new Date().toISOString(),
        status: 'active',
        startDateKey: currentWeekKeys[0],
        endDateKey: getCurrentWeekEndKey(),
        archivedAt: null,
        archivedBy: null,
        completedAt: null,
        winnerUserId: null,
        winnerDisplayName: null,
        active: true,
      },
      [readingChallengeId]: {
        id: readingChallengeId,
        groupId: publicFocusGroupId,
        title: 'Nine-hole loop',
        emoji: '9',
        category: 'Golf',
        description: 'A compact format for groups that squeeze in quick rounds.',
        frequency: 'Daily',
        createdBy: readerUid,
        createdAt: new Date().toISOString(),
        status: 'active',
        startDateKey: currentWeekKeys[0],
        endDateKey: getCurrentWeekEndKey(),
        archivedAt: null,
        archivedBy: null,
        completedAt: null,
        winnerUserId: null,
        winnerDisplayName: null,
        active: true,
      },
    },
    habits: {
      [demoWalkParticipationId]: {
        id: demoWalkParticipationId,
        userId: demoUid,
        groupId,
        challengeId: walkChallengeId,
        title: 'Practice round',
        emoji: '🚶',
        category: 'Health',
        createdAt: new Date().toISOString(),
        checkIns: recentKeys.slice(0, 3),
        restoreUsedForDate: null,
        restoreUsedAt: null,
      },
      [friendWalkParticipationId]: {
        id: friendWalkParticipationId,
        userId: friendUid,
        groupId,
        challengeId: walkChallengeId,
        title: 'Practice round',
        emoji: 'Walk',
        category: 'Health',
        createdAt: new Date().toISOString(),
        checkIns: recentKeys.slice(1, 4),
        restoreUsedForDate: null,
        restoreUsedAt: null,
      },
      [demoWaterParticipationId]: {
        id: demoWaterParticipationId,
        userId: demoUid,
        groupId,
        challengeId: waterChallengeId,
        title: 'Short game reps',
        emoji: 'Water',
        category: 'Wellness',
        createdAt: new Date().toISOString(),
        checkIns: recentKeys.slice(0, 2),
        restoreUsedForDate: null,
        restoreUsedAt: null,
      },
      [friendWaterParticipationId]: {
        id: friendWaterParticipationId,
        userId: friendUid,
        groupId,
        challengeId: waterChallengeId,
        title: 'Short game reps',
        emoji: '💧',
        category: 'Wellness',
        createdAt: new Date().toISOString(),
        checkIns: recentKeys.slice(2, 4),
        restoreUsedForDate: null,
        restoreUsedAt: null,
      },
      [demoJournalParticipationId]: {
        id: demoJournalParticipationId,
        userId: demoUid,
        groupId,
        challengeId: journalChallengeId,
        title: 'Weekend scramble',
        emoji: 'Write',
        category: 'Reflection',
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 8).toISOString(),
        checkIns: previousWeekKeys.slice(0, 3),
        restoreUsedForDate: null,
        restoreUsedAt: null,
      },
      [friendJournalParticipationId]: {
        id: friendJournalParticipationId,
        userId: friendUid,
        groupId,
        challengeId: journalChallengeId,
        title: 'Weekend scramble',
        emoji: 'Write',
        category: 'Reflection',
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 8).toISOString(),
        checkIns: previousWeekKeys.slice(0, 5),
        restoreUsedForDate: null,
        restoreUsedAt: null,
      },
      [runnerHabitId]: {
        id: runnerHabitId,
        userId: runnerUid,
        groupId: publicFitnessGroupId,
        challengeId: workoutChallengeId,
        title: 'Range session',
        emoji: 'Fit',
        category: 'Fitness',
        createdAt: new Date().toISOString(),
        checkIns: recentKeys.slice(1, 4),
        restoreUsedForDate: null,
        restoreUsedAt: null,
      },
      [readerHabitId]: {
        id: readerHabitId,
        userId: readerUid,
        groupId: publicFocusGroupId,
        challengeId: readingChallengeId,
        title: 'Nine-hole loop',
        emoji: 'R',
        category: 'Learning',
        createdAt: new Date().toISOString(),
        checkIns: recentKeys.slice(0, 2),
        restoreUsedForDate: null,
        restoreUsedAt: null,
      },
    },
    courses: {
      [starterCourseId]: buildSeedCourseFromCatalog(starterCourseId, groupId, demoUid, starterCourseSourceId),
      [hillsCourseId]: buildSeedCourseFromCatalog(hillsCourseId, groupId, friendUid, hillsCourseSourceId),
      [publicCourseId]: buildSeedCourseFromCatalog(publicCourseId, publicFitnessGroupId, runnerUid, publicCourseSourceId),
    },
    rounds: {
      'round-demo-1': buildSeedRound({
        id: 'round-demo-1',
        groupId,
        course: buildSeedCourseFromCatalog(starterCourseId, groupId, demoUid, starterCourseSourceId),
        userId: demoUid,
        playerName: 'Demo Captain',
        format: 'individual',
        playedOn: todayKey,
        totalScore: 86,
        notes: 'Steady back nine.',
        createdAt: new Date(Date.now() - 1000 * 60 * 50).toISOString(),
      }),
      'round-demo-2': buildSeedRound({
        id: 'round-demo-2',
        groupId,
        course: buildSeedCourseFromCatalog(starterCourseId, groupId, demoUid, starterCourseSourceId),
        userId: friendUid,
        playerName: 'Jamie',
        format: 'individual',
        playedOn: todayKey,
        totalScore: 83,
        notes: 'Best putting day this month.',
        createdAt: new Date(Date.now() - 1000 * 60 * 80).toISOString(),
      }),
      'round-demo-3': buildSeedRound({
        id: 'round-demo-3',
        groupId,
        course: buildSeedCourseFromCatalog(hillsCourseId, groupId, friendUid, hillsCourseSourceId),
        userId: demoUid,
        playerName: 'Demo Captain',
        format: 'scramble2',
        playedOn: previousWeekKeys[previousWeekKeys.length - 1],
        totalScore: 68,
        notes: 'Jamie and Demo Captain took the back-nine birdie train all the way in.',
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString(),
        visibility: 'friends',
        teamName: 'Match Play Mischief',
        teamMemberIds: [demoUid, friendUid],
        playerIds: [demoUid, friendUid],
        playerNames: ['Demo Captain', 'Jamie'],
      }),
      'round-public-1': buildSeedRound({
        id: 'round-public-1',
        groupId: publicFitnessGroupId,
        course: buildSeedCourseFromCatalog(publicCourseId, publicFitnessGroupId, runnerUid, publicCourseSourceId),
        userId: runnerUid,
        playerName: 'Avery',
        format: 'individual',
        playedOn: todayKey,
        totalScore: 81,
        notes: 'Windy front nine, clean finish.',
        createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
        visibility: 'public',
      }),
      'round-scramble-2-public': buildSeedRound({
        id: 'round-scramble-2-public',
        groupId,
        course: buildSeedCourseFromCatalog(starterCourseId, groupId, demoUid, starterCourseSourceId),
        userId: demoUid,
        playerName: 'Demo Captain',
        format: 'scramble2',
        playedOn: recentKeys[recentKeys.length - 1],
        totalScore: 68,
        notes: 'Two-man scramble score to beat.',
        createdAt: new Date(Date.now() - 1000 * 60 * 18).toISOString(),
        visibility: 'public',
        teamName: 'Cart Path Only',
        teamMemberIds: [demoUid, friendUid],
        playerIds: [demoUid, friendUid],
        playerNames: ['Demo Captain', 'Jamie'],
        locationVerified: true,
        distanceFromCourseMeters: 142,
      }),
      'round-scramble-3-public': buildSeedRound({
        id: 'round-scramble-3-public',
        groupId: publicFitnessGroupId,
        course: buildSeedCourseFromCatalog(publicCourseId, publicFitnessGroupId, runnerUid, publicCourseSourceId),
        userId: runnerUid,
        playerName: 'Avery',
        format: 'scramble3',
        playedOn: recentKeys[recentKeys.length - 2],
        totalScore: 64,
        notes: 'Three players, one clean card.',
        createdAt: new Date(Date.now() - 1000 * 60 * 115).toISOString(),
        visibility: 'public',
        teamName: 'Pin Seekers',
        teamMemberIds: [runnerUid],
        playerIds: [runnerUid],
        playerNames: ['Avery', 'Noah', 'Reese'],
        locationVerified: true,
        distanceFromCourseMeters: 224,
      }),
      'round-scramble-4-public': buildSeedRound({
        id: 'round-scramble-4-public',
        groupId: publicFocusGroupId,
        course: buildSeedCourseFromCatalog(publicCourseId, publicFocusGroupId, readerUid, publicCourseSourceId),
        userId: readerUid,
        playerName: 'Mika',
        format: 'scramble4',
        playedOn: todayKey,
        totalScore: 61,
        notes: 'Four-man scramble lit up the back nine.',
        createdAt: new Date(Date.now() - 1000 * 60 * 20).toISOString(),
        visibility: 'public',
        teamName: 'Dead Solid Perfect',
        teamMemberIds: [readerUid],
        playerIds: [readerUid],
        playerNames: ['Mika', 'Sam', 'Priya', 'Cole'],
        locationVerified: false,
        distanceFromCourseMeters: null,
      }),
    },
    activeRounds: {},
    roundInvites: {},
    groups: {
      [groupId]: {
        id: groupId,
        name: 'Starter Foursome',
        description: 'A seeded demo golf group with shared courses, rounds, chat, and score pressure from the first launch.',
        ownerId: demoUid,
        memberIds: [demoUid, friendUid],
        joinCode: 'START1',
        visibility: 'private',
        inviteOnly: true,
        discoverable: false,
        stakesEnabled: true,
        stakesText: 'Last place buys coffee on Monday.',
        memberLimit: 8,
        createdAt: new Date().toISOString(),
      },
      [publicFitnessGroupId]: {
        id: publicFitnessGroupId,
        name: 'Morning Tee Time',
        description: 'A public starter golf group for players who want one dependable weekly round.',
        ownerId: runnerUid,
        memberIds: [runnerUid],
        joinCode: 'MOVE10',
        visibility: 'public',
        inviteOnly: false,
        discoverable: true,
        stakesEnabled: false,
        stakesText: '',
        memberLimit: 12,
        createdAt: new Date().toISOString(),
      },
      [publicFocusGroupId]: {
        id: publicFocusGroupId,
        name: 'Twilight Nine',
        description: 'A public golf group for quick evening rounds and score tracking.',
        ownerId: readerUid,
        memberIds: [readerUid],
        joinCode: 'FOCUS1',
        visibility: 'public',
        inviteOnly: false,
        discoverable: true,
        stakesEnabled: false,
        stakesText: '',
        memberLimit: 10,
        createdAt: new Date().toISOString(),
      },
    },
    groupMessages: {
      [groupId]: [
        {
          id: 'message-demo-1',
          groupId,
          senderId: friendUid,
          senderName: 'Jamie',
          text: 'Carded an 83 at Riverview. No chance I am losing this week.',
          createdAt: new Date(Date.now() - 1000 * 60 * 90).toISOString(),
        },
        {
          id: 'message-demo-2',
          groupId,
          senderId: demoUid,
          senderName: 'Demo Captain',
          text: 'Logging mine tonight. Keep the pressure on.',
          createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
        },
      ],
      [publicFitnessGroupId]: [
        {
          id: 'message-public-fitness-1',
          groupId: publicFitnessGroupId,
          senderId: runnerUid,
          senderName: 'Avery',
          text: 'Welcome. Log real scores and keep the group honest.',
          createdAt: new Date(Date.now() - 1000 * 60 * 55).toISOString(),
        },
      ],
      [publicFocusGroupId]: [
        {
          id: 'message-public-focus-1',
          groupId: publicFocusGroupId,
          senderId: readerUid,
          senderName: 'Mika',
          text: 'Fresh week, fresh scorecard. Jump in when you are ready.',
          createdAt: new Date(Date.now() - 1000 * 60 * 70).toISOString(),
        },
      ],
    },
    activities: [
      {
        id: 'activity-demo-round',
        type: 'round_logged',
        actorId: friendUid,
        actorName: 'Jamie',
        groupId,
        groupName: 'Starter Foursome',
        habitId: null,
        habitTitle: null,
        courseId: starterCourseId,
        courseName: 'Riverview Municipal',
        roundId: 'round-demo-2',
        gameMode: 'individual',
        score: 83,
        scoreToPar: 11,
        targetUserId: null,
        targetUserName: null,
        summary: 'Jamie shot 83 (+11) at Riverview Municipal.',
        createdAt: new Date(Date.now() - 1000 * 60 * 35).toISOString(),
        shoutouts: {
          ...getEmptyShoutouts(),
          keep_going: [demoUid],
        },
      },
      {
        id: 'activity-demo-best',
        type: 'personal_best',
        actorId: demoUid,
        actorName: 'Demo Captain',
        groupId,
        groupName: 'Starter Foursome',
        habitId: null,
        habitTitle: null,
        courseId: starterCourseId,
        courseName: 'Riverview Municipal',
        roundId: 'round-demo-1',
        gameMode: 'individual',
        score: 86,
        scoreToPar: 14,
        targetUserId: null,
        targetUserName: null,
        summary: 'Demo Captain set a new personal best: 86 (+14) at Riverview Municipal.',
        createdAt: new Date(Date.now() - 1000 * 60 * 80).toISOString(),
        shoutouts: getEmptyShoutouts(),
      },
      {
        id: 'activity-demo-join',
        type: 'league_join',
        actorId: runnerUid,
        actorName: 'Avery',
        groupId: publicFitnessGroupId,
        groupName: 'Morning Tee Time',
        habitId: null,
        habitTitle: null,
        courseId: null,
        courseName: null,
        roundId: null,
        gameMode: null,
        score: null,
        scoreToPar: null,
        targetUserId: null,
        targetUserName: null,
        summary: 'Avery joined Morning Tee Time',
        createdAt: new Date(Date.now() - 1000 * 60 * 140).toISOString(),
        shoutouts: getEmptyShoutouts(),
      },
    ],
  };
}

function seedWelcomeMessages(group: Group, senderName: string, senderId: string): GroupMessage[] {
  return [
    {
      id: createId('message'),
      groupId: group.id,
      senderId,
      senderName,
      text: `Welcome to ${group.name}. Use the chat to plan rounds, share photos, and keep the scores honest each week.`,
      createdAt: new Date().toISOString(),
    },
  ];
}

function getRecentDateKeys(days: number) {
  return Array.from({ length: days }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (days - index));
    return date.toISOString().slice(0, 10);
  });
}

function createId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

function createJoinCode() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

function normalizeDemoEmailAlias(email: string) {
  const normalized = email.trim().toLowerCase();
  if (normalized.endsWith('@rivl.app')) {
    return normalized.replace('@rivl.app', '@habitleague.app');
  }
  return normalized;
}

function isFirestorePermissionError(error: unknown) {
  return error instanceof Error && error.message.includes('Missing or insufficient permissions');
}

function createUsername(name: string, email: string) {
  const source = name.trim() || email.split('@')[0] || 'player';
  return source
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 18);
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return 'Something went wrong. Please try again.';
}
