import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { Card } from '@/components/common/Card';
import { PrimaryButton } from '@/components/common/PrimaryButton';
import { COLORS } from '@/styles/theme';

export default function MatchesScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <View style={styles.container}>
        <Text style={styles.title}>MATCH STATUS</Text>
        <Card title="Coming Soon" style={styles.card}>
          <Text style={styles.bodyText}>
            This screen will show match history and results.
          </Text>
        </Card>
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
  },
  title: {
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: 1,
    color: COLORS.text,
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  card: {
    marginBottom: 14,
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


