import AsyncStorage from '@react-native-async-storage/async-storage';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut as firebaseSignOut } from 'firebase/auth';
import {
  arrayRemove,
  arrayUnion,
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';

import { firebaseAuth, firebaseConfigured, firestore } from '@/lib/firebase';
import { getCurrentWeekKeys } from '@/lib/date';
import { AppBundle, DemoStore, Group, GroupDetails, Habit, LeaderboardEntry, Profile, SessionUser } from '@/types/models';

const STORAGE_KEY = 'habitleague:demo-store';

export const usingFirebaseBackend = firebaseConfigured && !!firebaseAuth && !!firestore;

const blankStore: DemoStore = {
  currentUserId: null,
  users: {},
  profiles: {},
  habits: {},
  groups: {},
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
        return snapshot.exists() ? (snapshot.data() as Group) : null;
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
  const groups = (profile.groupIds ?? []).map((groupId) => store.groups[groupId]).filter(Boolean);

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

export async function createGroup(uid: string, name: string, description: string) {
  const group: Group = {
    id: createId('group'),
    name,
    description,
    ownerId: uid,
    memberIds: [uid],
    joinCode: createJoinCode(),
    createdAt: new Date().toISOString(),
  };

  if (usingFirebaseBackend && firestore) {
    await setDoc(doc(firestore, 'groups', group.id), group);
    await updateDoc(doc(firestore, 'profiles', uid), { groupIds: arrayUnion(group.id) });
    return group.id;
  }

  const store = await readDemoStore();
  store.groups[group.id] = group;
  store.profiles[uid].groupIds = [...new Set([...(store.profiles[uid].groupIds ?? []), group.id])];
  await writeDemoStore(store);
  return group.id;
}

export async function joinGroup(uid: string, joinCode: string) {
  if (usingFirebaseBackend && firestore) {
    const match = await getDocs(query(collection(firestore, 'groups'), where('joinCode', '==', joinCode), limit(1)));
    if (!match.docs.length) {
      return { ok: false, message: 'That join code was not found.' };
    }

    const group = match.docs[0].data() as Group;
    await updateDoc(doc(firestore, 'groups', group.id), { memberIds: arrayUnion(uid) });
    await updateDoc(doc(firestore, 'profiles', uid), { groupIds: arrayUnion(group.id) });
    return { ok: true, message: 'Joined group.', groupId: group.id };
  }

  const store = await readDemoStore();
  const group = Object.values(store.groups).find((entry) => entry.joinCode === joinCode);
  if (!group) {
    return { ok: false, message: 'That join code was not found.' };
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

    const group = groupSnapshot.data() as Group;
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
  const group = store.groups[groupId];
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
    return JSON.parse(raw) as DemoStore;
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
        createdAt: new Date().toISOString(),
      },
    },
  };
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
