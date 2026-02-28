import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { PrimaryButton } from '@/components/common/PrimaryButton';
import { COLORS, SIZES } from '@/styles/theme';
import { supabase } from '@/utils/supabase';

const QUICK_GOALS = [3, 5, 7] as const;
const MIN_GOAL = 1;
const MAX_GOAL = 7;

type OpponentMode = 'ghost' | 'real';

const clampGoal = (value: number) =>
  Math.min(MAX_GOAL, Math.max(MIN_GOAL, value));

const getEndOfWeek = () => {
  const now = new Date();
  const day = now.getDay(); // 0 (Sun) - 6 (Sat)
  const diff = (7 - day) % 7;
  const end = new Date(now);
  end.setDate(now.getDate() + diff);
  end.setHours(23, 59, 59, 999);
  return end.toISOString();
};

export default function RoutineSetupScreen() {
  const router = useRouter();
  const [goalDays, setGoalDays] = useState<number>(5);
  const [opponentMode, setOpponentMode] = useState<OpponentMode>('real');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const goalLabel = useMemo(() => `${goalDays} DAYS`, [goalDays]);

  const handleCreate = async () => {
    setError(null);
    setLoading(true);

    const { data: sessionData, error: sessionError } =
      await supabase.auth.getSession();

    if (sessionError) {
      setError(sessionError.message);
      setLoading(false);
      return;
    }

    const userId = sessionData.session?.user.id;

    if (!userId) {
      setError('Please sign in again.');
      setLoading(false);
      return;
    }

    const status = opponentMode === 'real' ? 'waiting' : 'in_progress';
    const startedAt = opponentMode === 'real' ? null : new Date().toISOString();
    const expiresAt = getEndOfWeek();

    const { data, error: insertError } = await supabase
      .from('matches')
      .insert({
        creator_id: userId,
        match_type: 'routine',
        target_value: goalDays,
        target_distance_meters: 0,
        status,
        opponent_id: null,
        started_at: startedAt,
        completed_at: null,
        expires_at: expiresAt,
      })
      .select()
      .single();

    if (insertError || !data) {
      setError(insertError?.message ?? 'Failed to create routine match.');
      setLoading(false);
      return;
    }

    setLoading(false);

    if (opponentMode === 'real') {
      router.replace(`/match/waiting/${data.id}`);
    } else {
      router.replace(`/match/routine/${data.id}`);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>MATCH SETUP</Text>
          <Text style={styles.subTitle}>ROUTINE MATCH</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Weekly Goal</Text>
          <View style={styles.optionRow}>
            {QUICK_GOALS.map((option) => {
              const active = option === goalDays;
              return (
                <Pressable
                  key={option}
                  onPress={() => setGoalDays(option)}
                  style={[styles.optionButton, active && styles.optionActive]}
                >
                  <Text style={[styles.optionText, active && styles.optionTextActive]}>
                    {option} DAYS
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.stepRow}>
            <Pressable
              onPress={() => setGoalDays((prev) => clampGoal(prev - 1))}
              style={styles.stepButton}
            >
              <Text style={styles.stepText}>-</Text>
            </Pressable>
            <Text style={styles.goalText}>{goalLabel}</Text>
            <Pressable
              onPress={() => setGoalDays((prev) => clampGoal(prev + 1))}
              style={styles.stepButton}
            >
              <Text style={styles.stepText}>+</Text>
            </Pressable>
          </View>
          <Text style={styles.helperText}>7???숈븞 紐⑺몴 ?ъ꽦</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Opponent</Text>
          <View style={styles.optionRow}>
            <Pressable
              onPress={() => setOpponentMode('ghost')}
              style={[
                styles.optionButton,
                opponentMode === 'ghost' && styles.optionActive,
              ]}
            >
              <Text
                style={[
                  styles.optionText,
                  opponentMode === 'ghost' && styles.optionTextActive,
                ]}
              >
                Ghost (AI)
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setOpponentMode('real')}
              style={[
                styles.optionButton,
                opponentMode === 'real' && styles.optionActive,
              ]}
            >
              <Text
                style={[
                  styles.optionText,
                  opponentMode === 'real' && styles.optionTextActive,
                ]}
              >
                Real Opponent
              </Text>
            </Pressable>
          </View>
        </View>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <PrimaryButton
          title={loading ? 'Creating...' : 'Create Routine'}
          onPress={handleCreate}
          disabled={loading}
        />

        {loading ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator color={COLORS.accent} />
            <Text style={styles.loadingText}>Creating match...</Text>
          </View>
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
    gap: 18,
  },
  header: {
    backgroundColor: COLORS.panel,
    borderColor: COLORS.border,
    borderWidth: SIZES.borderHeavy,
    borderRadius: SIZES.radiusMedium,
    paddingVertical: 10,
    alignItems: 'center',
    gap: 4,
  },
  title: {
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 2,
    color: COLORS.text,
    textTransform: 'uppercase',
    fontFamily: 'SpaceMono',
  },
  subTitle: {
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 1,
    color: COLORS.highlight,
    textTransform: 'uppercase',
  },
  section: {
    backgroundColor: COLORS.panel,
    borderColor: COLORS.border,
    borderWidth: SIZES.borderHeavy,
    borderRadius: SIZES.radiusLarge,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 1,
    color: COLORS.text,
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  optionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  optionButton: {
    flexGrow: 1,
    minWidth: 90,
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: COLORS.input,
    borderColor: COLORS.border,
    borderWidth: SIZES.borderLight,
    borderRadius: SIZES.radiusSmall,
    alignItems: 'center',
  },
  optionActive: {
    backgroundColor: COLORS.accent,
    borderColor: COLORS.border,
  },
  optionText: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: '800',
  },
  optionTextActive: {
    color: COLORS.border,
  },
  stepRow: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  stepButton: {
    width: 44,
    height: 36,
    borderRadius: SIZES.radiusSmall,
    backgroundColor: COLORS.panelDark,
    borderColor: COLORS.border,
    borderWidth: SIZES.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepText: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: '900',
  },
  goalText: {
    flex: 1,
    textAlign: 'center',
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 1,
  },
  helperText: {
    color: COLORS.muted,
    fontSize: 12,
    marginTop: 10,
  },
  errorText: {
    color: COLORS.accentOrange,
    fontSize: 12,
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
});

