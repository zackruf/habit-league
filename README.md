# HabitLeague

HabitLeague is a small Expo + Firebase social habit tracker MVP with:

- Sign up and sign in
- Onboarding and profile editing
- Home dashboard
- Shop / Boosts section
- Create habit
- Daily check-in
- Streak tracking with restore flow
- Create group
- Join group
- Group page
- Weekly leaderboard

## Tech stack

- Expo SDK 55
- TypeScript
- Expo Router
- Firebase modular SDK
- AsyncStorage for auth persistence and demo-mode storage
- RevenueCat-ready mobile purchase foundation with a mock preview path

## Setup

1. Open PowerShell in `C:\dev\HabitLeague`.
2. Copy `.env.example` to `.env`.
3. Add your Firebase web app values to the `EXPO_PUBLIC_FIREBASE_*` variables.
4. Optionally add your RevenueCat public SDK keys to:
   - `EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY`
   - `EXPO_PUBLIC_REVENUECAT_IOS_API_KEY`
4. Install dependencies if needed:

```powershell
npm.cmd install
```

5. Start the Android app:

```powershell
npm.cmd run android
```

6. For real in-app purchase testing, create a development build instead of relying on Expo Go:

```powershell
npx.cmd eas build --profile development --platform android
```

## Firebase notes

- The app uses the Firebase modular SDK from `src/lib/firebase.ts`.
- If the Firebase environment variables are missing, the app falls back to a local demo mode backed by AsyncStorage.
- Demo mode seeds a sample account:

```text
Email: demo@habitleague.app
Password: password123
```

## Shop and purchases

- The Shop lives in the bottom-tab `Shop` screen.
- Products are defined in `src/lib/shop.ts`.
- The current purchase architecture uses:
  - `react-native-purchases` for RevenueCat-ready native billing support
  - `expo-dev-client` so purchase flows can be tested in a development build
  - a safe mock purchase path when RevenueCat keys or store products are not ready
- Expo Go can render the UI, but it cannot fully verify real Google Play Billing or Apple In-App Purchase behavior.

### Current product IDs

Use these exact product IDs when creating store products and RevenueCat products:

- `boost_restore_streak`
- `boost_streak_freeze`
- `premium_placeholder_unlock`

Recommended RevenueCat entitlement for the premium placeholder:

- `premium_placeholder_access`

### Android manual steps

1. Create or open the app in Google Play Console.
2. Set up the app package and internal testing track.
3. Create in-app products matching:
   - `boost_restore_streak`
   - `boost_streak_freeze`
   - `premium_placeholder_unlock`
4. Activate the products in Play Console.
5. Add license testers for your Google account.
6. Create a RevenueCat project and app for Android.
7. Connect Google Play to RevenueCat.
8. Add the same product IDs in RevenueCat.
9. Create the `premium_placeholder_access` entitlement in RevenueCat and attach `premium_placeholder_unlock`.
10. Copy the Android public SDK key from RevenueCat into `EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY`.
11. Build a development client with EAS:

```powershell
npx.cmd eas build --profile development --platform android
```

12. Install the development build on your device or emulator.
13. Test purchases with the Play internal track or license-tester account.

### iOS manual steps for later

1. Create the app in App Store Connect.
2. Add in-app purchases using the same product IDs:
   - `boost_restore_streak`
   - `boost_streak_freeze`
   - `premium_placeholder_unlock`
3. Complete banking, tax, and paid-app agreements in App Store Connect if needed.
4. Create the iOS app in RevenueCat and connect App Store Connect.
5. Add the same products in RevenueCat.
6. Attach `premium_placeholder_unlock` to the `premium_placeholder_access` entitlement.
7. Copy the iOS public SDK key into `EXPO_PUBLIC_REVENUECAT_IOS_API_KEY`.
8. Build an iOS development client with EAS when you are ready.
9. Test with Sandbox users in App Store Connect.

### RevenueCat dashboard steps

1. Create a new RevenueCat project.
2. Add an Android app now, and an iOS app later.
3. Add the three product IDs above.
4. Create the `premium_placeholder_access` entitlement.
5. Attach `premium_placeholder_unlock` to that entitlement.
6. Copy the platform public SDK keys into your Expo env vars.

### What works in Expo Go vs development builds

- Expo Go:
  - Shop UI renders
  - Mock purchase flow works
  - Cooldown and inventory states can be previewed
  - Real store billing should not be treated as production-ready
- Development build:
  - RevenueCat native SDK is included
  - Real Google Play Billing can be tested after store-side setup
  - Real Apple IAP can be added later with the same architecture

## Folder structure

```text
app/
  _layout.tsx
  index.tsx
  (auth)/
  (app)/
src/
  components/
  constants/
  context/
  lib/
  styles/
  types/
```

## File guide

- `app/_layout.tsx`: wraps the app in providers and defines the root stack.
- `app/index.tsx`: chooses the initial route depending on auth and onboarding status.
- `app/(auth)/_layout.tsx`: stack container for auth screens.
- `app/(auth)/sign-in.tsx`: sign-in screen and demo-mode guidance.
- `app/(auth)/sign-up.tsx`: account creation screen.
- `app/(app)/_layout.tsx`: stack container for the signed-in area.
- `app/(app)/home.tsx`: dashboard, quick actions, habits, and joined groups.
- `app/(app)/onboarding.tsx`: first-run profile setup.
- `app/(app)/profile.tsx`: profile editing and sign-out screen.
- `app/(app)/habits/new.tsx`: create-habit form.
- `app/(app)/groups/new.tsx`: create-group form.
- `app/(app)/groups/join.tsx`: join-group form using a code.
- `app/(app)/groups/[groupId]/index.tsx`: group details with a leaderboard preview and member list.
- `app/(app)/groups/[groupId]/leaderboard.tsx`: full weekly leaderboard view.
- `app/(app)/(tabs)/shop.tsx`: Shop / Boosts screen for restore, freeze, and premium placeholder items.
- `src/components/AppScreen.tsx`: shared safe-area screen wrapper.
- `src/components/HabitCard.tsx`: habit card with daily check-in action.
- `src/components/LoadingScreen.tsx`: loading state UI.
- `src/components/PrimaryButton.tsx`: shared button component.
- `src/components/StreakRestoreCard.tsx`: dashboard restore card for broken streak recovery.
- `src/components/SectionHeader.tsx`: section title row with optional action.
- `src/components/SurfaceCard.tsx`: shared card container.
- `src/components/TextField.tsx`: shared text input field.
- `src/constants/theme.ts`: color, spacing, and radius tokens.
- `src/context/AppProvider.tsx`: auth lifecycle, dashboard state, and screen actions.
- `src/context/PurchaseProvider.tsx`: RevenueCat or mock purchase mode for the Shop screen.
- `src/lib/date.ts`: date formatting and current-week helpers.
- `src/lib/firebase.ts`: Firebase app, auth, and Firestore initialization.
- `src/lib/data.ts`: Firebase and demo-mode data operations.
- `src/lib/shop.ts`: shop catalog, cooldown rules, and inventory helpers.
- `src/lib/streaks.ts`: streak calculation and restore eligibility helpers.
- `src/styles/authStyles.ts`: auth screen styles.
- `src/styles/commonStyles.ts`: shared layout and card styles.
- `src/types/models.ts`: TypeScript models used across the app.
- `.env.example`: environment variable template for Firebase configuration.
- `eas.json`: EAS build profiles including a development client profile for purchase testing.

## Run checklist

- Android emulator running
- `adb` available
- Firebase config added if you want live backend data
- RevenueCat keys added if you want native store products to load
- Use a development build for real purchase testing
- Use `npm.cmd` in PowerShell instead of `npm`
