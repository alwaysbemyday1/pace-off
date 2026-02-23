import { SafeAreaView, StyleSheet, Text, View } from 'react-native';

import { Card } from '@/components/common/Card';
import { PrimaryButton } from '@/components/common/PrimaryButton';
import { supabase } from '@/utils/supabase';

export default function ProfileScreen() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.title}>PROFILE</Text>
        <Card title="Account" style={styles.card}>
          <Text style={styles.bodyText}>Manage your profile and settings.</Text>
        </Card>
        <PrimaryButton title="Sign Out" onPress={() => supabase.auth.signOut()} />
      </View>
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
    paddingTop: 16,
    gap: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: 1,
    color: '#F8FAFC',
  },
  card: {
    marginBottom: 4,
  },
  bodyText: {
    color: '#E2E8F0',
    fontSize: 13,
    fontWeight: '600',
  },
});
