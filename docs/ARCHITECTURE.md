# Architecture

## Overview

Rivl is a React Native + Expo app using Expo Router for navigation and Firebase for backend services when environment configuration is available. When Firebase is unavailable, the app falls back to a seeded AsyncStorage-backed demo mode.

The codebase stays intentionally beginner-friendly and organized around a few clear layers:

- `app/` for routes and screens
- `src/components/` for shared UI
- `src/context/` for app-wide state and action wiring
- `src/lib/` for data, domain logic, and integrations
- `src/types/` for shared models

## Routing Overview

Main routing areas:

- `app/index.tsx`
  - entry point that redirects based on auth and onboarding state
- `app/(auth)/`
  - sign-in and sign-up flow
- `app/(app)/(tabs)/`
  - main areas such as Dashboard, Groups, Courses, Friends, and Profile
- `app/(app)/groups/[groupId]/`
  - golf-group detail, edit, chat, and related flows
- `app/(app)/courses/`
  - course search, saved course detail, and leaderboard flows
- `app/(app)/rounds/new.tsx`
  - round logging flow

## Main Providers

### `AppProvider`

Located in `src/context/AppProvider.tsx`.

Responsibilities:

- restore auth session
- hydrate profile, golf groups, saved courses, rounds, and compatibility data
- expose actions for:
  - sign in / sign up / sign out
  - profile save
  - group creation and joining
  - course search and course save
  - round logging
  - group chat
  - activity feed access
  - friend request actions

### Theme and purchase providers

Other providers manage app-wide theme and purchase scaffolding without coupling those concerns into route files.

## Firebase and Data Layer

The main data layer lives in `src/lib/data.ts`.

It handles:

- Firebase Auth integration
- Firestore reads and writes
- demo mode read/write fallbacks
- normalization helpers for legacy-safe loading
- course provider access through a provider abstraction
- course save and round logging
- social actions and feed updates

The app uses a normalize-first approach so older or partially missing data can still load safely while the product pivots from challenge tracking to golf scoring.

## Golf Models

### `Course`

`Course` is the saved golf course record attached to a group.

It stores:

- provider/source metadata
- location and geo fields
- total holes and total par
- tee boxes
- hole-by-hole pars and yardages

### `Round`

`Round` is the main scoring record.

It stores:

- `groupId`
- `courseId`
- `courseSourceId`
- `userId`
- `gameMode`
- `teeBoxId`
- `holesPlayed`
- `totalScore`
- `scoreToPar`
- optional `holeScores`
- optional scramble team metadata
- visibility for group/friends vs public boards

### Compatibility models

The older `LeagueChallenge` and `Habit` models still exist for compatibility, demo continuity, and retained systems such as streak restore. They are no longer the main product driver.

## Leaderboards

Course leaderboards are built from `Round` records.

Current leaderboard helpers support:

- group/friends scope
- public scope foundation
- stroke mode
- scramble mode
- lowest-score ranking with score-to-par when available

## Activity Feed

The activity system is lightweight and now supports golf-first events such as:

- round logged
- personal best
- leaderboard movement / course leader callouts
- group joins and social connections

## Shop and Purchase Foundation

The codebase still contains a purchase foundation intended for development builds and future monetization work.

Current design:

- inventory lives on the profile
- older streak/restore foundations remain intact but de-emphasized
- RevenueCat-ready foundations exist for future native billing validation

## Safe Extension Points

The safest places to add future features are:

- `src/lib/data.ts`
  - backend actions, golf provider wiring, and data helpers
- `src/types/models.ts`
  - model evolution
- `src/context/AppProvider.tsx`
  - shared action exposure to screens
- `src/components/`
  - reusable UI patterns
- route screens under `app/(app)/`
  - feature-specific UI surfaces

When adding future product work, prefer:

- extending shared models carefully
- preserving demo mode compatibility
- keeping Firebase and demo code paths in sync
- avoiding screen-level data duplication when a shared helper can own the logic
