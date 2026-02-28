import { StyleSheet, Text, View } from 'react-native';

import { COLORS, SIZES } from '@/styles/theme';

type StatusBadgeProps = {
  label: string;
  tone?: 'neutral' | 'success' | 'warning';
};

const toneStyles = {
  neutral: {
    backgroundColor: COLORS.panelDark,
    textColor: COLORS.muted,
  },
  success: {
    backgroundColor: COLORS.accentGreen,
    textColor: COLORS.border,
  },
  warning: {
    backgroundColor: COLORS.accent,
    textColor: COLORS.border,
  },
};

export const StatusBadge = ({ label, tone = 'neutral' }: StatusBadgeProps) => {
  const toneStyle = toneStyles[tone];

  return (
    <View style={[styles.badge, { backgroundColor: toneStyle.backgroundColor }]}>
      <Text style={[styles.text, { color: toneStyle.textColor }]}>{label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: SIZES.radiusSmall,
    borderColor: COLORS.border,
    borderWidth: SIZES.borderLight,
  },
  text: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
});

