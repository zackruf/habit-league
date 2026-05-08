import { useEffect, useMemo, useState } from 'react';
import { Text, View } from 'react-native';

import { ActivityFeed } from '@/components/ActivityFeed';
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
import { ActivityItem, ActivityShoutoutType, FriendRequestProfile, GroupDetails, UserSearchResult } from '@/types/models';

type FriendStanding = {
  userId: string;
  name: string;
  weeklyCheckIns: number;
  completedHabits: number;
  sharedGroups: string[];
};

export default function FriendsTabScreen() {
  const {
    acceptFriendRequest,
    addActivityShoutout,
    busy,
    declineFriendRequest,
    getActivityFeed,
    getGroupDetails,
    getIncomingFriendRequests,
    groups,
    profile,
    searchUsers,
    sendFriendRequest,
  } = useApp();
  const { theme } = useThemePreferences();
  const commonStyles = createCommonStyles(theme.colors);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<UserSearchResult[]>([]);
  const [feedback, setFeedback] = useState('');
  const [connectingId, setConnectingId] = useState<string | null>(null);
  const [groupDetails, setGroupDetails] = useState<GroupDetails[]>([]);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [incomingRequests, setIncomingRequests] = useState<FriendRequestProfile[]>([]);

  useEffect(() => {
    let active = true;

    async function loadSocialState() {
      if (!profile) {
        return;
      }

      const [details, people, requests] = await Promise.all([
        Promise.all(groups.map((group) => getGroupDetails(group.id))),
        searchUsers(query),
        getIncomingFriendRequests(),
      ]);

      if (!active) {
        return;
      }

      setGroupDetails(details.filter(Boolean) as GroupDetails[]);
      setResults(people);
      setIncomingRequests(requests);
    }

    loadSocialState();

    return () => {
      active = false;
    };
  }, [getGroupDetails, getIncomingFriendRequests, groups, profile, query, searchUsers]);

  useEffect(() => {
    let active = true;

    async function loadFeed() {
      const feed = await getActivityFeed();
      if (active) {
        setActivities(feed);
      }
    }

    loadFeed();

    return () => {
      active = false;
    };
  }, [getActivityFeed, profile?.friendIds, groups]);

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

  const connectedIds = new Set(profile.friendIds);
  const connectedPeople = results.filter((person) => connectedIds.has(person.uid));
  const discoveryResults = results.filter((person) => !connectedIds.has(person.uid));
  const profileId = profile.uid;

  async function refreshSocialLists() {
    const [nextResults, nextRequests, nextFeed] = await Promise.all([searchUsers(query), getIncomingFriendRequests(), getActivityFeed()]);
    setResults(nextResults);
    setIncomingRequests(nextRequests);
    setActivities(nextFeed);
  }

  async function handleSendRequest(userId: string) {
    setFeedback('');
    setConnectingId(userId);
    const result = await sendFriendRequest(userId);
    setFeedback(result.message);
    setConnectingId(null);

    if (result.ok) {
      await refreshSocialLists();
    }
  }

  async function handleAcceptRequest(userId: string) {
    setFeedback('');
    setConnectingId(userId);
    const result = await acceptFriendRequest(userId);
    setFeedback(result.message);
    setConnectingId(null);

    if (result.ok) {
      await refreshSocialLists();
    }
  }

  async function handleDeclineRequest(userId: string) {
    setFeedback('');
    setConnectingId(userId);
    const result = await declineFriendRequest(userId);
    setFeedback(result.message);
    setConnectingId(null);

    if (result.ok) {
      await refreshSocialLists();
    }
  }

  async function handleShoutout(activityId: string, shoutoutType: ActivityShoutoutType) {
    await addActivityShoutout(activityId, shoutoutType);
    setActivities(await getActivityFeed());
  }

  return (
    <AppScreen scrollable contentContainerStyle={commonStyles.pageStack}>
      <PageHeader
        eyebrow="Friends"
        title="Discover your circle"
        subtitle="Find people by name or handle, connect quickly, and turn solo habits into visible accountability."
      />

      <SectionHeader title="Social feed" />
      <ActivityFeed
        activities={activities}
        currentUserId={profile.uid}
        emptyMessage="Connect with people or join a league to see check-ins, rank moves, and shoutouts here."
        emptyTitle="Your feed is warming up"
        onShoutout={handleShoutout}
      />

      <SectionHeader title="Friend requests" />
      <View style={commonStyles.compactSection}>
        {incomingRequests.length ? (
          incomingRequests.map((person) => (
            <RequestCard
              key={person.uid}
              person={person}
              busy={busy || connectingId === person.uid}
              onAccept={() => handleAcceptRequest(person.uid)}
              onDecline={() => handleDeclineRequest(person.uid)}
            />
          ))
        ) : (
          <SurfaceCard>
            <Text style={commonStyles.cardTitle}>No pending requests</Text>
            <Text style={commonStyles.cardCopy}>When someone adds you, their request will show up here first.</Text>
          </SurfaceCard>
        )}
      </View>

      <SurfaceCard style={commonStyles.sectionCard}>
        <SectionHeader title="Search people" />
        <TextField
          label="Name or username"
          value={query}
          onChangeText={setQuery}
          autoCapitalize="none"
          placeholder="Search Jamie or @avery-runs"
        />
        <Text style={commonStyles.smallMuted}>
          {query.trim() ? 'Showing matching people.' : 'Suggested people appear here so the app never feels empty.'}
        </Text>
        {feedback ? <Text style={commonStyles.inlineLink}>{feedback}</Text> : null}
      </SurfaceCard>

      <SectionHeader title={query.trim() ? 'Search results' : 'Suggested people'} />
      <View style={commonStyles.compactSection}>
        {discoveryResults.length ? (
          discoveryResults.map((person) => (
            <PersonCard
              key={person.uid}
              person={person}
              actionLabel={getPersonActionLabel(person, connectingId === person.uid)}
              actionDisabled={busy || connectingId === person.uid || person.friendState === 'requested' || person.friendState === 'friends'}
              onAction={() => (person.friendState === 'incoming' ? handleAcceptRequest(person.uid) : handleSendRequest(person.uid))}
            />
          ))
        ) : (
          <SurfaceCard>
            <Text style={commonStyles.cardTitle}>{query.trim() ? 'No people found' : 'No suggestions yet'}</Text>
            <Text style={commonStyles.cardCopy}>
              {query.trim()
                ? 'Try searching by display name or username.'
                : 'Join a public league or invite people to make discovery more useful.'}
            </Text>
          </SurfaceCard>
        )}
      </View>

      <SectionHeader title="Your connections" />
      <View style={commonStyles.compactSection}>
        {connectedPeople.length ? (
          connectedPeople.map((person) => (
            <PersonCard key={person.uid} person={person} actionLabel="Connected" actionDisabled onAction={() => undefined} />
          ))
        ) : (
          <SurfaceCard>
            <Text style={commonStyles.cardTitle}>No connections yet</Text>
            <Text style={commonStyles.cardCopy}>Add people from discovery to start building a social graph for future invites and shoutouts.</Text>
          </SurfaceCard>
        )}
      </View>

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
    </AppScreen>
  );
}

function getPersonActionLabel(person: UserSearchResult, isBusy: boolean) {
  if (isBusy) {
    return 'Working...';
  }
  if (person.friendState === 'friends') {
    return 'Friends';
  }
  if (person.friendState === 'requested') {
    return 'Requested';
  }
  if (person.friendState === 'incoming') {
    return 'Accept';
  }

  return 'Add friend';
}

function RequestCard({
  busy,
  onAccept,
  onDecline,
  person,
}: {
  busy: boolean;
  onAccept: () => void;
  onDecline: () => void;
  person: FriendRequestProfile;
}) {
  const { theme } = useThemePreferences();
  const commonStyles = createCommonStyles(theme.colors);

  return (
    <SurfaceCard style={commonStyles.listCard}>
      <View style={commonStyles.listRow}>
        <View style={commonStyles.listRowMeta}>
          <Text style={commonStyles.listRowTitle}>{person.name}</Text>
          <Text style={commonStyles.usernameText}>@{person.username}</Text>
          {person.bio ? <Text style={commonStyles.listRowSubtitle}>{person.bio}</Text> : null}
        </View>
      </View>
      <View style={commonStyles.actionRowTight}>
        <PrimaryButton label={busy ? 'Accepting...' : 'Accept'} onPress={onAccept} disabled={busy} />
        <PrimaryButton label="Decline" onPress={onDecline} disabled={busy} variant="secondary" />
      </View>
    </SurfaceCard>
  );
}

function PersonCard({
  actionDisabled,
  actionLabel,
  onAction,
  person,
}: {
  actionDisabled?: boolean;
  actionLabel: string;
  onAction: () => void;
  person: UserSearchResult;
}) {
  const { theme } = useThemePreferences();
  const commonStyles = createCommonStyles(theme.colors);
  const sharedLabel = person.sharedGroupNames.length ? person.sharedGroupNames.join(', ') : 'No shared league yet';

  return (
    <SurfaceCard style={commonStyles.listCard}>
      <View style={commonStyles.listRow}>
        <View style={commonStyles.listRowMeta}>
          <Text style={commonStyles.listRowTitle}>{person.name}</Text>
          <Text style={commonStyles.usernameText}>@{person.username}</Text>
          {person.bio ? <Text style={commonStyles.listRowSubtitle}>{person.bio}</Text> : null}
          <Text style={commonStyles.smallMuted}>{sharedLabel}</Text>
        </View>
        <PrimaryButton label={actionLabel} onPress={onAction} disabled={actionDisabled} variant={actionDisabled ? 'secondary' : 'primary'} />
      </View>
    </SurfaceCard>
  );
}
