import { SafeAreaView, StyleSheet, Text, View } from 'react-native';

import { Card } from '@/components/common/Card';

export default function MatchesScreen() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.title}>MATCHES</Text>
        <Card title="Coming Soon" style={styles.card}>
          <Text style={styles.bodyText}>
            This screen will show match history and results.
          </Text>
        </Card>
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
  },
  title: {
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: 1,
    color: '#F8FAFC',
    marginBottom: 12,
  },
  card: {
    marginBottom: 14,
  },
  bodyText: {
    color: '#E2E8F0',
    fontSize: 13,
    fontWeight: '600',
  },
});
