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

export default function SignUpScreen() {
  const { authReady, busy, session, signUp } = useApp();
  const { theme } = useThemePreferences();
  const authStyles = createAuthStyles(theme.colors);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  if (authReady && session) {
    return <Redirect href="/(app)/onboarding" />;
  }

  async function handleSignUp() {
    setError('');
    const result = await signUp(name, email, password);
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
            <Text style={authStyles.statusText}>New season</Text>
          </View>
        </View>

        <View style={authStyles.heroTextBlock}>
          <Text style={authStyles.kicker}>Rivl</Text>
          <Text style={authStyles.title}>Show up. Move up.</Text>
          <Text style={authStyles.subtitle}>
            Join a league, compete in shared challenges, and let daily check-ins and group pressure keep the momentum real.
          </Text>
        </View>

        <View style={authStyles.previewCard}>
          <View style={authStyles.previewHeader}>
            <View>
              <Text style={authStyles.previewTitle}>Your first league</Text>
              <Text style={authStyles.previewMeta}>Start a league. Check in. Climb.</Text>
            </View>
            <View style={authStyles.rankBadge}>
              <Text style={authStyles.rankText}>7d</Text>
            </View>
          </View>
          <View style={authStyles.progressTrack}>
            <View style={authStyles.progressFill} />
          </View>
          <View style={authStyles.proofRow}>
            <View style={authStyles.proofPill}>
              <Text style={authStyles.proofText}>Easy setup</Text>
            </View>
            <View style={authStyles.proofPill}>
              <Text style={authStyles.proofText}>Accountable</Text>
            </View>
            <View style={authStyles.proofPill}>
              <Text style={authStyles.proofText}>Competitive</Text>
            </View>
          </View>
        </View>
      </View>

      <SurfaceCard style={authStyles.formCard}>
        <View style={authStyles.formHeader}>
          <Text style={authStyles.cardTitle}>Create your account</Text>
          <Text style={authStyles.cardCopy}>Create your Rivl account and bring your consistency into a live group challenge.</Text>
        </View>

        <View style={authStyles.trustRow}>
          <View style={authStyles.trustChip}>
            <Text style={authStyles.trustText}>2 minute setup</Text>
          </View>
          <View style={authStyles.trustChip}>
            <Text style={authStyles.trustText}>Invite friends</Text>
          </View>
          <View style={authStyles.trustChip}>
            <Text style={authStyles.trustText}>Move up</Text>
          </View>
        </View>

        <View style={authStyles.dividerRow}>
          <View style={authStyles.divider} />
          <Text style={authStyles.dividerText}>Join</Text>
          <View style={authStyles.divider} />
        </View>

        <TextField label="Display name" value={name} onChangeText={setName} placeholder="Zack" />
        <TextField
          label="Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          placeholder="you@example.com"
        />
        <TextField label="Password" value={password} onChangeText={setPassword} secureTextEntry placeholder="Create a password" />

        {error ? <Text style={authStyles.errorText}>{error}</Text> : null}

        <PrimaryButton label={busy ? 'Creating account...' : 'Create account'} onPress={handleSignUp} disabled={busy} />

        <Text style={authStyles.inlineNote}>
          Already have an account?{' '}
          <Link href="/(auth)/sign-in" style={authStyles.inlineLink}>
            Sign in
          </Link>
        </Text>
      </SurfaceCard>
    </AppScreen>
  );
}
