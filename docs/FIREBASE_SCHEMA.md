# Firebase Schema

## Overview

Rivl is moving to a golf-first data model built around:

- profiles
- golf groups
- saved courses
- logged rounds
- activity feed
- social connections

The app still keeps older challenge and streak records for compatibility, but those are no longer the main product center of gravity.

## Rules Alignment

The client currently expects Firestore rules to allow authenticated access patterns for:

- profile bootstrap on sign-in
- loading a signed-in user profile and group memberships
- reading discoverable groups
- reading and writing saved courses
- reading and writing rounds by course, visibility, friends, and optional group metadata
- reading group chat messages
- reading and updating activity feed items and shoutouts

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

## Groups

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

## Courses

Collection:

- `courses`

Primary fields:

- `id`
- `groupId`
- `sourceId`
- `sourceProvider`
- `name`
- `location`
- `city`
- `state`
- `country`
- `latitude`
- `longitude`
- `holesCount`
- `par`
- `tees`
- `holes`
- `createdBy`
- `createdAt`

Notes:

- a course is saved into a specific group
- `sourceId` and `sourceProvider` let Rivl connect one saved course back to a provider-backed course record later
- tee and hole data are stored with the saved course so score logging does not depend on a live API call

## Rounds

Collection:

- `rounds`

Primary fields:

- `id`
- `groupId` optional legacy/group-save context
- `courseId`
- `courseSourceId`
- `courseSourceProvider`
- `courseName`
- `createdBy`
- `userId`
- `playerIds`
- `playerNames`
- `playerName`
- `totalScore`
- `scoreToPar`
- `format`
- `gameMode` compatibility alias
- `teeBoxId`
- `teeBoxName`
- `holesPlayed`
- `holeScores`
- `teamName`
- `teamMemberIds`
- `dateKey`
- `playedOn`
- `notes`
- `photoUrls`
- `visibility`
- `relatedGroupIds`
- `locationVerified`
- `distanceFromCourseMeters`
- `createdAt`

Notes:

- `format` supports `individual`, `scramble2`, `scramble3`, and `scramble4`
- `groupId` is not required for new round logging; `relatedGroupIds` controls group-filter visibility
- `visibility` separates public and friends-scoped leaderboards
- public leaderboards can aggregate across saved course records by `courseSourceId`
- `locationVerified` and `distanceFromCourseMeters` are honor-system trust signals, not strict anti-cheat controls

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
- `courseId`
- `courseName`
- `roundId`
- `score`
- `scoreToPar`
- `summary`
- `createdAt`
- `shoutouts`

Current golf-first activity types include:

- round logged
- personal best
- course leader callout
- group join
- social connection

## Friend Requests and Friends

Stored on profile documents:

- `friendIds`
- `incomingFriendRequestIds`
- `outgoingFriendRequestIds`

Current design:

- lightweight request / accept model
- accepted friends appear in `friendIds`

## Legacy Compatibility Notes

Important compatibility decisions:

- `LeagueChallenge` and `Habit` still exist in the codebase
- older challenge and streak systems are preserved for stability
- older records are normalized safely on read where possible
- the golf pivot is intentionally additive first, not a destructive one-shot migration
