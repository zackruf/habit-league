import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useMemo, useState } from 'react';
import { Text, View } from 'react-native';

import { AppScreen } from '@/components/AppScreen';
import { LoadingScreen } from '@/components/LoadingScreen';
import { PageHeader } from '@/components/PageHeader';
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
  const connectedFriends = standings.filter((entry) => entry.userId !== profileId);

  async function handleAddFriend() {
    if (!name.trim() || !email.trim()) {
      return;
    }

    const nextInvites = [{ id: `invite-${Date.now()}`, name: name.trim(), email: email.trim() }, ...invites];
    setInvites(nextInvites);
    await AsyncStorage.setItem(getInviteStorageKey(profileId), JSON.stringify(nextInvites));
    setName('');
    setEmail('');
  }

  return (
    <AppScreen scrollable contentContainerStyle={commonStyles.pageStack}>
      <PageHeader
        eyebrow="Friends"
        title="Your circle"
        subtitle={`You currently share progress with ${connectedFriends.length} people and have ${invites.length} saved invites.`}
      />

      <SurfaceCard style={commonStyles.sectionCard}>
        <SectionHeader title="Add friends" />
        <TextField label="Friend name" value={name} onChangeText={setName} placeholder="Jamie" />
        <TextField label="Friend email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
        <PrimaryButton label="Save invite" onPress={handleAddFriend} />
      </SurfaceCard>

      <SectionHeader title="Leaderboard with friends" />
      <View style={commonStyles.compactSection}>
        {standings.length ? (
          standings.map((entry, index) => (
            <SurfaceCard key={entry.userId} style={[commonStyles.listCard, entry.userId === profileId ? commonStyles.currentUserCard : undefined]}>
              <View style={commonStyles.listRow}>
                <View style={commonStyles.listRowMeta}>
                  <Text style={commonStyles.listRowTitle}>
                    {index + 1}. {entry.name}
                  </Text>
                  <Text style={commonStyles.listRowSubtitle}>{entry.sharedGroups.join(', ')}</Text>
                </View>
                <Text style={commonStyles.listValue}>{entry.weeklyCheckIns}</Text>
              </View>
            </SurfaceCard>
          ))
        ) : (
          <SurfaceCard>
            <Text style={commonStyles.cardTitle}>No leaderboard yet</Text>
            <Text style={commonStyles.cardCopy}>Join a group and your shared people will appear here automatically.</Text>
          </SurfaceCard>
        )}
      </View>

      <SectionHeader title="Saved invites" />
      <View style={commonStyles.compactSection}>
        {invites.length ? (
          invites.map((invite) => (
            <SurfaceCard key={invite.id} style={commonStyles.listCard}>
              <Text style={commonStyles.listRowTitle}>{invite.name}</Text>
              <Text style={commonStyles.listRowSubtitle}>{invite.email}</Text>
            </SurfaceCard>
          ))
        ) : (
          <SurfaceCard>
            <Text style={commonStyles.cardTitle}>No invites saved</Text>
            <Text style={commonStyles.cardCopy}>Store a few names here when you think of people to invite later.</Text>
          </SurfaceCard>
        )}
      </View>
    </AppScreen>
  );
}

function getInviteStorageKey(uid: string) {
  return `habitleague:friend-invites:${uid}`;
}
