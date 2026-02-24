import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { PrimaryButton } from '@/components/common/PrimaryButton';
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
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.container}
      >
        <View style={styles.header}>
          <Text style={styles.title}>PACE-OFF LITE</Text>
          <Text style={styles.subtitle}>Sign in to start your match.</Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            placeholder="you@example.com"
            placeholderTextColor="#94A3B8"
            value={email}
            onChangeText={setEmail}
            style={styles.input}
          />

          <Text style={styles.label}>Password</Text>
          <TextInput
            secureTextEntry
            placeholder="********"
            placeholderTextColor="#94A3B8"
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
    backgroundColor: '#0B1220',
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
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: 1,
    color: '#F8FAFC',
    textTransform: 'uppercase',
  },
  subtitle: {
    marginTop: 8,
    fontSize: 14,
    color: '#94A3B8',
  },
  form: {
    backgroundColor: '#1E293B',
    borderColor: '#0F172A',
    borderWidth: 3,
    borderRadius: 18,
    padding: 18,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 0,
    elevation: 4,
  },
  label: {
    color: '#F8FAFC',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#0B1220',
    borderColor: '#0F172A',
    borderWidth: 2,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#F8FAFC',
    marginBottom: 14,
  },
  status: {
    color: '#FBBF24',
    fontSize: 12,
    marginBottom: 12,
  },
  actions: {
    gap: 12,
  },
  secondaryButton: {
    backgroundColor: '#38BDF8',
  },
  secondaryText: {
    color: '#0B1220',
  },
});
