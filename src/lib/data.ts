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
import { getCurrentWeekKeys } from '@/lib/date';
import { AppBundle, DemoStore, Group, GroupDetails, GroupMessage, GroupSettingsInput, Habit, LeaderboardEntry, Profile, SessionUser } from '@/types/models';

const STORAGE_KEY = 'habitleague:demo-store';

export const usingFirebaseBackend = firebaseConfigured && !!firebaseAuth && !!firestore;

const blankStore: DemoStore = {
  currentUserId: null,
  users: {},
  profiles: {},
  habits: {},
  groups: {},
  groupMessages: {},
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
    const habits = habitsSnapshot.docs
      .map((entry) => entry.data() as Habit)
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

  const habits = Object.values(store.habits)
    .filter((habit) => habit.userId === uid)
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

export async function createHabit(uid: string, input: { title: string; emoji: string; category: string }) {
  const habit: Habit = {
    id: createId('habit'),
    userId: uid,
    title: input.title.trim(),
    emoji: input.emoji.trim() || '🔥',
    category: input.category.trim() || 'General',
    createdAt: new Date().toISOString(),
    checkIns: [],
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

    const habit = snapshot.data() as Habit;
    await updateDoc(habitRef, {
      checkIns: habit.checkIns.includes(todayKey) ? arrayRemove(todayKey) : arrayUnion(todayKey),
    });
    return;
  }

  const store = await readDemoStore();
  const habit = store.habits[habitId];
  if (!habit || habit.userId !== uid) {
    return;
  }

  const nextCheckIns = habit.checkIns.includes(todayKey)
    ? habit.checkIns.filter((entry) => entry !== todayKey)
    : [...habit.checkIns, todayKey];

  store.habits[habitId] = { ...habit, checkIns: nextCheckIns };
  await writeDemoStore(store);
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
    await updateDoc(doc(firestore, 'groups', group.id), { memberIds: arrayUnion(uid) });
    await updateDoc(doc(firestore, 'profiles', uid), { groupIds: arrayUnion(group.id) });
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
  await writeDemoStore(store);
  return { ok: true, message: 'Joined group.', groupId: group.id };
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
    const habits = (
      await Promise.all(
        group.memberIds.map(async (uid) => {
          const snapshot = await getDocs(query(collection(db, 'habits'), where('userId', '==', uid)));
          return snapshot.docs.map((entry) => entry.data() as Habit);
        })
      )
    ).flat();

    return {
      group,
      members,
      leaderboard: buildLeaderboard(members, habits),
    };
  }

  const store = await readDemoStore();
  const group = normalizeGroup(store.groups[groupId]);
  if (!group) {
    return null;
  }

  const members = group.memberIds.map((uid) => normalizeProfile(store.profiles[uid])).filter(Boolean);
  const habits = Object.values(store.habits).filter((habit) => group.memberIds.includes(habit.userId));
  return {
    group,
    members,
    leaderboard: buildLeaderboard(members, habits),
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
  };
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

function buildLeaderboard(members: Profile[], habits: Habit[]): LeaderboardEntry[] {
  const weekKeys = new Set(getCurrentWeekKeys());

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
    return {
      ...blankStore,
      ...parsed,
      groupMessages: parsed.groupMessages || {},
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
  const groupId = 'group-demo';
  const habitId = 'habit-demo';
  const friendHabitId = 'habit-friend';
  const weekKeys = getCurrentWeekKeys();

  return {
    ...blankStore,
    users: {
      [demoUid]: { uid: demoUid, email: 'demo@habitleague.app', password: 'password123' },
      [friendUid]: { uid: friendUid, email: 'friend@habitleague.app', password: 'password123' },
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
      },
    },
    habits: {
      [habitId]: {
        id: habitId,
        userId: demoUid,
        title: 'Morning walk',
        emoji: '🚶',
        category: 'Health',
        createdAt: new Date().toISOString(),
        checkIns: weekKeys.slice(0, 4),
      },
      [friendHabitId]: {
        id: friendHabitId,
        userId: friendUid,
        title: 'Drink water',
        emoji: '💧',
        category: 'Wellness',
        createdAt: new Date().toISOString(),
        checkIns: weekKeys.slice(0, 5),
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
    },
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
