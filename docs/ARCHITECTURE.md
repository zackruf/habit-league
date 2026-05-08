# Architecture

## Overview

Habit League is a React Native + Expo application using Expo Router for navigation and Firebase for backend services when environment configuration is available. When Firebase is unavailable, the app falls back to a seeded AsyncStorage-backed demo mode.

The codebase is intentionally beginner-friendly and organized around a few clear layers:

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
- `app/(app)/`
  - authenticated experience
- `app/(app)/(tabs)/`
  - main tabbed areas such as Dashboard, Groups, Friends, Profile, and Shop where applicable
- `app/(app)/groups/[groupId]/`
  - league-specific detail, edit, and related flows
- `app/(app)/habits/new.tsx`
  - shared challenge creation flow within league context

## Main Providers / Contexts

### `AppProvider`

Located in `src/context/AppProvider.tsx`.

Responsibilities:

- restore auth session
- hydrate profile, league membership, and participation data
- expose actions for:
  - sign in / sign up / sign out
  - profile save
  - league creation/joining
  - shared challenge creation
  - challenge check-ins
  - group chat
  - activity feed access
  - friend request actions
  - lifecycle actions for league challenges

### Purchase / Theme providers

Other providers manage app-wide theme and purchase scaffolding without deeply coupling those concerns into route files.

## Firebase / Data Layer

The main data layer lives in `src/lib/data.ts`.

It handles:

- Firebase Auth integration
- Firestore reads and writes
- demo mode read/write fallbacks
- normalization helpers for legacy-safe loading
- feed, leaderboard, and social actions
- shared challenge creation and lifecycle updates

The app uses a “normalize first” approach so older or partially missing data can be loaded safely without immediately breaking the UI.

## Shared League Challenge Model

Habit League now uses a two-layer challenge structure:

### Shared challenge

`LeagueChallenge` is the league-level object.

It stores:

- challenge identity and league ownership
- shared title/description/category/frequency
- lifecycle metadata such as status, dates, and winner fields

### Participation record

`Habit` remains the per-user participation/check-in record.

It stores:

- `userId`
- `groupId`
- `challengeId`
- title/category/emoji snapshot data
- check-in history
- restore metadata for streak recovery

This keeps the product model group-first while preserving simple per-user streak logic.

## Check-Ins

Check-ins are recorded on the per-user participation record (`Habit`).

Why this is useful:

- streaks stay user-specific
- restore logic stays simple
- leaderboard aggregation can still happen at the league level
- shared challenge membership is represented without duplicating challenge definitions

## Leaderboards

Leaderboards are calculated from challenge participation records inside a league.

Current logic:

- `weeklyCheckIns` counts the current week’s check-ins
- `completedHabits` counts unique `challengeId` values, not raw participation row count

This keeps league ranking compatible with shared challenge behavior.

## Activity Feed

The activity system is intentionally lightweight.

It records:

- check-ins
- rank movement
- league joins
- accepted social connections
- selected challenge lifecycle actions

The feed is designed to feel alive without becoming a heavy social platform.

## Shop / Purchase Foundation

The codebase contains a purchase foundation intended for development builds and future monetization work. It is not the main architecture driver, but it is isolated enough to evolve later.

Current design:

- inventory lives on the profile
- streak restore flows already connect to meaningful retention moments
- RevenueCat-ready foundations exist for future native billing validation

## Safe Extension Points

The safest places to add future features are:

- `src/lib/data.ts`
  - new backend actions and data helpers
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
