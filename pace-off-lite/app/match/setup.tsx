import { useMemo, useState } from 'react';
import {
  SafeAreaView,
  StyleSheet,
  Text,
  View,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';

import { PrimaryButton } from '@/components/common/PrimaryButton';
import { supabase } from '@/utils/supabase';

const TIME_OPTIONS = [10, 15, 30] as const;

type OpponentMode = 'ghost' | 'real';

export default function MatchSetupScreen() {
  const router = useRouter();
  const [selectedTime, setSelectedTime] = useState<number>(15);
  const [opponentMode, setOpponentMode] = useState<OpponentMode>('ghost');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const timeLabel = useMemo(() => `${selectedTime} min`, [selectedTime]);

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

    const { data, error: insertError } = await supabase
      .from('matches')
      .insert({
        creator_id: userId,
        target_time_minutes: selectedTime,
        status,
        opponent_id: null,
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
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.title}>MATCH SETUP</Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Match Time</Text>
          <View style={styles.optionRow}>
            {TIME_OPTIONS.map((option) => {
              const active = option === selectedTime;
              return (
                <Pressable
                  key={option}
                  onPress={() => setSelectedTime(option)}
                  style={[styles.optionButton, active && styles.optionActive]}
                >
                  <Text style={[styles.optionText, active && styles.optionTextActive]}>
                    {option} min
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <Text style={styles.helperText}>Selected: {timeLabel}</Text>
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
            <ActivityIndicator color="#F59E0B" />
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
    backgroundColor: '#0B1220',
  },
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
    gap: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: 1,
    color: '#F8FAFC',
  },
  section: {
    backgroundColor: '#1E293B',
    borderColor: '#0F172A',
    borderWidth: 3,
    borderRadius: 18,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.8,
    color: '#F8FAFC',
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
    backgroundColor: '#0B1220',
    borderColor: '#0F172A',
    borderWidth: 2,
    borderRadius: 12,
    alignItems: 'center',
  },
  optionActive: {
    backgroundColor: '#F59E0B',
    borderColor: '#0F172A',
  },
  optionText: {
    color: '#E2E8F0',
    fontSize: 12,
    fontWeight: '700',
  },
  optionTextActive: {
    color: '#0B1220',
  },
  helperText: {
    color: '#94A3B8',
    fontSize: 12,
    marginTop: 10,
  },
  errorText: {
    color: '#F97316',
    fontSize: 12,
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
});
