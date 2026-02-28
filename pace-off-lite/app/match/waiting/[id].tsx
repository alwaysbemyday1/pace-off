import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { Card } from '@/components/common/Card';
import type { Tables } from '@/types/database.types';
import { COLORS, SIZES } from '@/styles/theme';
import { supabase } from '@/utils/supabase';

type MatchRow = Tables<'matches'>;

type Params = { id?: string };

const formatDistance = (meters: number) => {
  if (!Number.isFinite(meters)) return '-- km';
  const km = meters / 1000;
  return `${km.toFixed(2)} km`;
};

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
            if (next.match_type === 'routine') {
              router.replace(`/match/routine/${id}`);
            } else {
              router.replace(`/match/running/${id}`);
            }
          }
        }
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [id, router]);

  const statusLabel = useMemo(() => {
    if (!match) return '';
    return match.opponent_id ? 'Opponent joined' : 'Waiting for opponent';
  }, [match]);

  const typeLabel = match?.match_type === 'routine' ? 'ROUTINE MATCH' : 'PACE MATCH';

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>WAITING ROOM</Text>
          <Text style={styles.subTitle}>{typeLabel}</Text>
        </View>

        {loading ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator color={COLORS.accent} />
            <Text style={styles.loadingText}>Waiting for opponent...</Text>
          </View>
        ) : null}

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        {match ? (
          <Card title="Match Info" style={styles.card}>
            <Text style={styles.metaText}>Match ID: {match.id}</Text>
            {match.match_type === 'routine' ? (
              <Text style={styles.metaText}>Goal: {match.target_value ?? 5} days</Text>
            ) : (
              <Text style={styles.metaText}>
                Distance: {formatDistance(match.target_distance_meters)}
              </Text>
            )}
            <Text style={styles.metaText}>Status: {match.status}</Text>
            <Text style={styles.metaText}>{statusLabel}</Text>
          </Card>
        ) : null}
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
    gap: 16,
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
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 2,
    color: COLORS.text,
    textTransform: 'uppercase',
    fontFamily: 'SpaceMono',
  },
  subTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.highlight,
    marginTop: 2,
    textTransform: 'uppercase',
  },
  card: {
    marginTop: 8,
  },
  metaText: {
    color: COLORS.text,
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
    color: COLORS.muted,
    fontSize: 12,
  },
  errorText: {
    color: COLORS.accentOrange,
    fontSize: 12,
  },
});

