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
import { ProgressBar } from '@/components/common/ProgressBar';
import { haversineDistanceMeters } from '@/utils/distance';
import { useLocationTracking } from '@/hooks/useLocationTracking';
import type { Tables } from '@/types/database.types';
import { COLORS } from '@/styles/theme';
import { supabase } from '@/utils/supabase';

type MatchRow = Tables<'matches'>;

type MatchProgressRow = Tables<'match_progress'>;

type Params = { id?: string };

const THROTTLE_MS = 5000;

const formatTime = (seconds: number) => {
  const clamped = Math.max(0, seconds);
  const minutes = Math.floor(clamped / 60);
  const secs = clamped % 60;
  return `${minutes.toString().padStart(2, '0')}:${secs
    .toString()
    .padStart(2, '0')}`;
};

export default function RunningScreen() {
  const { id } = useLocalSearchParams<Params>();
  const router = useRouter();
  const { location, error: locationError, stopTracking } = useLocationTracking();
  const [match, setMatch] = useState<MatchRow | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [myDistance, setMyDistance] = useState(0);
  const [rivalDistance, setRivalDistance] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const lastLocationRef = useRef<LocationObject | null>(null);
  const lastSentAtRef = useRef(0);
  const lastSentDistanceRef = useRef(0);
  const startTimeRef = useRef<number | null>(null);
  const startedAtRef = useRef<string | null>(null);
  const hasNavigatedRef = useRef(false);
  const ensuredStartRef = useRef(false);

  const opponentId = useMemo(() => {
    if (!match || !userId) return null;
    if (match.creator_id === userId) return match.opponent_id;
    return match.creator_id;
  }, [match, userId]);

  const targetDistance = match?.target_distance_meters ?? 3000;

  const distanceLeft = useMemo(() => {
    return Math.max(0, targetDistance - myDistance);
  }, [targetDistance, myDistance]);

  const leadText = useMemo(() => {
    if (myDistance === 0 && rivalDistance === 0) {
      return '대결을 시작하세요!';
    }
    if (myDistance >= rivalDistance) {
      return '내가 선두입니다!';
    }
    return '상대가 앞서고 있습니다!';
  }, [myDistance, rivalDistance]);

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

    const channel = supabase
      .channel(`match-running-${id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'matches', filter: `id=eq.${id}` },
        (payload) => {
          setMatch(payload.new as MatchRow);
        }
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [id]);

  useEffect(() => {
    if (!id || !match || match.started_at || !userId) return;
    if (ensuredStartRef.current) return;

    const startedAt = new Date().toISOString();
    ensuredStartRef.current = true;
    startedAtRef.current = startedAt;
    startTimeRef.current = Date.parse(startedAt);

    supabase
      .from('matches')
      .update({ started_at: startedAt, status: 'in_progress', completed_at: null })
      .eq('id', id)
      .then(() => undefined);
  }, [id, match, userId]);

  useEffect(() => {
    if (!match) return;

    const nextStartedAt = match.started_at ?? startedAtRef.current;
    if (nextStartedAt && startedAtRef.current !== nextStartedAt) {
      startedAtRef.current = nextStartedAt;
      startTimeRef.current = Date.parse(nextStartedAt);
    }

    if (!startTimeRef.current) {
      startTimeRef.current = Date.now();
    }

    const updateElapsed = () => {
      const elapsed = Math.floor(
        (Date.now() - (startTimeRef.current ?? Date.now())) / 1000
      );
      setElapsedSeconds(elapsed);
    };

    updateElapsed();

    const interval = setInterval(updateElapsed, 1000);
    return () => clearInterval(interval);
  }, [match?.id, match?.started_at]);

  useEffect(() => {
    if (!location) return;

    if (lastLocationRef.current) {
      const distance = haversineDistanceMeters(
        lastLocationRef.current.coords.latitude,
        lastLocationRef.current.coords.longitude,
        location.coords.latitude,
        location.coords.longitude
      );

      if (distance > 0) {
        setMyDistance((prev) => prev + distance);
      }
    }

    lastLocationRef.current = location;
  }, [location]);

  useEffect(() => {
    if (!id || !userId) return;

    const sendUpdate = async () => {
      const now = Date.now();
      if (now - lastSentAtRef.current < THROTTLE_MS) return;
      if (Math.abs(myDistance - lastSentDistanceRef.current) < 0.1) return;

      const { error: updateError } = await supabase
        .from('match_progress')
        .upsert(
          {
            match_id: id,
            user_id: userId,
            distance_meters: myDistance,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'match_id,user_id' }
        );

      if (!updateError) {
        lastSentAtRef.current = now;
        lastSentDistanceRef.current = myDistance;
      }
    };

    sendUpdate();
  }, [id, userId, myDistance]);

  useEffect(() => {
    if (!id || !userId) return;

    const fetchOpponent = async () => {
      if (!opponentId) return;

      const { data } = await supabase
        .from('match_progress')
        .select('*')
        .eq('match_id', id)
        .eq('user_id', opponentId)
        .maybeSingle();

      if (data?.distance_meters !== undefined) {
        setRivalDistance(data.distance_meters);
      }
    };

    fetchOpponent();
  }, [id, userId, opponentId]);

  useEffect(() => {
    if (!id || !userId) return;

    const channel = supabase
      .channel(`match-progress-${id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'match_progress', filter: `match_id=eq.${id}` },
        (payload) => {
          const next = payload.new as MatchProgressRow;
          if (!next || next.user_id === userId) return;
          setRivalDistance(next.distance_meters ?? 0);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id, userId]);

  const finalizeAndNavigate = useCallback(async () => {
    if (hasNavigatedRef.current) return;
    hasNavigatedRef.current = true;

    stopTracking();

    if (id && userId) {
      await supabase
        .from('match_progress')
        .upsert(
          {
            match_id: id,
            user_id: userId,
            distance_meters: myDistance,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'match_id,user_id' }
        );
      lastSentAtRef.current = Date.now();
      lastSentDistanceRef.current = myDistance;
    }

    router.replace(`/match/result/${id}`);
  }, [id, userId, myDistance, router, stopTracking]);

  useEffect(() => {
    if (!id) return;
    if (myDistance < targetDistance) return;

    finalizeAndNavigate();
  }, [id, myDistance, targetDistance, finalizeAndNavigate]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <View style={styles.container}>
        <Text style={styles.title}>MATCH RUNNING</Text>

        {loading ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator color={COLORS.accent} />
            <Text style={styles.loadingText}>Loading match...</Text>
          </View>
        ) : null}

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <Card title="Elapsed Time" style={styles.card}>
          <Text style={styles.timerText}>
            {elapsedSeconds === null ? '--:--' : formatTime(elapsedSeconds)}
          </Text>
        </Card>

        <Card title="Distance Left" style={styles.card}>
          <Text style={styles.distanceText}>{Math.round(distanceLeft)} m</Text>
          <Text style={styles.distanceSubText}>
            Target {Math.round(targetDistance)} m
          </Text>
        </Card>

        <Card title="Progress" style={styles.card}>
          <ProgressBar
            youValue={myDistance}
            rivalValue={rivalDistance}
            maxValue={targetDistance}
            youLabel="YOU"
            rivalLabel="RIVAL"
          />
        </Card>

        <Text style={styles.leadText}>{leadText}</Text>

        {locationError ? (
          <Text style={styles.errorText}>{locationError}</Text>
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
    paddingHorizontal: 20,
    paddingTop: 16,
    gap: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: 1,
    color: COLORS.text,
    textTransform: 'uppercase',
  },
  card: {
    marginTop: 4,
  },
  timerText: {
    fontSize: 32,
    fontWeight: '900',
    color: COLORS.accent,
    textAlign: 'center',
    letterSpacing: 2,
  },
  distanceText: {
    fontSize: 26,
    fontWeight: '900',
    color: COLORS.accentBlue,
    textAlign: 'center',
    letterSpacing: 1,
  },
  distanceSubText: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.muted,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  leadText: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.accentBlue,
    textAlign: 'center',
    textTransform: 'uppercase',
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


