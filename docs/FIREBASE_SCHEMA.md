# Firebase Schema

## Overview

The current data model is designed around group-first league competition with shared challenges and per-user participation records.

The app also maintains demo-mode compatibility through an AsyncStorage-backed structure that mirrors the same concepts.

## Rules Alignment

The current client expects Firestore rules to allow authenticated access patterns for:

- profile bootstrap on sign-in
- loading a signed-in user profile and league memberships
- reading discoverable leagues
- reading shared league challenges for joined leagues
- reading and updating participation records for the signed-in user
- reading league participation records for leaderboard and league detail views
- loading and writing group chat messages
- loading and updating activity feed items and shoutouts

The repository-level rules source is:

- `firestore.rules`

## Profiles

Collection:

- `profiles`

Primary fields:

- `uid`
- `email`
- `name`
- `username`
- `bio`
- `weeklyGoal`
- `onboardingCompleted`
- `groupIds`
- `friendIds`
- `incomingFriendRequestIds`
- `outgoingFriendRequestIds`
- `shopInventory`

## Users

In Firebase Auth:

- authentication identity is handled by Firebase Auth

In demo mode:

- local credential records exist in the demo store for seeded/demo login

## Groups / Leagues

Collection:

- `groups`

Primary fields:

- `id`
- `name`
- `description`
- `ownerId`
- `memberIds`
- `joinCode`
- `visibility`
- `inviteOnly`
- `discoverable`
- `stakesEnabled`
- `stakesText`
- `memberLimit`
- `createdAt`

## Shared League Challenges

Collection:

- `challenges`

Primary fields:

- `id`
- `groupId`
- `title`
- `emoji`
- `category`
- `description`
- `frequency`
- `createdBy`
- `createdAt`
- `status`
- `startDateKey`
- `endDateKey`
- `archivedAt`
- `archivedBy`
- `completedAt`
- `winnerUserId`
- `winnerDisplayName`
- `active`

Notes:

- `LeagueChallenge` is the shared league-level object
- it defines the challenge once for the whole league
- lifecycle status is stored here

## Challenge Participation Records

Internal model name:

- `Habit`

Collection:

- `habits`

Role:

- per-user participation and check-in record for a shared challenge

Primary fields:

- `id`
- `userId`
- `groupId`
- `challengeId`
- `title`
- `emoji`
- `category`
- `createdAt`
- `checkIns`
- `restoreUsedForDate`
- `restoreUsedAt`

Notes:

- the internal type name is still `Habit` for compatibility
- product-wise, these records represent a user’s participation in a shared league challenge

## Check-Ins

Check-ins are stored as date-key strings on the participation record:

- `checkIns: string[]`

Current pattern:

- each entry is a `YYYY-MM-DD` style key
- streak and restore logic are computed from this history

## Activity Feed

Collection:

- `activities`

Primary fields:

- `id`
- `type`
- `actorId`
- `actorName`
- `groupId`
- `groupName`
- `habitId`
- `habitTitle`
- `targetUserId`
- `targetUserName`
- `summary`
- `createdAt`
- `shoutouts`

Current activity types include:

- check-in
- rank movement
- league join
- social connection
- challenge lifecycle updates

## Friend Requests / Friends

Stored on profile documents:

- `friendIds`
- `incomingFriendRequestIds`
- `outgoingFriendRequestIds`

Current design:

- lightweight request/accept model
- accepted friends appear in `friendIds`

## Shop Inventory

Stored on profile documents:

- `shopInventory`

Current fields:

- `streakRestoreCredits`
- `streakRestoreCooldownUntil`
- `streakFreezeCredits`
- `streakFreezeCooldownUntil`
- `premiumPlaceholderOwned`

## Legacy Compatibility Notes

Important compatibility decisions:

- `Habit` remains the internal participation record type for now
- older shared-challenge-incompatible data is normalized safely on read
- legacy records missing `challengeId` are treated as if `challengeId === habit.id`
- older challenges default to active lifecycle state when lifecycle fields are missing

This keeps the product direction moving forward without forcing a risky one-shot migration.
