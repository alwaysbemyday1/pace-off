import { useEffect, useState } from 'react';
import { ActivityIndicator, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { Card } from '@/components/common/Card';
import type { Tables } from '@/types/database.types';
import { supabase } from '@/utils/supabase';

type MatchRow = Tables<'matches'>;

type Params = { id?: string };

export default function WaitingRoomScreen() {
  const { id } = useLocalSearchParams<Params>();
  const router = useRouter();
  const [match, setMatch] = useState<MatchRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;

    let active = true;

    const fetchMatch = async () => {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('matches')
        .select('*')
        .eq('id', id)
        .single();

      if (!active) return;

      if (fetchError) {
        setError(fetchError.message);
        setMatch(null);
      } else {
        setMatch(data ?? null);
      }

      setLoading(false);
    };

    fetchMatch();

    const channel = supabase
      .channel(`match-waiting-${id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'matches', filter: `id=eq.${id}` },
        (payload) => {
          const next = payload.new as MatchRow;
          setMatch(next);

          if (next.status === 'in_progress' && next.opponent_id) {
            router.replace(`/match/running/${id}`);
          }
        }
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [id, router]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.title}>WAITING ROOM</Text>

        {loading ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator color="#F59E0B" />
            <Text style={styles.loadingText}>Waiting for opponent...</Text>
          </View>
        ) : null}

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        {match ? (
          <Card title="Match Info" style={styles.card}>
            <Text style={styles.metaText}>Match ID: {match.id}</Text>
            <Text style={styles.metaText}>
              Target: {match.target_time_minutes} min
            </Text>
            <Text style={styles.metaText}>Status: {match.status}</Text>
            <Text style={styles.metaText}>
              Opponent: {match.opponent_id ? 'Joined' : 'Waiting'}
            </Text>
          </Card>
        ) : null}
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
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  loadingText: {
    color: '#94A3B8',
    fontSize: 12,
  },
  errorText: {
    color: '#F97316',
    fontSize: 12,
  },
});
