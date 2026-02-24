import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import type { Tables } from '@/types/database.types';
import { COLORS } from '@/styles/theme';
import { supabase } from '@/utils/supabase';

type MatchRow = Tables<'matches'>;

type MatchResultRow = Tables<'match_results'>;

type Params = { id?: string };

const formatPace = (distanceMeters: number, totalSeconds: number | null) => {
  if (!Number.isFinite(distanceMeters) || distanceMeters <= 0) {
    return '--:--/km';
  }
  if (!totalSeconds || totalSeconds <= 0) {
    return '--:--/km';
  }
  const secondsPerKm = totalSeconds / (distanceMeters / 1000);
  if (!Number.isFinite(secondsPerKm) || secondsPerKm <= 0) {
    return '--:--/km';
  }
  const minutes = Math.floor(secondsPerKm / 60);
  const seconds = Math.round(secondsPerKm % 60);
  return `${minutes}:${seconds.toString().padStart(2, '0')}/km`;
};

const formatDuration = (seconds: number | null) => {
  if (!seconds || seconds <= 0) return '--:--';
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
};

export default function MatchResultScreen() {
  const { id } = useLocalSearchParams<Params>();
  const router = useRouter();
  const [match, setMatch] = useState<MatchRow | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [myResult, setMyResult] = useState<MatchResultRow | null>(null);
  const [rivalResult, setRivalResult] = useState<MatchResultRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const submittedRef = useRef(false);
  const statusUpdatedRef = useRef(false);

  const opponentId = useMemo(() => {
    if (!match || !userId) return null;
    if (match.creator_id === userId) return match.opponent_id;
    return match.creator_id;
  }, [match, userId]);

  const myResultReady = !!myResult;
  const resultsReady = useMemo(() => {
    if (!myResultReady) return false;
    if (!opponentId) return true;
    return !!rivalResult;
  }, [myResultReady, opponentId, rivalResult]);

  const myDistance = myResult?.total_distance_meters ?? 0;
  const rivalDistance = rivalResult?.total_distance_meters ?? 0;
  const distanceGap = useMemo(() => {
    if (!resultsReady) return null;
    return Math.abs(myDistance - rivalDistance);
  }, [resultsReady, myDistance, rivalDistance]);

  const mySeconds = useMemo(() => {
    if (!match?.started_at || !myResult?.finished_at) return null;
    const start = Date.parse(match.started_at);
    const end = Date.parse(myResult.finished_at);
    if (!Number.isFinite(start) || !Number.isFinite(end)) return null;
    return Math.max(1, Math.round((end - start) / 1000));
  }, [match?.started_at, myResult?.finished_at]);

  const rivalSeconds = useMemo(() => {
    if (!match?.started_at || !rivalResult?.finished_at) return null;
    const start = Date.parse(match.started_at);
    const end = Date.parse(rivalResult.finished_at);
    if (!Number.isFinite(start) || !Number.isFinite(end)) return null;
    return Math.max(1, Math.round((end - start) / 1000));
  }, [match?.started_at, rivalResult?.finished_at]);

  const outcome = useMemo(() => {
    if (!resultsReady) return null;
    if (!opponentId) return 'VICTORY';
    if (mySeconds !== null && rivalSeconds !== null) {
      return mySeconds <= rivalSeconds ? 'VICTORY' : 'DEFEAT';
    }
    return myDistance >= rivalDistance ? 'VICTORY' : 'DEFEAT';
  }, [resultsReady, opponentId, mySeconds, rivalSeconds, myDistance, rivalDistance]);

  const fetchOpponentResult = useCallback(async () => {
    if (!id || !opponentId) return;

    const { data } = await supabase
      .from('match_results')
      .select('*')
      .eq('match_id', id)
      .eq('user_id', opponentId)
      .maybeSingle();

    if (data) {
      setRivalResult(data);
    }
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
    if (!id || !userId || submittedRef.current) return;

    const submitResult = async () => {
      setError(null);

      const { data: progressData } = await supabase
        .from('match_progress')
        .select('distance_meters')
        .eq('match_id', id)
        .eq('user_id', userId)
        .maybeSingle();

      const distanceMeters = progressData?.distance_meters ?? 0;

      const { data: existing } = await supabase
        .from('match_results')
        .select('*')
        .eq('match_id', id)
        .eq('user_id', userId)
        .maybeSingle();

      if (existing) {
        const { data, error: updateError } = await supabase
          .from('match_results')
          .update({
            total_distance_meters: distanceMeters,
            finished_at: new Date().toISOString(),
          })
          .eq('id', existing.id)
          .select()
          .single();

        if (updateError) {
          setError(updateError.message);
        } else {
          setMyResult(data ?? existing);
        }
      } else {
        const { data, error: insertError } = await supabase
          .from('match_results')
          .insert({
            match_id: id,
            user_id: userId,
            total_distance_meters: distanceMeters,
            finished_at: new Date().toISOString(),
          })
          .select()
          .single();

        if (insertError) {
          setError(insertError.message);
        } else {
          setMyResult(data ?? null);
        }
      }

      submittedRef.current = true;
    };

    submitResult();
  }, [id, userId]);

  useEffect(() => {
    fetchOpponentResult();
  }, [fetchOpponentResult]);

  useEffect(() => {
    if (!id) return;

    const channel = supabase
      .channel(`match-results-${id}`)
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
    if (statusUpdatedRef.current) return;

    statusUpdatedRef.current = true;

    supabase
      .from('matches')
      .update({ status: 'completed', completed_at: new Date().toISOString() })
      .eq('id', id)
      .then(() => undefined);
  }, [id, resultsReady]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <View style={styles.container}>
        {loading ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator color={COLORS.accent} />
            <Text style={styles.loadingText}>결과를 불러오는 중...</Text>
          </View>
        ) : null}

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        {outcome ? (
          <Text
            style={[
              styles.outcome,
              outcome === 'VICTORY' ? styles.victory : styles.defeat,
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
              상대방의 최종 기록을 집계 중입니다...
            </Text>
          </View>
        ) : null}

        <Card title="YOU" style={styles.card}>
          <Text style={styles.metaText}>Distance: {myDistance.toFixed(0)} m</Text>
          <Text style={styles.metaText}>
            Time: {formatDuration(mySeconds)}
          </Text>
          <Text style={styles.metaText}>
            Avg Pace: {formatPace(myDistance, mySeconds)}
          </Text>
        </Card>

        {resultsReady && opponentId ? (
          <Card title="RIVAL" style={styles.card}>
            <Text style={styles.metaText}>
              Distance: {rivalDistance.toFixed(0)} m
            </Text>
            <Text style={styles.metaText}>
              Time: {formatDuration(rivalSeconds)}
            </Text>
            <Text style={styles.metaText}>
              Avg Pace: {formatPace(rivalDistance, rivalSeconds)}
            </Text>
            {distanceGap !== null ? (
              <Text style={styles.gapText}>
                Gap: {distanceGap.toFixed(0)} m
              </Text>
            ) : null}
          </Card>
        ) : null}

        <View style={styles.actions}>
          <PrimaryButton title="MAIN MENU" onPress={() => router.replace('/')} />
          <PrimaryButton
            title="REMATCH"
            onPress={() => router.replace('/match/setup')}
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
    paddingHorizontal: 20,
    paddingTop: 20,
    gap: 16,
  },
  outcome: {
    fontSize: 38,
    fontWeight: '900',
    letterSpacing: 2,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  outcomePending: {
    fontSize: 28,
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
    marginTop: 4,
  },
  metaText: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
  },
  gapText: {
    color: COLORS.accentBlue,
    fontSize: 13,
    fontWeight: '700',
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


