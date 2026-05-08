import { Link, Redirect } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';

import { AppScreen } from '@/components/AppScreen';
import { PrimaryButton } from '@/components/PrimaryButton';
import { SurfaceCard } from '@/components/SurfaceCard';
import { TextField } from '@/components/TextField';
import { useApp } from '@/context/AppProvider';
import { useThemePreferences } from '@/context/ThemeProvider';
import { createAuthStyles } from '@/styles/authStyles';

export default function SignInScreen() {
  const { authReady, busy, session, signIn, usingFirebase } = useApp();
  const { theme } = useThemePreferences();
  const authStyles = createAuthStyles(theme.colors);
  const [email, setEmail] = useState('demo@rivl.app');
  const [password, setPassword] = useState('password123');
  const [error, setError] = useState('');

  if (authReady && session) {
    return <Redirect href="/(app)/(tabs)/dashboard" />;
  }

  async function handleSignIn() {
    setError('');
    const result = await signIn(email, password);
    if (!result.ok) {
      setError(result.message);
    }
  }

  return (
    <AppScreen scrollable contentContainerStyle={authStyles.screenContent}>
      <View style={authStyles.hero}>
        <View style={authStyles.heroGlow} />
        <View style={authStyles.heroOrb} />

        <View style={authStyles.brandRow}>
          <View style={authStyles.logoMark}>
            <Text style={authStyles.logoText}>R</Text>
          </View>
          <View style={authStyles.statusPill}>
            <Text style={authStyles.statusText}>Week live</Text>
          </View>
        </View>

        <View style={authStyles.heroTextBlock}>
          <Text style={authStyles.kicker}>Rivl</Text>
          <Text style={authStyles.title}>Show up. Move up.</Text>
          <Text style={authStyles.subtitle}>
            Rivl is where friends compete in shared league challenges, check in daily, and push each other up the rankings.
          </Text>
        </View>

        <View style={authStyles.previewCard}>
          <View style={authStyles.previewHeader}>
            <View>
              <Text style={authStyles.previewTitle}>Starter League</Text>
              <Text style={authStyles.previewMeta}>4 habits checked in today</Text>
            </View>
            <View style={authStyles.rankBadge}>
              <Text style={authStyles.rankText}>#2</Text>
            </View>
          </View>
          <View style={authStyles.progressTrack}>
            <View style={authStyles.progressFill} />
          </View>
          <View style={authStyles.proofRow}>
            <View style={authStyles.proofPill}>
              <Text style={authStyles.proofText}>Streaks</Text>
            </View>
            <View style={authStyles.proofPill}>
              <Text style={authStyles.proofText}>Groups</Text>
            </View>
            <View style={authStyles.proofPill}>
              <Text style={authStyles.proofText}>Boosts</Text>
            </View>
          </View>
        </View>
      </View>

      <SurfaceCard style={authStyles.formCard}>
        <View style={authStyles.formHeader}>
          <Text style={authStyles.cardTitle}>Welcome back</Text>
          <Text style={authStyles.cardCopy}>
            {usingFirebase
              ? 'Sign in to keep your leagues, challenge streaks, and weekly rank moving.'
              : 'Demo mode is on, so you can explore the app instantly.'}
          </Text>
        </View>

        <View style={authStyles.trustRow}>
          <View style={authStyles.trustChip}>
            <Text style={authStyles.trustText}>Private groups</Text>
          </View>
          <View style={authStyles.trustChip}>
            <Text style={authStyles.trustText}>Weekly reset</Text>
          </View>
          <View style={authStyles.trustChip}>
            <Text style={authStyles.trustText}>No spam</Text>
          </View>
        </View>

        <View style={authStyles.dividerRow}>
          <View style={authStyles.divider} />
          <Text style={authStyles.dividerText}>Sign in</Text>
          <View style={authStyles.divider} />
        </View>

        {!usingFirebase ? (
          <View style={authStyles.demoHint}>
            <Text style={authStyles.demoHintTitle}>Demo account ready</Text>
            <Text style={authStyles.demoHintCopy}>Use the prefilled Rivl demo login to explore leagues, rankings, and shared challenges instantly.</Text>
          </View>
        ) : null}

        <TextField
          label="Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          placeholder="you@example.com"
        />
        <TextField label="Password" value={password} onChangeText={setPassword} secureTextEntry placeholder="Your password" />

        {error ? <Text style={authStyles.errorText}>{error}</Text> : null}

        <PrimaryButton label={busy ? 'Signing in...' : 'Sign in'} onPress={handleSignIn} disabled={busy} />

        <Text style={authStyles.inlineNote}>
          New here?{' '}
          <Link href="/(auth)/sign-up" style={authStyles.inlineLink}>
            Create an account
          </Link>
        </Text>
      </SurfaceCard>
    </AppScreen>
  );
}
