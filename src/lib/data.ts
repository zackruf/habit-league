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
import { getCurrentWeekKeys, getPreviousWeekKeys } from '@/lib/date';
import { getDefaultShopInventory, normalizeShopInventory } from '@/lib/shop';
import { getHabitStreakStatus } from '@/lib/streaks';
import {
  ActivityInput,
  ActivityItem,
  ActivityShoutoutType,
  ActivityShoutouts,
  AppBundle,
  DemoStore,
  FriendRequestProfile,
  Group,
  GroupDetails,
  GroupMessage,
  GroupSettingsInput,
  Habit,
  LeaderboardEntry,
  Profile,
  SessionUser,
  UserSearchResult,
} from '@/types/models';

const STORAGE_KEY = 'habitleague:demo-store';

export const usingFirebaseBackend = firebaseConfigured && !!firebaseAuth && !!firestore;

const blankStore: DemoStore = {
  currentUserId: null,
  users: {},
  profiles: {},
  habits: {},
  groups: {},
  groupMessages: {},
  activities: [],
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
  const user = Object.values(store.users).find((entry) => entry.email.toLowerCase() === email.toLowerCase());
  if (!user || user.password !== password) {
    return { ok: false, message: 'Use demo@habitleague.app / password123 or create a new account.' };
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

    return {
      profile,
      habits,
      groups: groups.filter(Boolean) as Group[],
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

  return {
    profile,
    habits,
    groups,
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
    const [profileSnapshot, profilesSnapshot, groupsSnapshot] = await Promise.all([
      getDoc(doc(firestore, 'profiles', uid)),
      getDocs(query(collection(firestore, 'profiles'), limit(25))),
      getDocs(query(collection(firestore, 'groups'), where('discoverable', '==', true), limit(25))),
    ]);
    const currentProfile = normalizeProfile(profileSnapshot.data() as Profile);
    const groups = groupsSnapshot.docs.map((entry) => normalizeGroup(entry.data() as Group)).filter((group): group is Group => Boolean(group));
    const profiles = profilesSnapshot.docs.map((entry) => normalizeProfile(entry.data() as Profile));
    return buildUserSearchResults(uid, currentProfile, profiles, groups, normalizedTerm);
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

export async function createHabit(uid: string, input: { groupId: string; title: string; emoji: string; category: string }) {
  const habit: Habit = {
    id: createId('habit'),
    userId: uid,
    groupId: input.groupId,
    title: input.title.trim(),
    emoji: input.emoji.trim() || '🔥',
    category: input.category.trim() || 'General',
    createdAt: new Date().toISOString(),
    checkIns: [],
    restoreUsedForDate: null,
    restoreUsedAt: null,
  };

  if (usingFirebaseBackend && firestore) {
    await setDoc(doc(firestore, 'habits', habit.id), habit);
    return;
  }

  const store = await readDemoStore();
  store.habits[habit.id] = habit;
  await writeDemoStore(store);
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
    const snapshot = await getDocs(query(collection(firestore, 'groups'), where('discoverable', '==', true), limit(8)));
    return snapshot.docs
      .map((entry) => normalizeGroup(entry.data() as Group))
      .filter((group): group is Group => Boolean(group))
      .filter((group) => !uid || !group.memberIds.includes(uid))
      .filter((group) => !group.memberLimit || group.memberIds.length < group.memberLimit)
      .sort((left, right) => right.memberIds.length - left.memberIds.length);
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
    const snapshot = await getDocs(query(collection(firestore, 'groups', groupId, 'messages'), orderBy('createdAt', 'asc')));
    return snapshot.docs
      .map((entry) => normalizeMessage({ id: entry.id, ...(entry.data() as Omit<GroupMessage, 'id'>) }))
      .filter((message): message is GroupMessage => Boolean(message));
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
    const profileSnapshot = await getDoc(doc(firestore, 'profiles', uid));
    const profile = normalizeProfile(profileSnapshot.data() as Profile);
    const snapshot = await getDocs(query(collection(firestore, 'activities'), orderBy('createdAt', 'desc'), limit(50)));
    return snapshot.docs
      .map((entry) => normalizeActivity(entry.data() as ActivityItem))
      .filter((activity): activity is ActivityItem => Boolean(activity))
      .filter((activity) => activityMatchesFeed(activity, uid, profile, groupId))
      .slice(0, groupId ? 8 : 12);
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
      return { ok: false, message: 'That public league could not be found.' };
    }

    const group = normalizeGroup(snapshot.data() as Group);
    if (!group || group.visibility !== 'public' || !group.discoverable) {
      return { ok: false, message: 'That league is not open for public joining.' };
    }
    if (group.memberLimit && group.memberIds.length >= group.memberLimit && !group.memberIds.includes(uid)) {
      return { ok: false, message: 'This league is full right now.' };
    }

    const profileSnapshot = await getDoc(doc(firestore, 'profiles', uid));
    const profile = normalizeProfile(profileSnapshot.data() as Profile);
    await updateDoc(groupRef, { memberIds: arrayUnion(uid) });
    await updateDoc(doc(firestore, 'profiles', uid), { groupIds: arrayUnion(group.id) });
    await recordActivity({
      type: 'league_join',
      actorId: uid,
      actorName: profile.name,
      groupId: group.id,
      groupName: group.name,
    });
    return { ok: true, message: 'Joined public league.', groupId: group.id };
  }

  const store = await readDemoStore();
  const group = normalizeGroup(store.groups[groupId]);
  if (!group || group.visibility !== 'public' || !group.discoverable) {
    return { ok: false, message: 'That league is not open for public joining.' };
  }
  if (group.memberLimit && group.memberIds.length >= group.memberLimit && !group.memberIds.includes(uid)) {
    return { ok: false, message: 'This league is full right now.' };
  }

  store.groups[group.id] = { ...group, memberIds: [...new Set([...group.memberIds, uid])] };
  store.profiles[uid].groupIds = [...new Set([...(store.profiles[uid].groupIds ?? []), group.id])];
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
  return { ok: true, message: 'Joined public league.', groupId: group.id };
}

export async function getGroupDetails(groupId: string): Promise<GroupDetails | null> {
  const db = firestore;

  if (usingFirebaseBackend && db) {
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
    const memberFallbackGroupIds = new Map(members.map((member) => [member.uid, member.groupIds[0] ?? '']));
    const habits = (
      await Promise.all(
        group.memberIds.map(async (uid) => {
          const snapshot = await getDocs(query(collection(db, 'habits'), where('userId', '==', uid)));
          return snapshot.docs
            .map((entry) => normalizeHabit(entry.data() as Habit, memberFallbackGroupIds.get(uid) ?? ''))
            .filter((habit): habit is Habit => Boolean(habit));
        })
      )
    )
      .flat()
      .filter((habit) => habit.groupId === group.id);

    return {
      group,
      members,
      habits,
      leaderboard: buildLeaderboard(members, habits),
      previousWeekLeaderboard: buildLeaderboard(members, habits, getPreviousWeekKeys()),
    };
  }

  const store = await readDemoStore();
  const group = normalizeGroup(store.groups[groupId]);
  if (!group) {
    return null;
  }

  const members = group.memberIds.map((uid) => normalizeProfile(store.profiles[uid])).filter(Boolean);
  const memberFallbackGroupIds = new Map(members.map((member) => [member.uid, member.groupIds[0] ?? '']));
  const habits = Object.values(store.habits)
    .map((habit) => normalizeHabit(habit, memberFallbackGroupIds.get(habit?.userId ?? '') ?? ''))
    .filter((habit): habit is Habit => habit !== null && group.memberIds.includes(habit.userId) && habit.groupId === group.id);
  return {
    group,
    members,
    habits,
    leaderboard: buildLeaderboard(members, habits),
    previousWeekLeaderboard: buildLeaderboard(members, habits, getPreviousWeekKeys()),
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

function normalizeHabit(habit?: Habit | null, fallbackGroupId = ''): Habit | null {
  if (!habit) {
    return null;
  }

  return {
    ...habit,
    groupId: habit.groupId || fallbackGroupId,
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

function buildActivity(input: ActivityInput): ActivityItem {
  const groupName = input.groupName ?? null;
  const habitTitle = input.habitTitle ?? null;
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
    targetUserId: input.targetUserId ?? null,
    targetUserName,
    summary: buildActivitySummary(input),
    createdAt: new Date().toISOString(),
    shoutouts: getEmptyShoutouts(),
  };
}

function buildActivitySummary(input: ActivityInput) {
  const actor = input.actorName || 'Someone';

  if (input.type === 'check_in') {
    return `${actor} checked in ${input.habitTitle || 'a habit'}`;
  }

  if (input.type === 'rank_movement') {
    const spots = input.spotsMoved === 1 ? '1 spot' : `${input.spotsMoved || 0} spots`;
    return `${actor} moved up ${spots}${input.groupName ? ` in ${input.groupName}` : ''}`;
  }

  if (input.type === 'league_join') {
    return `${actor} joined ${input.groupName || 'a league'}`;
  }

  if (input.type === 'connection') {
    return `${actor} and ${input.targetUserName || 'a teammate'} connected`;
  }

  return `${actor} made progress`;
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
      return {
        userId: member.uid,
        name: member.name,
        weeklyCheckIns: memberHabits.reduce(
          (total, habit) => total + habit.checkIns.filter((entry) => weekKeys.has(entry)).length,
          0
        ),
        completedHabits: memberHabits.length,
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
      habits: { ...seeded.habits, ...(parsed.habits || {}) },
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

function seedDemoStore(): DemoStore {
  const demoUid = 'user-demo';
  const friendUid = 'user-friend';
  const runnerUid = 'user-runner';
  const readerUid = 'user-reader';
  const groupId = 'group-demo';
  const publicFitnessGroupId = 'group-public-fitness';
  const publicFocusGroupId = 'group-public-focus';
  const habitId = 'habit-demo';
  const friendHabitId = 'habit-friend';
  const runnerHabitId = 'habit-runner';
  const readerHabitId = 'habit-reader';
  const recentKeys = getRecentDateKeys(4);

  return {
    ...blankStore,
    users: {
      [demoUid]: { uid: demoUid, email: 'demo@habitleague.app', password: 'password123' },
      [friendUid]: { uid: friendUid, email: 'friend@habitleague.app', password: 'password123' },
      [runnerUid]: { uid: runnerUid, email: 'runner@habitleague.app', password: 'password123' },
      [readerUid]: { uid: readerUid, email: 'reader@habitleague.app', password: 'password123' },
    },
    profiles: {
      [demoUid]: {
        uid: demoUid,
        email: 'demo@habitleague.app',
        name: 'Demo Captain',
        username: 'demo-captain',
        bio: 'Trying to stay consistent one day at a time.',
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
        email: 'friend@habitleague.app',
        name: 'Jamie',
        username: 'jamie',
        bio: 'Morning runner and water tracker.',
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
        email: 'runner@habitleague.app',
        name: 'Avery',
        username: 'avery-runs',
        bio: 'Trying to stay ready for a 10K.',
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
        email: 'reader@habitleague.app',
        name: 'Mika',
        username: 'mika-reads',
        bio: 'Reading before screens.',
        weeklyGoal: 4,
        onboardingCompleted: true,
        groupIds: [publicFocusGroupId],
        friendIds: [],
        incomingFriendRequestIds: [],
        outgoingFriendRequestIds: [demoUid],
        shopInventory: getDefaultShopInventory(),
      },
    },
    habits: {
      [habitId]: {
        id: habitId,
        userId: demoUid,
        groupId,
        title: 'Morning walk',
        emoji: '🚶',
        category: 'Health',
        createdAt: new Date().toISOString(),
        checkIns: recentKeys.slice(0, 3),
        restoreUsedForDate: null,
        restoreUsedAt: null,
      },
      [friendHabitId]: {
        id: friendHabitId,
        userId: friendUid,
        groupId,
        title: 'Drink water',
        emoji: '💧',
        category: 'Wellness',
        createdAt: new Date().toISOString(),
        checkIns: recentKeys.slice(2, 4),
        restoreUsedForDate: null,
        restoreUsedAt: null,
      },
      [runnerHabitId]: {
        id: runnerHabitId,
        userId: runnerUid,
        groupId: publicFitnessGroupId,
        title: 'Workout',
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
        title: 'Read 10 pages',
        emoji: 'R',
        category: 'Learning',
        createdAt: new Date().toISOString(),
        checkIns: recentKeys.slice(0, 2),
        restoreUsedForDate: null,
        restoreUsedAt: null,
      },
    },
    groups: {
      [groupId]: {
        id: groupId,
        name: 'Starter League',
        description: 'A seeded demo group so the leaderboard has life on first launch.',
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
        name: 'Morning Movers',
        description: 'A public starter league for walking, workouts, and small daily fitness wins.',
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
        name: 'Focus Circle',
        description: 'A calm public league for reading, planning, and screen-free routines.',
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
          text: 'Morning walk is done. I am not buying coffee this week.',
          createdAt: new Date(Date.now() - 1000 * 60 * 90).toISOString(),
        },
        {
          id: 'message-demo-2',
          groupId,
          senderId: demoUid,
          senderName: 'Demo Captain',
          text: 'I am catching up tonight. Keep the pressure on.',
          createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
        },
      ],
      [publicFitnessGroupId]: [
        {
          id: 'message-public-fitness-1',
          groupId: publicFitnessGroupId,
          senderId: runnerUid,
          senderName: 'Avery',
          text: 'Welcome. Small check-ins count here, just do not disappear.',
          createdAt: new Date(Date.now() - 1000 * 60 * 55).toISOString(),
        },
      ],
      [publicFocusGroupId]: [
        {
          id: 'message-public-focus-1',
          groupId: publicFocusGroupId,
          senderId: readerUid,
          senderName: 'Mika',
          text: 'Fresh week, fresh pages. Jump in when you are ready.',
          createdAt: new Date(Date.now() - 1000 * 60 * 70).toISOString(),
        },
      ],
    },
    activities: [
      {
        id: 'activity-demo-check-in',
        type: 'check_in',
        actorId: friendUid,
        actorName: 'Jamie',
        groupId,
        groupName: 'Starter League',
        habitId: friendHabitId,
        habitTitle: 'Drink water',
        targetUserId: null,
        targetUserName: null,
        summary: 'Jamie checked in Drink water',
        createdAt: new Date(Date.now() - 1000 * 60 * 35).toISOString(),
        shoutouts: {
          ...getEmptyShoutouts(),
          keep_going: [demoUid],
        },
      },
      {
        id: 'activity-demo-rank',
        type: 'rank_movement',
        actorId: demoUid,
        actorName: 'Demo Captain',
        groupId,
        groupName: 'Starter League',
        habitId,
        habitTitle: 'Morning walk',
        targetUserId: null,
        targetUserName: null,
        summary: 'Demo Captain moved up 1 spot in Starter League',
        createdAt: new Date(Date.now() - 1000 * 60 * 80).toISOString(),
        shoutouts: getEmptyShoutouts(),
      },
      {
        id: 'activity-demo-join',
        type: 'league_join',
        actorId: runnerUid,
        actorName: 'Avery',
        groupId: publicFitnessGroupId,
        groupName: 'Morning Movers',
        habitId: null,
        habitTitle: null,
        targetUserId: null,
        targetUserName: null,
        summary: 'Avery joined Morning Movers',
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
      text: `Welcome to ${group.name}. Use the chat to keep the challenge active each week.`,
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
