import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PrimaryButton } from '@/components/common/PrimaryButton';
import { COLORS, SIZES } from '@/styles/theme';
import { supabase } from '@/utils/supabase';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState<'login' | 'signup' | null>(null);

  const handleLogin = async () => {
    if (!email || !password) {
      setStatus('Please enter email and password.');
      return;
    }

    setLoading('login');
    setStatus(null);

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error) {
      setStatus(error.message);
    }

    setLoading(null);
  };

  const handleSignup = async () => {
    if (!email || !password) {
      setStatus('Please enter email and password.');
      return;
    }

    setLoading('signup');
    setStatus(null);

    const { error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
    });

    if (error) {
      setStatus(error.message);
    } else {
      setStatus('Check your email to confirm your account.');
    }

    setLoading(null);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.container}
      >
        <View style={styles.header}>
          <Text style={styles.title}>PACE OFF</Text>
          <Text style={styles.subtitle}>Sign in to start your match.</Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            placeholder="you@example.com"
            placeholderTextColor={COLORS.muted}
            value={email}
            onChangeText={setEmail}
            style={styles.input}
          />

          <Text style={styles.label}>Password</Text>
          <TextInput
            secureTextEntry
            placeholder="********"
            placeholderTextColor={COLORS.muted}
            value={password}
            onChangeText={setPassword}
            style={styles.input}
          />

          {status ? <Text style={styles.status}>{status}</Text> : null}

          <View style={styles.actions}>
            <PrimaryButton
              title={loading === 'login' ? 'Logging In...' : 'Login'}
              onPress={handleLogin}
              disabled={loading !== null}
            />
            <PrimaryButton
              title={loading === 'signup' ? 'Signing Up...' : 'Sign Up'}
              onPress={handleSignup}
              disabled={loading !== null}
              style={styles.secondaryButton}
              textStyle={styles.secondaryText}
            />
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  container: {
    flex: 1,
    paddingHorizontal: 20,
    justifyContent: 'center',
  },
  header: {
    marginBottom: 24,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: 2,
    color: COLORS.text,
    textTransform: 'uppercase',
    textShadowColor: COLORS.border,
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 0,
  },
  subtitle: {
    marginTop: 8,
    fontSize: 14,
    color: COLORS.muted,
  },
  form: {
    backgroundColor: COLORS.panel,
    borderColor: COLORS.border,
    borderWidth: SIZES.borderHeavy,
    borderRadius: SIZES.radiusLarge,
    padding: 18,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 0,
    elevation: 4,
  },
  label: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  input: {
    backgroundColor: COLORS.background,
    borderColor: COLORS.border,
    borderWidth: SIZES.borderLight,
    borderRadius: SIZES.radiusSmall,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: COLORS.text,
    marginBottom: 14,
  },
  status: {
    color: COLORS.accent,
    fontSize: 12,
    marginBottom: 12,
  },
  actions: {
    gap: 12,
  },
  secondaryButton: {
    backgroundColor: COLORS.accentBlue,
  },
  secondaryText: {
    color: COLORS.border,
  },
});


