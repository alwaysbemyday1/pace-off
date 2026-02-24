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

const DISTANCE_OPTIONS = [1000, 3000, 5000] as const;

type OpponentMode = 'ghost' | 'real';

const formatDistanceLabel = (meters: number) => {
  const km = meters / 1000;
  return `${km % 1 === 0 ? km.toFixed(0) : km.toFixed(1)} KM`;
};

export default function MatchSetupScreen() {
  const router = useRouter();
  const [selectedDistance, setSelectedDistance] = useState<number>(3000);
  const [opponentMode, setOpponentMode] = useState<OpponentMode>('ghost');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const distanceLabel = useMemo(
    () => formatDistanceLabel(selectedDistance),
    [selectedDistance]
  );

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

    const { data, error: insertError } = await supabase
      .from('matches')
      .insert({
        creator_id: userId,
        target_distance_meters: selectedDistance,
        status,
        opponent_id: null,
        started_at: startedAt,
        completed_at: null,
      })
      .select()
      .single();

    if (insertError || !data) {
      setError(insertError?.message ?? 'Failed to create match.');
      setLoading(false);
      return;
    }

    setLoading(false);

    if (opponentMode === 'real') {
      router.replace(`/match/waiting/${data.id}`);
    } else {
      router.replace(`/match/running/${data.id}`);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>MATCH SETUP</Text>
          <Text style={styles.subTitle}>SPEED MATCH</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Distance</Text>
          <View style={styles.optionRow}>
            {DISTANCE_OPTIONS.map((option) => {
              const active = option === selectedDistance;
              return (
                <Pressable
                  key={option}
                  onPress={() => setSelectedDistance(option)}
                  style={[styles.optionButton, active && styles.optionActive]}
                >
                  <Text style={[styles.optionText, active && styles.optionTextActive]}>
                    {formatDistanceLabel(option)}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <Text style={styles.helperText}>Selected: {distanceLabel}</Text>
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
          <Text style={styles.helperText}>
            {opponentMode === 'real'
              ? 'Waiting room will open after creation.'
              : 'Start immediately against AI.'}
          </Text>
        </View>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <PrimaryButton
          title={loading ? 'Creating...' : 'Create Match'}
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
    paddingHorizontal: 20,
    paddingTop: 16,
    gap: 20,
  },
  header: {
    gap: 6,
  },
  title: {
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: 1.5,
    color: COLORS.text,
    textTransform: 'uppercase',
  },
  subTitle: {
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 1,
    color: COLORS.accent,
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
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.8,
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
    minWidth: 96,
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: COLORS.background,
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
    fontWeight: '700',
  },
  optionTextActive: {
    color: COLORS.border,
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


