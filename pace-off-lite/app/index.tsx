import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { Card } from '@/components/common/Card';
import { PrimaryButton } from '@/components/common/PrimaryButton';
import type { Tables } from '@/types/database.types';
import { COLORS, SIZES } from '@/styles/theme';
import { supabase } from '@/utils/supabase';

type MatchRow = Tables<'matches'>;

const formatDistance = (meters: number) => {
  if (!Number.isFinite(meters)) return '-- km';
  const km = meters / 1000;
  if (km >= 1) return `${km.toFixed(km % 1 === 0 ? 0 : 1)} km`;
  return `${Math.round(meters)} m`;
};

export default function HomeScreen() {
  const router = useRouter();
  const [matches, setMatches] = useState<MatchRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [joiningId, setJoiningId] = useState<string | null>(null);

  const loadMatches = useCallback(
    async (currentUserId: string | null) => {
      setLoading(true);
      setError(null);

      if (!currentUserId) {
        setMatches([]);
        setLoading(false);
        return;
      }

      const { data, error: fetchError } = await supabase
        .from('matches')
        .select('*')
        .eq('status', 'waiting')
        .is('opponent_id', null)
        .neq('creator_id', currentUserId)
        .order('created_at', { ascending: false });

      if (fetchError) {
        setError(fetchError.message);
        setMatches([]);
      } else {
        setMatches(data ?? []);
      }

      setLoading(false);
    },
    []
  );

  useEffect(() => {
    let active = true;

    const init = async () => {
      const { data, error: sessionError } = await supabase.auth.getSession();

      if (!active) return;

      if (sessionError) {
        setError(sessionError.message);
      }

      const id = data.session?.user.id ?? null;
      setUserId(id);
      await loadMatches(id);
    };

    init();

    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      const id = session?.user.id ?? null;
      setUserId(id);
      loadMatches(id);
    });

    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, [loadMatches]);

  useEffect(() => {
    const channel = supabase
      .channel('matches-waiting-feed')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'matches' },
        () => {
          loadMatches(userId);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadMatches, userId]);

  const handleJoin = async (matchId: string) => {
    if (!userId) {
      setError('Please sign in again.');
      return;
    }

    setJoiningId(matchId);
    setError(null);

    const { data, error: joinError } = await supabase
      .from('matches')
      .update({
        opponent_id: userId,
        status: 'in_progress',
        started_at: new Date().toISOString(),
        completed_at: null,
      })
      .eq('id', matchId)
      .is('opponent_id', null)
      .eq('status', 'waiting')
      .select()
      .single();

    if (joinError || !data) {
      setError(joinError?.message ?? 'Match no longer available.');
      setJoiningId(null);
      return;
    }

    setJoiningId(null);
    router.push(`/match/running/${matchId}`);
  };

  const statusButtons = useMemo(
    () => (
      <View style={styles.statusRow}>
        <PrimaryButton
          title="MATCH STATUS"
          onPress={() => router.push('/matches')}
          style={styles.secondaryButton}
          textStyle={styles.secondaryText}
        />
        <PrimaryButton
          title="PROFILE"
          onPress={() => router.push('/profile')}
          style={styles.secondaryButton}
          textStyle={styles.secondaryText}
        />
      </View>
    ),
    [router]
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <FlatList
        data={matches}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View style={styles.header}>
            <View style={styles.brandBar}>
              <Text style={styles.brandText}>PACE OFF</Text>
            </View>
            <PrimaryButton
              title="CREATE MATCH"
              onPress={() => router.push('/match/setup')}
              style={styles.createButton}
            />
            {statusButtons}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>JOIN MATCH</Text>
            </View>
            {loading ? (
              <View style={styles.loadingRow}>
                <ActivityIndicator color={COLORS.accent} />
                <Text style={styles.loadingText}>Loading matches...</Text>
              </View>
            ) : null}
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
          </View>
        }
        renderItem={({ item }) => (
          <Card title="Waiting Match" style={styles.card}>
            <Text style={styles.metaText}>
              Distance: {formatDistance(item.target_distance_meters)}
            </Text>
            <PrimaryButton
              title={joiningId === item.id ? 'JOINING...' : 'JOIN'}
              onPress={() => handleJoin(item.id)}
              disabled={joiningId === item.id}
              style={styles.joinButton}
              textStyle={styles.joinText}
            />
          </Card>
        )}
        ListEmptyComponent={
          !loading ? (
            <Card title="No Available Matches" style={styles.card}>
              <Text style={styles.metaText}>
                Create a new match to start.
              </Text>
            </Card>
          ) : null
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 32,
  },
  header: {
    paddingTop: 10,
    paddingBottom: 16,
    gap: 12,
  },
  brandBar: {
    backgroundColor: COLORS.panel,
    borderColor: COLORS.border,
    borderWidth: SIZES.borderHeavy,
    borderRadius: SIZES.radiusMedium,
    paddingVertical: 10,
    alignItems: 'center',
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 0,
    elevation: 4,
  },
  brandText: {
    color: COLORS.text,
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 2,
    textTransform: 'uppercase',
    textShadowColor: COLORS.border,
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 0,
  },
  createButton: {
    paddingVertical: 18,
  },
  statusRow: {
    flexDirection: 'row',
    gap: 12,
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: COLORS.accentBlue,
  },
  secondaryText: {
    color: COLORS.border,
  },
  sectionHeader: {
    marginTop: 6,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 1.2,
    color: COLORS.accent,
    textTransform: 'uppercase',
  },
  card: {
    marginBottom: 14,
  },
  metaText: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 8,
  },
  joinButton: {
    backgroundColor: COLORS.accentGreen,
  },
  joinText: {
    color: COLORS.border,
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


