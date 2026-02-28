import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { Card } from '@/components/common/Card';
import { PrimaryButton } from '@/components/common/PrimaryButton';
import { StatusBadge } from '@/components/common/StatusBadge';
import type { Tables } from '@/types/database.types';
import { COLORS, SIZES } from '@/styles/theme';
import { supabase } from '@/utils/supabase';

type MatchRow = Tables<'matches'>;
type MatchResultRow = Tables<'match_results'>;

type Params = { id?: string };

const formatKm = (meters: number) => `${(meters / 1000).toFixed(2)} km`;

const formatAvgPerDay = (meters: number, days: number | null) => {
  if (!days || days <= 0) return '-- km/day';
  const km = meters / 1000;
  return `${(km / days).toFixed(2)} km/day`;
};

const formatDate = (dateString?: string | null) => {
  if (!dateString) return '--';
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return '--';
  return `${date.getMonth() + 1}/${date.getDate()}`;
};

export default function RoutineResultScreen() {
  const { id } = useLocalSearchParams<Params>();
  const router = useRouter();
  const [match, setMatch] = useState<MatchRow | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [myResult, setMyResult] = useState<MatchResultRow | null>(null);
  const [rivalResult, setRivalResult] = useState<MatchResultRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const opponentId = useMemo(() => {
    if (!match || !userId) return null;
    if (match.creator_id === userId) return match.opponent_id;
    return match.creator_id;
  }, [match, userId]);

  const goalDays = match?.target_value ?? 5;
  const myDays = myResult?.progress_value ?? 0;
  const rivalDays = rivalResult?.progress_value ?? 0;
  const myDistance = myResult?.total_distance_meters ?? 0;
  const rivalDistance = rivalResult?.total_distance_meters ?? 0;

  const resultsReady = useMemo(() => {
    if (!myResult) return false;
    if (!opponentId) return true;
    return !!rivalResult;
  }, [myResult, opponentId, rivalResult]);

  const outcome = useMemo(() => {
    if (!resultsReady) return null;
    if (!opponentId) return 'COMPLETED';
    if (myDays !== rivalDays) return myDays > rivalDays ? 'VICTORY' : 'DEFEAT';
    if (myDistance !== rivalDistance) {
      return myDistance > rivalDistance ? 'VICTORY' : 'DEFEAT';
    }
    return 'DRAW';
  }, [resultsReady, opponentId, myDays, rivalDays, myDistance, rivalDistance]);

  const fetchOpponentResult = useCallback(async () => {
    if (!id || !opponentId) return;

    const { data } = await supabase
      .from('match_results')
      .select('*')
      .eq('match_id', id)
      .eq('user_id', opponentId)
      .maybeSingle();

    if (data) setRivalResult(data);
  }, [id, opponentId]);

  useEffect(() => {
    if (!id) return;

    let active = true;

    const load = async () => {
      setLoading(true);
      setError(null);

      const { data: sessionData, error: sessionError } =
        await supabase.auth.getSession();

      if (!active) return;

      if (sessionError) {
        setError(sessionError.message);
      }

      const currentUserId = sessionData.session?.user.id ?? null;
      setUserId(currentUserId);

      const { data, error: matchError } = await supabase
        .from('matches')
        .select('*')
        .eq('id', id)
        .single();

      if (!active) return;

      if (matchError) {
        setError(matchError.message);
        setMatch(null);
      } else {
        setMatch(data ?? null);
      }

      setLoading(false);
    };

    load();

    return () => {
      active = false;
    };
  }, [id]);

  useEffect(() => {
    if (!id || !userId) return;

    const loadMyResult = async () => {
      const { data } = await supabase
        .from('match_results')
        .select('*')
        .eq('match_id', id)
        .eq('user_id', userId)
        .maybeSingle();

      if (data) setMyResult(data);
    };

    loadMyResult();
  }, [id, userId]);

  useEffect(() => {
    fetchOpponentResult();
  }, [fetchOpponentResult]);

  useEffect(() => {
    if (!id) return;

    const channel = supabase
      .channel(`routine-result-${id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'match_results', filter: `match_id=eq.${id}` },
        (payload) => {
          const next = payload.new as MatchResultRow;
          if (!next) return;
          if (next.user_id === userId) {
            setMyResult(next);
          } else {
            setRivalResult(next);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id, userId]);

  useEffect(() => {
    if (resultsReady || !opponentId) return;

    const interval = setInterval(() => {
      fetchOpponentResult();
    }, 5000);

    return () => clearInterval(interval);
  }, [resultsReady, opponentId, fetchOpponentResult]);

  useEffect(() => {
    if (!id || !resultsReady) return;

    supabase
      .from('matches')
      .update({ status: 'completed', completed_at: new Date().toISOString() })
      .eq('id', id)
      .then(() => undefined);
  }, [id, resultsReady]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.brandText}>PACE OFF</Text>
          <StatusBadge
            label={match?.status === 'completed' ? 'COMPLETED' : 'RESULT'}
            tone={match?.status === 'completed' ? 'success' : 'neutral'}
          />
        </View>

        {loading ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator color={COLORS.accent} />
            <Text style={styles.loadingText}>Loading result...</Text>
          </View>
        ) : null}

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        {outcome ? (
          <Text
            style={[
              styles.outcome,
              outcome === 'VICTORY' && styles.victory,
              outcome === 'DEFEAT' && styles.defeat,
              outcome === 'DRAW' && styles.draw,
              outcome === 'COMPLETED' && styles.completed,
            ]}
          >
            {outcome}
          </Text>
        ) : (
          <Text style={styles.outcomePending}>RESULT</Text>
        )}

        {!resultsReady ? (
          <View style={styles.waitingBox}>
            <ActivityIndicator color={COLORS.accentBlue} />
            <Text style={styles.waitingText}>
              Waiting for rival result...
            </Text>
          </View>
        ) : null}

        <Card title="WEEKLY SUMMARY" style={styles.card}>
          <View style={styles.summaryRow}>
            <View style={styles.summaryBox}>
              <Text style={styles.summaryLabel}>GOAL</Text>
              <Text style={styles.summaryValue}>{goalDays} DAYS</Text>
            </View>
            <View style={styles.summaryBox}>
              <Text style={styles.summaryLabel}>ENDS</Text>
              <Text style={styles.summaryValue}>
                {formatDate(match?.expires_at)}
              </Text>
            </View>
          </View>
        </Card>

        <Card title="YOU" style={styles.card}>
          <Text style={styles.metaText}>Days: {myDays}</Text>
          <Text style={styles.metaText}>
            Distance: {formatKm(myDistance)}
          </Text>
          <Text style={styles.metaText}>
            Avg/Day: {formatAvgPerDay(myDistance, myDays)}
          </Text>
        </Card>

        {opponentId ? (
          <Card title="RIVAL" style={styles.card}>
            <Text style={styles.metaText}>Days: {rivalDays}</Text>
            <Text style={styles.metaText}>
              Distance: {formatKm(rivalDistance)}
            </Text>
            <Text style={styles.metaText}>
              Avg/Day: {formatAvgPerDay(rivalDistance, rivalDays)}
            </Text>
          </Card>
        ) : null}

        <View style={styles.actions}>
          <PrimaryButton title="MAIN MENU" onPress={() => router.replace('/')} />
          <PrimaryButton
            title="REMATCH"
            onPress={() => router.replace('/match/routine/setup')}
            style={styles.rematchButton}
            textStyle={styles.rematchText}
          />
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
    gap: 14,
  },
  header: {
    backgroundColor: COLORS.panel,
    borderColor: COLORS.border,
    borderWidth: SIZES.borderHeavy,
    borderRadius: SIZES.radiusMedium,
    paddingVertical: 10,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 0,
    elevation: 5,
  },
  brandText: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 2,
    textTransform: 'uppercase',
    fontFamily: 'SpaceMono',
  },
  outcome: {
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: 2,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  outcomePending: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: 1,
    textAlign: 'center',
    color: COLORS.muted,
    textTransform: 'uppercase',
  },
  victory: {
    color: COLORS.accentGreen,
  },
  defeat: {
    color: COLORS.accentOrange,
  },
  draw: {
    color: COLORS.accentBlue,
  },
  completed: {
    color: COLORS.highlight,
  },
  waitingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    justifyContent: 'center',
    paddingVertical: 8,
  },
  waitingText: {
    color: COLORS.muted,
    fontSize: 12,
    fontWeight: '700',
  },
  card: {
    marginTop: 2,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 10,
  },
  summaryBox: {
    flex: 1,
    borderRadius: SIZES.radiusSmall,
    borderColor: COLORS.border,
    borderWidth: SIZES.borderLight,
    backgroundColor: COLORS.panelDark,
    paddingVertical: 10,
    alignItems: 'center',
  },
  summaryLabel: {
    color: COLORS.muted,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  summaryValue: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: '900',
    marginTop: 4,
  },
  metaText: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 6,
  },
  actions: {
    marginTop: 'auto',
    gap: 12,
    paddingBottom: 20,
  },
  rematchButton: {
    backgroundColor: COLORS.accentBlue,
  },
  rematchText: {
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
