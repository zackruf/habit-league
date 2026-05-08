# Habit League

Group-first habit competition built around leagues, shared challenges, and social accountability.

## Repository Status

- Proprietary software
- Private/internal development
- All Rights Reserved

This repository is not open source. Access is limited to invited collaborators and approved business or development partners.

## Product Overview

Habit League is a mobile app designed to make consistency social. Instead of treating habits as isolated solo tasks, the product centers on leagues, shared challenges, weekly leaderboards, chat, lightweight social pressure, and streak-based accountability.

The current product direction is intentionally group-first:

- Join or create a league
- Compete through shared challenges
- Check in for your league
- Track weekly movement on leaderboards
- Use chat, activity, and shoutouts to keep momentum visible

## Current MVP Scope

The current MVP includes:

- Email sign up and sign in
- Firebase Auth with React Native persistence
- Group-first onboarding
- Public and private leagues
- Shared league challenges
- Per-user challenge participation and daily check-ins
- Weekly leaderboards
- Rank movement feedback
- Group chat
- Social activity feed and shoutouts
- Friend discovery and friend requests
- Streak tracking and restore flow foundations
- Shop / boosts foundation with RevenueCat-ready purchase architecture
- Demo mode fallback when Firebase configuration is unavailable

## Tech Stack

- React Native
- Expo
- Expo Router
- TypeScript
- Firebase
- Firestore
- Firebase Auth
- AsyncStorage
- RevenueCat-ready purchase foundation via `react-native-purchases`

## Product Direction

Habit League is no longer positioned as an individual habit tracker with optional social features. The app is being built as a group-first habit competition product centered on:

- Leagues
- Shared challenges
- Weekly standings
- Social accountability
- Momentum and retention loops

Current retained systems include:

- Shared league challenges
- Leaderboards
- Group chat
- Activity feed
- Shoutouts
- Friend requests
- Streak restore and shop foundations

## Project Structure

```text
app/
  (auth)/
  (app)/
  _layout.tsx
  index.tsx
src/
  components/
  constants/
  context/
  lib/
  styles/
  types/
docs/
  ARCHITECTURE.md
  DEVELOPMENT_ROADMAP.md
  FIREBASE_SCHEMA.md
  PRODUCT_OVERVIEW.md
  RELEASE_CHECKLIST.md
  SETUP.md
.github/
  ISSUE_TEMPLATE/
  pull_request_template.md
```

## Documentation Index

- [Product Overview](docs/PRODUCT_OVERVIEW.md)
- [Development Roadmap](docs/DEVELOPMENT_ROADMAP.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Setup Guide](docs/SETUP.md)
- [Firebase Schema](docs/FIREBASE_SCHEMA.md)
- [Release Checklist](docs/RELEASE_CHECKLIST.md)
- [Contributing Guide](CONTRIBUTING.md)
- [Security Policy](SECURITY.md)
- [Changelog](CHANGELOG.md)

## Local Setup

Basic local setup:

1. Clone the repository into `C:\dev\HabitLeague`
2. Copy `.env.example` to `.env`
3. Fill in the required `EXPO_PUBLIC_*` values
4. Install dependencies:

```powershell
npm.cmd install
```

5. Start the app:

```powershell
npm.cmd run android
```

For full setup details, see [docs/SETUP.md](docs/SETUP.md).

## Environment Variables

This project uses `.env` locally and keeps `.env.example` committed as the setup template.

Expected environment values include Firebase web app configuration and optional RevenueCat public SDK keys.

Do not commit `.env` or any secret-bearing environment files.

## Development Commands

```powershell
npm.cmd install
npm.cmd run android
npm.cmd run start
npm.cmd run web
```

## Verification Commands

```powershell
npx.cmd expo install --check
npx.cmd tsc --noEmit
npx.cmd expo export --platform android --clear
```

## Firebase and Demo Mode

- If Firebase configuration is present, the app uses Firebase Auth and Firestore.
- If Firebase configuration is missing, the app falls back to demo mode backed by AsyncStorage.
- Demo mode includes seeded leagues, users, shared challenges, activity, and leaderboard data to keep the product experience usable during local development.

## Purchase Foundation

The repository currently contains a RevenueCat-ready purchase foundation intended for development builds, not a finalized production billing workflow.

Key points:

- Expo Go is not sufficient for full purchase verification
- Development builds are required for native purchase testing
- Android testing should use internal tracks or tester accounts
- iOS support is planned through the same architecture later

See [docs/SETUP.md](docs/SETUP.md) and [docs/RELEASE_CHECKLIST.md](docs/RELEASE_CHECKLIST.md) for operational details.

## Proprietary Notice

This repository contains proprietary source code, documentation, product materials, and branding related to Habit League. Access to the repository does not grant any right to copy, reuse, redistribute, commercialize, sublicense, or publish project materials without prior written permission from the owner.
