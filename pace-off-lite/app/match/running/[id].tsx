import { SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';

import { Card } from '@/components/common/Card';

export default function RunningScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.title}>MATCH RUNNING</Text>
        <Card title="Match" style={styles.card}>
          <Text style={styles.metaText}>Match ID: {id}</Text>
          <Text style={styles.metaText}>Tracking in progress...</Text>
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
    gap: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: 1,
    color: '#F8FAFC',
  },
  card: {
    marginTop: 8,
  },
  metaText: {
    color: '#E2E8F0',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
  },
});
