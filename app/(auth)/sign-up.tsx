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
        <Text style={authStyles.kicker}>Start your first streak</Text>
        <Text style={authStyles.title}>Create your account</Text>
        <Text style={authStyles.subtitle}>
          Keep the setup light, add a habit, and invite your first group in a couple of minutes.
        </Text>
      </View>

      <SurfaceCard>
        <Text style={authStyles.cardTitle}>Join HabitLeague</Text>
        <TextField label="Display name" value={name} onChangeText={setName} />
        <TextField label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
        <TextField label="Password" value={password} onChangeText={setPassword} secureTextEntry />

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
