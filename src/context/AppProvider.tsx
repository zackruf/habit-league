import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, PropsWithChildren, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import {
  createGroup as createGroupRequest,
  createHabit as createHabitRequest,
  getGroupDetails,
  initializeUserProfile,
  joinGroup as joinGroupRequest,
  loadUserBundle,
  restoreSession,
  saveProfile as saveProfileRequest,
  signIn as signInRequest,
  signOut as signOutRequest,
  signUp as signUpRequest,
  toggleHabitCheckIn as toggleHabitCheckInRequest,
  usingFirebaseBackend,
} from '@/lib/data';
import { AppBundle, GroupDetails, Habit, Profile, SessionUser } from '@/types/models';

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
  habits: Habit[];
  groups: AppBundle['groups'];
  signIn: (email: string, password: string) => Promise<ActionResult>;
  signUp: (name: string, email: string, password: string) => Promise<ActionResult>;
  signOut: () => Promise<void>;
  saveProfile: (patch: Partial<Profile>) => Promise<ActionResult>;
  createHabit: (input: { title: string; emoji: string; category: string }) => Promise<ActionResult>;
  toggleHabitCheckIn: (habitId: string) => Promise<void>;
  createGroup: (input: {
    name: string;
    description: string;
    visibility: 'public' | 'private';
    stakesEnabled: boolean;
    stakesText: string;
    memberLimit?: number | null;
  }) => Promise<GroupActionResult>;
  joinGroup: (joinCode: string) => Promise<GroupActionResult>;
  getGroupDetails: (groupId: string) => Promise<GroupDetails | null>;
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

  const hydrateBundle = useCallback((bundle: AppBundle | null) => {
    setProfile(bundle?.profile ?? null);
    setHabits(bundle?.habits ?? []);
    setGroups(bundle?.groups ?? []);
  }, []);

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
        await initializeUserProfile(restored.uid, restored.email);
        const bundle = await loadUserBundle(restored.uid);
        setSession(restored);
        hydrateBundle(bundle);
      }

      setAuthReady(true);
    }

    bootstrap();
  }, [hydrateBundle]);

  const signIn = useCallback(
    async (email: string, password: string) => {
      setBusy(true);
      const result = await signInRequest(email.trim(), password);

      if (!result.ok || !result.user) {
        setBusy(false);
        return { ok: false, message: result.message };
      }

      await initializeUserProfile(result.user.uid, result.user.email);
      const bundle = await loadUserBundle(result.user.uid);
      setSession(result.user);
      hydrateBundle(bundle);
      setBusy(false);
      return { ok: true, message: 'Signed in.' };
    },
    [hydrateBundle]
  );

  const signUp = useCallback(
    async (name: string, email: string, password: string) => {
      setBusy(true);
      const result = await signUpRequest(name.trim(), email.trim(), password);

      if (!result.ok || !result.user) {
        setBusy(false);
        return { ok: false, message: result.message };
      }

      await initializeUserProfile(result.user.uid, result.user.email, name.trim());
      const bundle = await loadUserBundle(result.user.uid);
      setSession(result.user);
      hydrateBundle(bundle);
      setBusy(false);
      return { ok: true, message: 'Account created.' };
    },
    [hydrateBundle]
  );

  const signOut = useCallback(async () => {
    await signOutRequest();
    setSession(null);
    hydrateBundle(null);
  }, [hydrateBundle]);

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
    async (input: { title: string; emoji: string; category: string }) => {
      if (!session) {
        return { ok: false, message: 'No active session.' };
      }

      if (!input.title.trim()) {
        return { ok: false, message: 'Please enter a habit name.' };
      }

      setBusy(true);
      await createHabitRequest(session.uid, input);
      await refreshUserData(session);
      setBusy(false);
      return { ok: true, message: 'Habit created.' };
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

  const createGroup = useCallback(
    async (input: {
      name: string;
      description: string;
      visibility: 'public' | 'private';
      stakesEnabled: boolean;
      stakesText: string;
      memberLimit?: number | null;
    }) => {
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

  const value = useMemo<AppContextValue>(
    () => ({
      authReady,
      busy,
      refreshing,
      usingFirebase: usingFirebaseBackend,
      session,
      profile,
      habits,
      groups,
      signIn,
      signUp,
      signOut,
      saveProfile,
      createHabit,
      toggleHabitCheckIn,
      createGroup,
      joinGroup,
      getGroupDetails,
    }),
    [authReady, busy, refreshing, session, profile, habits, groups, signIn, signUp, signOut, saveProfile, createHabit, toggleHabitCheckIn, createGroup, joinGroup]
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
