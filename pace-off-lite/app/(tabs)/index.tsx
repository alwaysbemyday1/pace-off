import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';

import { Card } from '@/components/common/Card';
import { PrimaryButton } from '@/components/common/PrimaryButton';
import type { Tables } from '@/types/database.types';
import { supabase } from '@/utils/supabase';

type MatchRow = Tables<'matches'>;

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
      const { data, error: sessionError } =
        await supabase.auth.getSession();

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
      .update({ opponent_id: userId, status: 'in_progress' })
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

  return (
    <SafeAreaView style={styles.safeArea}>
      <FlatList
        data={matches}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.title}>HOME</Text>
            <PrimaryButton
              title="Create Match"
              onPress={() => router.push('/match/setup')}
            />
            <Text style={styles.sectionTitle}>Join Match</Text>
            {loading ? (
              <View style={styles.loadingRow}>
                <ActivityIndicator color="#F59E0B" />
                <Text style={styles.loadingText}>Loading matches...</Text>
              </View>
            ) : null}
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
          </View>
        }
        renderItem={({ item }) => (
          <Card title="Waiting Match" style={styles.card}>
            <Text style={styles.metaText}>
              Target: {item.target_time_minutes} min
            </Text>
            <PrimaryButton
              title={joiningId === item.id ? 'Joining...' : 'Join'}
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
              <Text style={styles.metaText}>Create a new match to start.</Text>
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
    backgroundColor: '#0B1220',
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 32,
  },
  header: {
    paddingTop: 12,
    paddingBottom: 16,
    gap: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: 1,
    color: '#F8FAFC',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.8,
    color: '#F59E0B',
    textTransform: 'uppercase',
  },
  card: {
    marginBottom: 14,
  },
  metaText: {
    color: '#E2E8F0',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
  },
  joinButton: {
    backgroundColor: '#38BDF8',
  },
  joinText: {
    color: '#0B1220',
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
