# Release Checklist

## Pre-Release Technical Checks

- Run `npx.cmd expo install --check`
- Run `npx.cmd tsc --noEmit`
- Run `npx.cmd expo export --platform android --clear`
- Verify no `.env` or secret files are staged
- Verify demo mode still works if Firebase config is missing

## Firebase Review

- confirm Firebase project is correct
- review Firestore security rules
- confirm Auth configuration is correct
- verify production environment variables

## Environment Variables

- validate `.env` locally
- confirm `.env.example` is up to date
- confirm no secret-bearing files are tracked

## Android Readiness

- verify Android package name
- verify emulator/dev build launch path
- verify build profile configuration
- test internal distribution or development build flow if needed

## iOS Readiness

- confirm iOS bundle identifier
- plan App Store Connect setup
- prepare iOS build validation later

## Privacy / Legal

- privacy policy needed before production release
- terms of service needed before production release
- confirm proprietary licensing posture is reflected in repo and contracts

## Payment / IAP Readiness

- validate RevenueCat configuration
- validate store product identifiers
- test purchase flows in development builds
- confirm restore flow behavior and cooldown logic

## Store Assets

- app icon review
- screenshots
- store description copy
- privacy disclosures

## Security Review

- no secrets in repository
- dependency review
- Firebase rules review
- access review for collaborators

## Analytics / Monitoring

- analytics planning later
- crash/error monitoring planning later
- operational monitoring planning later
