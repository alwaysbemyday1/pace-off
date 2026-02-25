import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { Card } from '@/components/common/Card';
import { PrimaryButton } from '@/components/common/PrimaryButton';
import { COLORS, SIZES } from '@/styles/theme';
import { supabase } from '@/utils/supabase';

export default function ProfileScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>PROFILE MENU</Text>
        </View>
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
    paddingHorizontal: 18,
    paddingTop: 16,
    gap: 12,
  },
  header: {
    backgroundColor: COLORS.panel,
    borderColor: COLORS.border,
    borderWidth: SIZES.borderHeavy,
    borderRadius: SIZES.radiusMedium,
    paddingVertical: 10,
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 2,
    color: COLORS.text,
    textTransform: 'uppercase',
    fontFamily: 'SpaceMono',
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
