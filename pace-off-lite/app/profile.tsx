import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { Card } from '@/components/common/Card';
import { PrimaryButton } from '@/components/common/PrimaryButton';
import { COLORS } from '@/styles/theme';
import { supabase } from '@/utils/supabase';

export default function ProfileScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <View style={styles.container}>
        <Text style={styles.title}>PROFILE MENU</Text>
        <Card title="Account" style={styles.card}>
          <Text style={styles.bodyText}>Manage your profile and settings.</Text>
        </Card>
        <PrimaryButton title="Sign Out" onPress={() => supabase.auth.signOut()} />
        <View style={styles.actions}>
          <PrimaryButton title="MAIN MENU" onPress={() => router.replace('/')} />
        </View>
      </View>
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
    paddingTop: 16,
    gap: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: 1,
    color: COLORS.text,
    textTransform: 'uppercase',
  },
  card: {
    marginBottom: 4,
  },
  bodyText: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '600',
  },
  actions: {
    marginTop: 'auto',
    paddingBottom: 20,
  },
});


