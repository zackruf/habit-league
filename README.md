# HabitLeague

HabitLeague is a small Expo + Firebase social habit tracker MVP with:

- Sign up and sign in
- Onboarding and profile editing
- Home dashboard
- Create habit
- Daily check-in
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

## Setup

1. Open PowerShell in `C:\dev\HabitLeague`.
2. Copy `.env.example` to `.env`.
3. Add your Firebase web app values to the `EXPO_PUBLIC_FIREBASE_*` variables.
4. Install dependencies if needed:

```powershell
npm.cmd install
```

5. Start the Android app:

```powershell
npm.cmd run android
```

## Firebase notes

- The app uses the Firebase modular SDK from `src/lib/firebase.ts`.
- If the Firebase environment variables are missing, the app falls back to a local demo mode backed by AsyncStorage.
- Demo mode seeds a sample account:

```text
Email: demo@habitleague.app
Password: password123
```

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
- `src/components/AppScreen.tsx`: shared safe-area screen wrapper.
- `src/components/HabitCard.tsx`: habit card with daily check-in action.
- `src/components/LoadingScreen.tsx`: loading state UI.
- `src/components/PrimaryButton.tsx`: shared button component.
- `src/components/SectionHeader.tsx`: section title row with optional action.
- `src/components/SurfaceCard.tsx`: shared card container.
- `src/components/TextField.tsx`: shared text input field.
- `src/constants/theme.ts`: color, spacing, and radius tokens.
- `src/context/AppProvider.tsx`: auth lifecycle, dashboard state, and screen actions.
- `src/lib/date.ts`: date formatting and current-week helpers.
- `src/lib/firebase.ts`: Firebase app, auth, and Firestore initialization.
- `src/lib/data.ts`: Firebase and demo-mode data operations.
- `src/styles/authStyles.ts`: auth screen styles.
- `src/styles/commonStyles.ts`: shared layout and card styles.
- `src/types/models.ts`: TypeScript models used across the app.
- `.env.example`: environment variable template for Firebase configuration.

## Run checklist

- Android emulator running
- `adb` available
- Firebase config added if you want live backend data
- Use `npm.cmd` in PowerShell instead of `npm`
