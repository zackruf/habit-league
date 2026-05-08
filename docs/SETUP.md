# Setup Guide

## Required Software

Recommended local setup:

- Windows with PowerShell
- Node.js
- npm
- Git
- Java JDK 17
- Android Studio with Android SDK and emulator
- Expo CLI via project-local `npx`

## Project Location

Recommended local path:

`C:\dev\HabitLeague`

## Install Dependencies

Use PowerShell and prefer `npm.cmd` on Windows:

```powershell
npm.cmd install
```

## Environment Setup

1. Copy `.env.example` to `.env`
2. Fill in the `EXPO_PUBLIC_*` values
3. Keep `.env.example` committed
4. Never commit `.env`

Typical values include:

- Firebase app configuration
- optional RevenueCat public SDK keys

## Firebase Setup

The app expects Firebase web app configuration values in `.env`.

Minimum Firebase setup:

1. Create a Firebase project
2. Add a web app
3. Enable Authentication
4. Enable Firestore
5. Copy the public config values into `.env`

If Firebase values are missing, the app falls back to demo mode.

## Run Locally

Start Android:

```powershell
npm.cmd run android
```

Other useful commands:

```powershell
npm.cmd run start
npm.cmd run web
npx.cmd expo install --check
npx.cmd tsc --noEmit
npx.cmd expo export --platform android --clear
```

## Android Emulator Notes

Before launching:

- start the Android emulator
- confirm `adb` can see the device
- use the app’s configured Android package name: `com.zackruf.habitleague`

## Development Build Notes

Some native capabilities, especially purchase-related flows, may require a development build instead of Expo Go.

Why this matters:

- Expo Go is fine for UI development and most product iteration
- Expo Go is not sufficient for fully validating native billing flows
- development builds are needed for native purchase SDK behavior

## RevenueCat Notes

The purchase foundation is present, but live purchase validation requires:

- configured platform SDK keys
- store products
- development builds
- tester accounts

This repository is already structured to support that work later without forcing it into everyday feature development.

## Common Troubleshooting

### Expo Go vs development build

- Use Expo Go for routine UI/product iteration
- Use a development build for native purchase testing

### Firebase config missing

- If `.env` is incomplete, the app may fall back to demo mode
- confirm the `EXPO_PUBLIC_FIREBASE_*` variables are present

### Android package name

- ensure `app.json` contains `android.package: com.zackruf.habitleague`

### Windows PowerShell and npm

- use `npm.cmd` instead of `npm` in PowerShell when necessary

### Type/build verification

Run:

```powershell
npx.cmd tsc --noEmit
npx.cmd expo export --platform android --clear
```
