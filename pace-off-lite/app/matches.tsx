import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { Card } from '@/components/common/Card';
import { PrimaryButton } from '@/components/common/PrimaryButton';
import { COLORS, SIZES } from '@/styles/theme';

export default function MatchesScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>MATCH STATUS</Text>
        </View>

        <View style={styles.tabsRow}>
          {['ONGOING', 'UPCOMING', 'COMPLETED'].map((label, index) => (
            <View
              key={label}
              style={[styles.tab, index === 0 && styles.tabActive]}
            >
              <Text
                style={[styles.tabText, index === 0 && styles.tabTextActive]}
              >
                {label}
              </Text>
            </View>
          ))}
        </View>

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
  tabsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: SIZES.radiusSmall,
    borderColor: COLORS.border,
    borderWidth: SIZES.borderLight,
    backgroundColor: COLORS.panelDark,
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: COLORS.panelLight,
  },
  tabText: {
    color: COLORS.muted,
    fontSize: 11,
    fontWeight: '800',
  },
  tabTextActive: {
    color: COLORS.text,
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
