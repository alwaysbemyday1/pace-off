import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import type { LocationObject } from 'expo-location';

import { Card } from '@/components/common/Card';
import { PrimaryButton } from '@/components/common/PrimaryButton';
import { ProgressBar } from '@/components/common/ProgressBar';
import { RoutineCalendar } from '@/components/common/RoutineCalendar';
import { StatusBadge } from '@/components/common/StatusBadge';
import { haversineDistanceMeters } from '@/utils/distance';
import { useLocationTracking } from '@/hooks/useLocationTracking';
import type { Tables } from '@/types/database.types';
import { COLORS, SIZES } from '@/styles/theme';
import { supabase } from '@/utils/supabase';

type MatchRow = Tables<'matches'>;
type MatchResultRow = Tables<'match_results'>;
type RoutineLogRow = Tables<'routine_logs'>;

type Params = { id?: string };

const MIN_CHECK_DISTANCE_METERS = 1000;

const dayLabels = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

const getDateKey = (date: Date) => {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const addDays = (date: Date, days: number) => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};

const formatKm = (meters: number) => `${(meters / 1000).toFixed(2)} km`;

export default function RoutineMatchScreen() {
  const { id } = useLocalSearchParams<Params>();
  const router = useRouter();
  const { location, error: locationError, startTracking, stopTracking } =
    useLocationTracking({ autoStart: false });
  const [match, setMatch] = useState<MatchRow | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [myResult, setMyResult] = useState<MatchResultRow | null>(null);
  const [rivalResult, setRivalResult] = useState<MatchResultRow | null>(null);
  const [logs, setLogs] = useState<RoutineLogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [trackingActive, setTrackingActive] = useState(false);
  const [todayDistance, setTodayDistance] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const lastLocationRef = useRef<LocationObject | null>(null);

  const opponentId = useMemo(() => {
    if (!match || !userId) return null;
    if (match.creator_id === userId) return match.opponent_id;
    return match.creator_id;
  }, [match, userId]);

  const goalDays = match?.target_value ?? 5;

  const expiresAt = useMemo(() => {
    if (match?.expires_at) return new Date(match.expires_at);
    if (match?.created_at) {
      const created = new Date(match.created_at);
      return addDays(created, 7);
    }
    return null;
  }, [match?.expires_at, match?.created_at]);

  const daysLeft = useMemo(() => {
    if (!expiresAt) return null;
    const diff = expiresAt.getTime() - Date.now();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    return Math.max(0, days);
  }, [expiresAt]);

  const todayKey = useMemo(() => getDateKey(new Date()), []);

  const completedSet = useMemo(() => {
    return new Set(logs.map((log) => log.log_date));
  }, [logs]);

  const hasTodayLog = completedSet.has(todayKey);
  const isCompleted = match?.status === 'completed';

  const calendarDays = useMemo(() => {
    if (!expiresAt) return [];
    const start = addDays(expiresAt, -6);
    return Array.from({ length: 7 }, (_, index) => {
      const date = addDays(start, index);
      const key = getDateKey(date);
      return {
        label: dayLabels[date.getDay()],
        completed: completedSet.has(key),
        isToday: key === todayKey,
      };
    });
  }, [completedSet, expiresAt, todayKey]);

  const myProgress = myResult?.progress_value ?? completedSet.size;
  const rivalProgress = rivalResult?.progress_value ?? 0;

  const statusTone = useMemo(() => {
    if (match?.status === 'completed') return 'success';
    if (daysLeft !== null && daysLeft <= 0) return 'warning';
    if (myProgress >= goalDays) return 'success';
    return 'neutral';
  }, [daysLeft, goalDays, myProgress, match?.status]);

  const badgeLabel = useMemo(() => {
    if (match?.status === 'completed') return 'COMPLETED';
    if (daysLeft !== null) return `D-${daysLeft}`;
    return 'ONGOING';
  }, [daysLeft, match?.status]);

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

      if (currentUserId) {
        const { data: logData } = await supabase
          .from('routine_logs')
          .select('*')
          .eq('match_id', id)
          .eq('user_id', currentUserId);
        setLogs(logData ?? []);

        const { data: myResultData } = await supabase
          .from('match_results')
          .select('*')
          .eq('match_id', id)
          .eq('user_id', currentUserId)
          .maybeSingle();
        if (myResultData) setMyResult(myResultData);
      }

      if (opponentId) {
        const { data: rivalResultData } = await supabase
          .from('match_results')
          .select('*')
          .eq('match_id', id)
          .eq('user_id', opponentId)
          .maybeSingle();
        if (rivalResultData) setRivalResult(rivalResultData);
      }

      setLoading(false);
    };

    load();

    return () => {
      active = false;
    };
  }, [id, opponentId]);

  useEffect(() => {
    if (!id || !match) return;
    if (match.match_type !== 'routine') {
      router.replace(`/match/running/${id}`);
    }
  }, [id, match, router]);

  useEffect(() => {
    if (!id) return;
    if (match?.status !== 'completed') return;
    router.replace(`/match/routine/result/${id}`);
  }, [id, match?.status, router]);

  useEffect(() => {
    return () => {
      stopTracking();
    };
  }, [stopTracking]);

  useEffect(() => {
    if (!id) return;

    const channel = supabase
      .channel(`routine-results-${id}`)
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
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'routine_logs', filter: `match_id=eq.${id}` },
        (payload) => {
          const next = payload.new as RoutineLogRow;
          if (!next || next.user_id !== userId) return;
          setLogs((prev) => {
            if (prev.find((log) => log.log_date === next.log_date)) return prev;
            return [...prev, next];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id, userId]);

  useEffect(() => {
    if (!trackingActive || !location) return;

    if (lastLocationRef.current) {
      const distance = haversineDistanceMeters(
        lastLocationRef.current.coords.latitude,
        lastLocationRef.current.coords.longitude,
        location.coords.latitude,
        location.coords.longitude
      );
      if (distance > 0) {
        setTodayDistance((prev) => prev + distance);
      }
    }

    lastLocationRef.current = location;
  }, [trackingActive, location]);

  const stopSession = useCallback(() => {
    stopTracking();
    setTrackingActive(false);
    lastLocationRef.current = null;
  }, [stopTracking]);

  const submitToday = useCallback(
    async (distanceMeters: number) => {
      if (!id || !userId) return;
      if (submitting) return;

      setSubmitting(true);
      setError(null);

      const { data: logRow, error: logError } = await supabase
        .from('routine_logs')
        .insert({
          match_id: id,
          user_id: userId,
          log_date: todayKey,
          distance_meters: distanceMeters,
        })
        .select()
        .single();

      if (logError) {
        setError(logError.message);
        setSubmitting(false);
        return;
      }

      if (logRow) {
        setLogs((prev) => {
          if (prev.find((log) => log.log_date === logRow.log_date)) return prev;
          return [...prev, logRow];
        });
      }

      const { data: existing } = await supabase
        .from('match_results')
        .select('*')
        .eq('match_id', id)
        .eq('user_id', userId)
        .maybeSingle();

      if (existing) {
        const nextProgress = (existing.progress_value ?? 0) + 1;
        const { data: updated, error: updateError } = await supabase
          .from('match_results')
          .update({
            progress_value: nextProgress,
            total_distance_meters: (existing.total_distance_meters ?? 0) + distanceMeters,
            finished_at: new Date().toISOString(),
          })
          .eq('id', existing.id)
          .select()
          .single();

        if (updateError) {
          setError(updateError.message);
        } else {
          setMyResult(updated ?? existing);
        }
      } else {
        const { data: inserted, error: insertError } = await supabase
          .from('match_results')
          .insert({
            match_id: id,
            user_id: userId,
            progress_value: 1,
            total_distance_meters: distanceMeters,
            finished_at: new Date().toISOString(),
          })
          .select()
          .single();

        if (insertError) {
          setError(insertError.message);
        } else {
          setMyResult(inserted ?? null);
        }
      }

      setSubmitting(false);
    },
    [id, userId, todayKey, submitting]
  );

  useEffect(() => {
    if (!trackingActive) return;
    if (hasTodayLog) return;
    if (submitting) return;
    if (todayDistance < MIN_CHECK_DISTANCE_METERS) return;

    submitToday(todayDistance).then(() => {
      stopSession();
    });
  }, [trackingActive, hasTodayLog, submitting, todayDistance, submitToday, stopSession]);

  useEffect(() => {
    if (!id || !match) return;
    if (match.status === 'completed') return;
    if (daysLeft === null || daysLeft > 0) return;

    supabase
      .from('matches')
      .update({ status: 'completed', completed_at: new Date().toISOString() })
      .eq('id', id)
      .then(() => undefined);
  }, [id, match, daysLeft]);

  useEffect(() => {
    if (!id || !match) return;
    if (match.status === 'completed') return;
    if (myProgress < goalDays) return;
    if (opponentId && rivalProgress < goalDays) return;

    supabase
      .from('matches')
      .update({ status: 'completed', completed_at: new Date().toISOString() })
      .eq('id', id)
      .then(() => undefined);
  }, [id, match, myProgress, rivalProgress, opponentId, goalDays]);

  const handleStart = async () => {
    if (hasTodayLog || trackingActive || isCompleted) return;
    setTodayDistance(0);
    lastLocationRef.current = null;
    setTrackingActive(true);
    await startTracking();
  };

  const handleCancel = () => {
    stopSession();
    setTodayDistance(0);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <View style={styles.container}>
        <View style={styles.hero}>
          <View style={styles.heroTop}>
            <Text style={styles.brandText}>PACE OFF</Text>
            <StatusBadge label={badgeLabel} tone={statusTone} />
          </View>
          <Text style={styles.title}>ROUTINE MATCH</Text>
          <View style={styles.heroStats}>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>GOAL</Text>
              <Text style={styles.statValue}>{goalDays}D</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>YOU</Text>
              <Text style={styles.statValue}>
                {myProgress}/{goalDays}
              </Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>{opponentId ? 'RIVAL' : 'GHOST'}</Text>
              <Text style={styles.statValue}>
                {opponentId ? `${rivalProgress}/${goalDays}` : '--'}
              </Text>
            </View>
          </View>
        </View>

        {loading ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator color={COLORS.accent} />
            <Text style={styles.loadingText}>Loading match...</Text>
          </View>
        ) : null}

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <Card title="Time Left" style={styles.card}>
          <View style={styles.timeRow}>
            <View style={styles.timeBox}>
              <Text style={styles.metaLabel}>ENDS</Text>
              <Text style={styles.metaValue}>
                {expiresAt ? `${expiresAt.getMonth() + 1}/${expiresAt.getDate()}` : '--'}
              </Text>
            </View>
            <View style={styles.timeBox}>
              <Text style={styles.metaLabel}>DAYS LEFT</Text>
              <Text style={styles.metaValue}>
                {daysLeft !== null ? `${daysLeft}` : '--'}
              </Text>
            </View>
          </View>
        </Card>

        <Card title="Weekly Progress" style={styles.card}>
          <ProgressBar
            youValue={myProgress}
            rivalValue={rivalProgress}
            maxValue={goalDays}
            youLabel="YOU"
            rivalLabel="RIVAL"
          />
          <View style={styles.progressRow}>
            <Text style={styles.progressText}>
              YOU {myProgress}/{goalDays}
            </Text>
            <Text style={styles.progressText}>
              RIVAL {rivalProgress}/{goalDays}
            </Text>
          </View>
        </Card>

        <Card title="Weekly Calendar" style={styles.card}>
          <RoutineCalendar days={calendarDays} />
        </Card>

        <Card title="Today's Check" style={styles.card}>
          <View style={styles.timeRow}>
            <View style={styles.timeBox}>
              <Text style={styles.metaLabel}>REQUIRED</Text>
              <Text style={styles.metaValue}>
                {formatKm(MIN_CHECK_DISTANCE_METERS)}
              </Text>
            </View>
            <View style={styles.timeBox}>
              <Text style={styles.metaLabel}>TODAY</Text>
              <Text style={styles.metaValue}>{formatKm(todayDistance)}</Text>
            </View>
          </View>

          {trackingActive ? (
            <View style={styles.actionRow}>
              <PrimaryButton
                title={submitting ? 'Submitting...' : 'Tracking...'}
                disabled
                style={styles.trackingButton}
              />
              <PrimaryButton
                title="Cancel"
                onPress={handleCancel}
                style={styles.cancelButton}
                textStyle={styles.cancelText}
              />
            </View>
          ) : (
            <PrimaryButton
              title={
                isCompleted
                  ? 'Match Completed'
                  : hasTodayLog
                    ? 'Completed Today'
                    : 'Start Today'
              }
              onPress={handleStart}
              disabled={hasTodayLog || isCompleted}
            />
          )}
        </Card>

        {locationError ? <Text style={styles.errorText}>{locationError}</Text> : null}

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
    gap: 14,
  },
  hero: {
    backgroundColor: COLORS.panel,
    borderColor: COLORS.border,
    borderWidth: SIZES.borderHeavy,
    borderRadius: SIZES.radiusMedium,
    paddingVertical: 12,
    paddingHorizontal: 14,
    gap: 8,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 0,
    elevation: 5,
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brandText: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 2,
    textTransform: 'uppercase',
    fontFamily: 'SpaceMono',
  },
  title: {
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 2,
    color: COLORS.highlight,
    textTransform: 'uppercase',
    fontFamily: 'SpaceMono',
    textShadowColor: COLORS.border,
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 0,
  },
  heroStats: {
    flexDirection: 'row',
    gap: 8,
  },
  statBox: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: SIZES.radiusSmall,
    borderColor: COLORS.border,
    borderWidth: SIZES.borderLight,
    backgroundColor: COLORS.panelInner,
    alignItems: 'center',
  },
  statLabel: {
    color: COLORS.muted,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  statValue: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '900',
    marginTop: 2,
  },
  card: {
    marginTop: 2,
  },
  progressText: {
    color: COLORS.muted,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  progressRow: {
    marginTop: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  metaLabel: {
    color: COLORS.muted,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  metaValue: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '900',
    marginTop: 4,
  },
  timeRow: {
    flexDirection: 'row',
    gap: 10,
  },
  timeBox: {
    flex: 1,
    borderRadius: SIZES.radiusSmall,
    borderColor: COLORS.border,
    borderWidth: SIZES.borderLight,
    backgroundColor: COLORS.panelDark,
    paddingVertical: 8,
    alignItems: 'center',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  trackingButton: {
    flex: 1,
    backgroundColor: COLORS.panelLight,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: COLORS.accentOrange,
  },
  cancelText: {
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
  actions: {
    marginTop: 'auto',
    paddingBottom: 20,
  },
});

