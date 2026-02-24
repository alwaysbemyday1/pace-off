import type { StyleProp, TextStyle, ViewStyle } from 'react-native';
import { StyleSheet, Text, View } from 'react-native';

const COLORS = {
  base: '#0F172A',
  track: '#0B1220',
  you: '#38BDF8',
  rival: '#F97316',
  text: '#F8FAFC',
  muted: '#94A3B8',
};

type ProgressBarProps = {
  youValue: number;
  rivalValue: number;
  maxValue: number;
  height?: number;
  youLabel?: string;
  rivalLabel?: string;
  style?: StyleProp<ViewStyle>;
  labelStyle?: StyleProp<TextStyle>;
  showValues?: boolean;
};

const clampRatio = (value: number, maxValue: number) => {
  if (!Number.isFinite(value) || !Number.isFinite(maxValue) || maxValue <= 0) {
    return 0;
  }
  return Math.max(0, Math.min(1, value / maxValue));
};

export const ProgressBar = ({
  youValue,
  rivalValue,
  maxValue,
  height = 20,
  youLabel = 'YOU',
  rivalLabel = 'RIVAL',
  style,
  labelStyle,
  showValues = true,
}: ProgressBarProps) => {
  const youRatio = clampRatio(youValue, maxValue);
  const rivalRatio = clampRatio(rivalValue, maxValue);

  return (
    <View style={[styles.container, style]}>
      <View style={styles.row}>
        <Text style={[styles.label, labelStyle]}>{youLabel}</Text>
        {showValues ? (
          <Text style={styles.value}>{`${Math.round(youValue)} / ${Math.round(maxValue)}`}</Text>
        ) : null}
      </View>
      <View style={[styles.track, { height }]}>
        <View style={[styles.fill, styles.youFill, { width: `${youRatio * 100}%` }]} />
      </View>

      <View style={styles.spacer} />

      <View style={styles.row}>
        <Text style={[styles.label, labelStyle]}>{rivalLabel}</Text>
        {showValues ? (
          <Text style={styles.value}>{`${Math.round(rivalValue)} / ${Math.round(maxValue)}`}</Text>
        ) : null}
      </View>
      <View style={[styles.track, { height }]}>
        <View style={[styles.fill, styles.rivalFill, { width: `${rivalRatio * 100}%` }]} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  label: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1,
    textTransform: 'uppercase',
    textShadowColor: COLORS.base,
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 0,
  },
  value: {
    color: COLORS.muted,
    fontSize: 12,
    fontWeight: '700',
  },
  track: {
    backgroundColor: COLORS.track,
    borderColor: COLORS.base,
    borderWidth: 3,
    borderRadius: 999,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
  },
  youFill: {
    backgroundColor: COLORS.you,
  },
  rivalFill: {
    backgroundColor: COLORS.rival,
  },
  spacer: {
    height: 12,
  },
});
