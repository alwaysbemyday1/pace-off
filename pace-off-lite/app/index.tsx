import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  View,
  Pressable,
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
  return `${km.toFixed(2)} km`;
};

export default function HomeScreen() {
  const router = useRouter();
  const [matches, setMatches] = useState<MatchRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [joiningId, setJoiningId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

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

  const filteredMatches = useMemo(() => {
    if (!searchTerm.trim()) return matches;
    const keyword = searchTerm.trim().toLowerCase();
    return matches.filter((match) => match.id.toLowerCase().includes(keyword));
  }, [matches, searchTerm]);

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

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <FlatList
        data={filteredMatches}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View style={styles.header}>
            <View style={styles.brandBar}>
              <Text style={styles.brandText}>PACE OFF</Text>
              <Pressable
                onPress={() => router.push('/profile')}
                style={styles.avatarButton}
              >
                <Text style={styles.avatarText}>ME</Text>
              </Pressable>
            </View>

            <PrimaryButton
              title="NEW MATCH"
              onPress={() => router.push('/match/setup')}
              style={styles.createButton}
            />

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
                style={styles.secondaryButtonAlt}
                textStyle={styles.secondaryText}
              />
            </View>

            <Card title="My Stats" style={styles.statsCard}>
              <View style={styles.statsRow}>
                <Text style={styles.statsLabel}>LEVEL</Text>
                <Text style={styles.statsValue}>2</Text>
                <View style={styles.statsDivider} />
                <Text style={styles.statsLabel}>TROPHY</Text>
                <Text style={styles.statsValue}>1</Text>
                <View style={styles.statsDivider} />
                <Text style={styles.statsLabel}>WINS</Text>
                <Text style={styles.statsValue}>0</Text>
              </View>
            </Card>

            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>JOIN MATCH</Text>
            </View>

            <View style={styles.searchBar}>
              <TextInput
                placeholder="Search match id"
                placeholderTextColor={COLORS.muted}
                value={searchTerm}
                onChangeText={setSearchTerm}
                style={styles.searchInput}
              />
              <Text style={styles.searchIcon}>?</Text>
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
          <Card title="PACE MATCH" style={styles.card}>
            <View style={styles.matchRow}>
              <View style={styles.matchInfo}>
                <Text style={styles.matchDistance}>
                  {formatDistance(item.target_distance_meters)}
                </Text>
                <Text style={styles.matchMeta}>Host: RUNNER</Text>
              </View>
              <PrimaryButton
                title={joiningId === item.id ? 'JOINING...' : 'JOIN'}
                onPress={() => handleJoin(item.id)}
                disabled={joiningId === item.id}
                style={styles.joinButton}
                textStyle={styles.joinText}
              />
            </View>
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
    backgroundColor: COLORS.background,
  },
  listContent: {
    paddingHorizontal: 18,
    paddingBottom: 32,
  },
  header: {
    paddingTop: 8,
    paddingBottom: 14,
    gap: 12,
  },
  brandBar: {
    backgroundColor: COLORS.panel,
    borderColor: COLORS.border,
    borderWidth: SIZES.borderHeavy,
    borderRadius: SIZES.radiusMedium,
    paddingVertical: 10,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
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
    fontFamily: 'SpaceMono',
  },
  avatarButton: {
    position: 'absolute',
    right: 10,
    top: 8,
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: SIZES.borderLight,
    borderColor: COLORS.border,
    backgroundColor: COLORS.panelDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: COLORS.text,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  createButton: {
    paddingVertical: 18,
  },
  statusRow: {
    flexDirection: 'row',
    gap: 10,
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: COLORS.accentGreen,
  },
  secondaryButtonAlt: {
    flex: 1,
    backgroundColor: COLORS.panelLight,
  },
  secondaryText: {
    color: COLORS.border,
  },
  statsCard: {
    marginTop: 4,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statsLabel: {
    color: COLORS.muted,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  statsValue: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: '900',
  },
  statsDivider: {
    width: 1,
    height: 12,
    backgroundColor: COLORS.border,
  },
  sectionHeader: {
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 1.2,
    color: COLORS.highlight,
    textTransform: 'uppercase',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.input,
    borderColor: COLORS.border,
    borderWidth: SIZES.borderHeavy,
    borderRadius: SIZES.radiusSmall,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  searchInput: {
    flex: 1,
    color: COLORS.text,
    fontSize: 12,
  },
  searchIcon: {
    color: COLORS.muted,
    fontSize: 12,
    fontWeight: '900',
  },
  card: {
    marginBottom: 14,
  },
  matchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  matchInfo: {
    flex: 1,
  },
  matchDistance: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '900',
  },
  matchMeta: {
    marginTop: 4,
    color: COLORS.muted,
    fontSize: 11,
    fontWeight: '700',
  },
  joinButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: COLORS.accent,
  },
  joinText: {
    color: COLORS.border,
  },
  metaText: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 8,
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

