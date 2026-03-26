import { Link, Redirect } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';

import { AppScreen } from '@/components/AppScreen';
import { PrimaryButton } from '@/components/PrimaryButton';
import { SurfaceCard } from '@/components/SurfaceCard';
import { TextField } from '@/components/TextField';
import { useApp } from '@/context/AppProvider';
import { authStyles } from '@/styles/authStyles';

export default function SignInScreen() {
  const { authReady, busy, session, signIn, usingFirebase } = useApp();
  const [email, setEmail] = useState('demo@habitleague.app');
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
        <Text style={authStyles.kicker}>Social habits that stick</Text>
        <Text style={authStyles.title}>HabitLeague</Text>
        <Text style={authStyles.subtitle}>
          Check in daily, keep your group motivated, and watch the leaderboard move every week.
        </Text>
      </View>

      <SurfaceCard>
        <Text style={authStyles.cardTitle}>Welcome back</Text>
        <Text style={authStyles.cardCopy}>
          {usingFirebase
            ? 'Sign in with your Firebase account.'
            : 'Firebase keys are missing, so the app is running in local demo mode.'}
        </Text>

        <TextField label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
        <TextField label="Password" value={password} onChangeText={setPassword} secureTextEntry />

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
