import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useMemo, useState } from 'react';
import { Text, View } from 'react-native';

import { AppScreen } from '@/components/AppScreen';
import { LoadingScreen } from '@/components/LoadingScreen';
import { PrimaryButton } from '@/components/PrimaryButton';
import { SectionHeader } from '@/components/SectionHeader';
import { SurfaceCard } from '@/components/SurfaceCard';
import { TextField } from '@/components/TextField';
import { useApp } from '@/context/AppProvider';
import { useThemePreferences } from '@/context/ThemeProvider';
import { createCommonStyles } from '@/styles/commonStyles';
import { GroupDetails } from '@/types/models';

type FriendInvite = {
  id: string;
  name: string;
  email: string;
};

type FriendStanding = {
  userId: string;
  name: string;
  weeklyCheckIns: number;
  completedHabits: number;
  sharedGroups: string[];
};

export default function FriendsTabScreen() {
  const { getGroupDetails, groups, profile } = useApp();
  const { theme } = useThemePreferences();
  const commonStyles = createCommonStyles(theme.colors);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [invites, setInvites] = useState<FriendInvite[]>([]);
  const [groupDetails, setGroupDetails] = useState<GroupDetails[]>([]);

  useEffect(() => {
    let active = true;

    async function loadPageState() {
      if (!profile) {
        return;
      }

      const [details, storedInvites] = await Promise.all([
        Promise.all(groups.map((group) => getGroupDetails(group.id))),
        AsyncStorage.getItem(getInviteStorageKey(profile.uid)),
      ]);

      if (!active) {
        return;
      }

      setGroupDetails(details.filter(Boolean) as GroupDetails[]);
      setInvites(storedInvites ? (JSON.parse(storedInvites) as FriendInvite[]) : []);
    }

    loadPageState();

    return () => {
      active = false;
    };
  }, [getGroupDetails, groups, profile]);

  const standings = useMemo(() => {
    const map = new Map<string, FriendStanding>();

    groupDetails.forEach((details) => {
      details.leaderboard.forEach((entry) => {
        const current = map.get(entry.userId);
        if (current) {
          current.weeklyCheckIns = Math.max(current.weeklyCheckIns, entry.weeklyCheckIns);
          current.completedHabits = Math.max(current.completedHabits, entry.completedHabits);
          if (!current.sharedGroups.includes(details.group.name)) {
            current.sharedGroups.push(details.group.name);
          }
          return;
        }

        map.set(entry.userId, {
          userId: entry.userId,
          name: entry.name,
          weeklyCheckIns: entry.weeklyCheckIns,
          completedHabits: entry.completedHabits,
          sharedGroups: [details.group.name],
        });
      });
    });

    return Array.from(map.values()).sort((left, right) => right.weeklyCheckIns - left.weeklyCheckIns);
  }, [groupDetails]);

  if (!profile) {
    return <LoadingScreen message="Loading your friends..." />;
  }

  const profileId = profile.uid;

  async function handleAddFriend() {
    if (!name.trim() || !email.trim()) {
      return;
    }

    const nextInvites = [
      {
        id: `invite-${Date.now()}`,
        name: name.trim(),
        email: email.trim(),
      },
      ...invites,
    ];

    setInvites(nextInvites);
    await AsyncStorage.setItem(getInviteStorageKey(profileId), JSON.stringify(nextInvites));
    setName('');
    setEmail('');
  }

  const friendStandings = standings.filter((entry) => entry.userId !== profile.uid);

  return (
    <AppScreen scrollable>
      <View style={commonStyles.heroPanelWarm}>
        <Text style={commonStyles.eyebrow}>Friends</Text>
        <Text style={commonStyles.pageTitle}>Build your social streak circle</Text>
        <Text style={commonStyles.pageCopy}>
          Add a few people you want to keep up with and track how your weekly pace compares.
        </Text>
      </View>

      <SurfaceCard>
        <SectionHeader title="Add friends" />
        <TextField label="Friend name" value={name} onChangeText={setName} placeholder="Jamie" />
        <TextField label="Friend email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
        <PrimaryButton label="Save invite" onPress={handleAddFriend} />
      </SurfaceCard>

      <SectionHeader title="Friends leaderboard" />
      {standings.length ? (
        standings.map((entry, index) => (
          <SurfaceCard key={entry.userId} style={entry.userId === profile.uid ? commonStyles.currentUserCard : undefined}>
            <View style={commonStyles.rowBetween}>
              <Text style={commonStyles.cardTitle}>
                {index + 1}. {entry.name}
              </Text>
              <Text style={commonStyles.statValue}>{entry.weeklyCheckIns}</Text>
            </View>
            <Text style={commonStyles.cardCopy}>
              {entry.completedHabits} habits tracked across {entry.sharedGroups.join(', ')}
            </Text>
          </SurfaceCard>
        ))
      ) : (
        <SurfaceCard>
          <Text style={commonStyles.cardTitle}>No leaderboard yet</Text>
          <Text style={commonStyles.cardCopy}>Join a group and your shared friends will appear here automatically.</Text>
        </SurfaceCard>
      )}

      <SectionHeader title="Saved invites" />
      {invites.length ? (
        invites.map((invite) => (
          <SurfaceCard key={invite.id}>
            <Text style={commonStyles.cardTitle}>{invite.name}</Text>
            <Text style={commonStyles.cardCopy}>{invite.email}</Text>
          </SurfaceCard>
        ))
      ) : (
        <SurfaceCard>
          <Text style={commonStyles.cardTitle}>No invites saved</Text>
          <Text style={commonStyles.cardCopy}>Save a few invites here while you decide who to bring into the app.</Text>
        </SurfaceCard>
      )}

      {friendStandings.length ? (
        <>
          <SectionHeader title="People you already share groups with" />
          {friendStandings.map((friend) => (
            <SurfaceCard key={`friend-${friend.userId}`}>
              <Text style={commonStyles.cardTitle}>{friend.name}</Text>
              <Text style={commonStyles.cardCopy}>Shared groups: {friend.sharedGroups.join(', ')}</Text>
            </SurfaceCard>
          ))}
        </>
      ) : null}
    </AppScreen>
  );
}

function getInviteStorageKey(uid: string) {
  return `habitleague:friend-invites:${uid}`;
}
