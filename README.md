# Rivl

Show up. Move up.

Social golf competition app where friends create groups, save real courses, log rounds, and move up course leaderboards together.

## Repository Status

- Proprietary software
- Private/internal development
- All Rights Reserved

This repository is not open source. Access is limited to invited collaborators and approved business or development partners.

## Product Overview

Rivl is a group-first golf competition app built around friend groups, real courses, logged rounds, social accountability, and score-based rankings. Instead of treating progress as a private solo tracker, Rivl turns every posted round into shared competition with visible movement and lightweight pressure.

Core idea:

- users do not track habits alone
- users join golf groups
- groups save shared courses
- logged rounds move members up or down the rankings

## Current MVP Scope

The current MVP includes:

- Email sign up and sign in
- Firebase Auth with React Native persistence
- Group-first onboarding
- Public and private golf groups
- Saved course catalog entries per group
- Individual stroke and scramble round logging
- Course-specific group and public leaderboard foundations
- Personal best tracking surfaces
- Group chat
- Social activity feed and shoutouts
- Friend discovery and friend requests
- Legacy streak / restore and shop foundations kept stable but de-emphasized
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

## Current Product Direction

Rivl is not positioned as an individual habit tracker with optional social features.

Rivl is now focused on:

- golf groups
- course search and saved course records
- logged rounds and scorecards
- group and public course leaderboards
- scramble mode
- group accountability and social momentum

Current retained systems include:

- leaderboards
- group chat
- activity feed
- shoutouts
- friend requests
- shop foundations
- older challenge and streak systems preserved for compatibility

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
- Demo mode includes seeded golf groups, courses, rounds, activity, and leaderboard data to keep the product experience usable during local development.
- If Firebase Auth succeeds but Firestore rules are missing or too strict, sign-in can fail during profile bootstrap with `Missing or insufficient permissions`.

## Purchase Foundation

The repository currently contains a RevenueCat-ready purchase foundation intended for development builds, not a finalized production billing workflow.

Key points:

- Expo Go is not sufficient for full purchase verification
- Development builds are required for native purchase testing
- Android testing should use internal tracks or tester accounts
- iOS support is planned through the same architecture later

See [docs/SETUP.md](docs/SETUP.md) and [docs/RELEASE_CHECKLIST.md](docs/RELEASE_CHECKLIST.md) for operational details.

## Brand Note

The product brand is now `Rivl`.

Final trademark, app store, and public-market availability review for the `Rivl` name should still be completed before launch. This repository should not be treated as proof that brand clearance is finalized.

## Proprietary Notice

This repository contains proprietary source code, documentation, product materials, and branding related to Rivl. Access to the repository does not grant any right to copy, reuse, redistribute, commercialize, sublicense, or publish project materials without prior written permission from the owner.
