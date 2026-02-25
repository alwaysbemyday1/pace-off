import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { PrimaryButton } from '@/components/common/PrimaryButton';
import { COLORS, SIZES } from '@/styles/theme';
import { supabase } from '@/utils/supabase';

const QUICK_DISTANCE_KM = [1, 3, 5] as const;
const MIN_KM = 0.1;
const MAX_KM = 50;
const STEP_KM = 0.01;

type OpponentMode = 'ghost' | 'real';

const normalizeKm = (value: number) => {
  const clamped = Math.min(MAX_KM, Math.max(MIN_KM, value));
  return Math.round(clamped * 100) / 100;
};

const formatKmLabel = (value: number) => `${value.toFixed(2)} KM`;

export default function MatchSetupScreen() {
  const router = useRouter();
  const [distanceKm, setDistanceKm] = useState<number>(3);
  const [distanceText, setDistanceText] = useState<string>('3.00');
  const [opponentMode, setOpponentMode] = useState<OpponentMode>('ghost');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const devToolsEnabled =
    __DEV__ || process.env.EXPO_PUBLIC_DEV_TOOLS === '1';

  const distanceLabel = useMemo(
    () => formatKmLabel(distanceKm),
    [distanceKm]
  );

  const updateDistance = (value: number) => {
    const next = normalizeKm(value);
    setDistanceKm(next);
    setDistanceText(next.toFixed(2));
  };

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
    const targetMeters = Math.round(distanceKm * 1000);

    const { data, error: insertError } = await supabase
      .from('matches')
      .insert({
        creator_id: userId,
        target_distance_meters: targetMeters,
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
            {QUICK_DISTANCE_KM.map((option) => {
              const active = option === distanceKm;
              return (
                <Pressable
                  key={option}
                  onPress={() => updateDistance(option)}
                  style={[styles.optionButton, active && styles.optionActive]}
                >
                  <Text style={[styles.optionText, active && styles.optionTextActive]}>
                    {option} KM
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.stepRow}>
            <Pressable
              onPress={() => updateDistance(distanceKm - STEP_KM)}
              style={styles.stepButton}
            >
              <Text style={styles.stepText}>-</Text>
            </Pressable>
            <TextInput
              value={distanceText}
              onChangeText={(text) => {
                const next = text.replace(',', '.');
                setDistanceText(next);
                const parsed = Number.parseFloat(next);
                if (!Number.isNaN(parsed)) {
                  setDistanceKm(normalizeKm(parsed));
                }
              }}
              onBlur={() => updateDistance(distanceKm)}
              keyboardType="decimal-pad"
              style={styles.distanceInput}
            />
            <Pressable
              onPress={() => updateDistance(distanceKm + STEP_KM)}
              style={styles.stepButton}
            >
              <Text style={styles.stepText}>+</Text>
            </Pressable>
          </View>
          <Text style={styles.helperText}>Selected: {distanceLabel}</Text>
          <Text style={styles.helperSubText}>0.01 KM 단위로 조절 가능</Text>
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

        {devToolsEnabled ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Dev Quick Start</Text>
            <View style={styles.optionRow}>
              {[0.2, 0.5, 0.75].map((value) => (
                <Pressable
                  key={value}
                  onPress={() => updateDistance(value)}
                  style={styles.devButton}
                >
                  <Text style={styles.devButtonText}>{value} KM</Text>
                </Pressable>
              ))}
            </View>
          </View>
        ) : null}

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
  distanceInput: {
    flex: 1,
    height: 40,
    backgroundColor: COLORS.input,
    borderColor: COLORS.border,
    borderWidth: SIZES.borderLight,
    borderRadius: SIZES.radiusSmall,
    color: COLORS.text,
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 1,
  },
  helperText: {
    color: COLORS.muted,
    fontSize: 12,
    marginTop: 10,
  },
  helperSubText: {
    color: COLORS.muted,
    fontSize: 11,
    marginTop: 4,
  },
  devButton: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: SIZES.radiusSmall,
    borderColor: COLORS.border,
    borderWidth: SIZES.borderLight,
    backgroundColor: COLORS.panelLight,
  },
  devButtonText: {
    color: COLORS.text,
    fontSize: 11,
    fontWeight: '800',
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
