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
- reading and writing saved courses for joined groups
- reading and writing rounds for joined groups
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
- `groupId`
- `courseId`
- `courseSourceId`
- `courseSourceProvider`
- `courseName`
- `userId`
- `playerName`
- `totalScore`
- `scoreToPar`
- `gameMode`
- `teeBoxId`
- `teeBoxName`
- `holesPlayed`
- `holeScores`
- `teamName`
- `teamMemberIds`
- `playedOn`
- `notes`
- `photoUrls`
- `visibility`
- `createdAt`

Notes:

- `gameMode` currently supports `stroke` and `scramble`
- `visibility` is used to separate group/friends leaderboards from public ones
- public leaderboard foundations can aggregate across groups by `courseSourceId`

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
