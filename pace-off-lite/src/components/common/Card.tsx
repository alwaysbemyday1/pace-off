import type { PropsWithChildren } from 'react';
import type { StyleProp, TextStyle, ViewStyle } from 'react-native';
import { StyleSheet, Text, View } from 'react-native';

import { COLORS, SIZES } from '@/styles/theme';

type CardProps = PropsWithChildren<{
  title?: string;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  titleStyle?: StyleProp<TextStyle>;
}>;

export const Card = ({
  title,
  style,
  contentStyle,
  titleStyle,
  children,
}: CardProps) => {
  return (
    <View style={[styles.card, style]}>
      {title ? <Text style={[styles.title, titleStyle]}>{title}</Text> : null}
      <View style={[styles.content, contentStyle]}>{children}</View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.panel,
    borderColor: COLORS.border,
    borderWidth: SIZES.borderHeavy,
    borderRadius: SIZES.radiusLarge,
    padding: 16,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 0,
    elevation: 5,
  },
  title: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginBottom: 10,
    textShadowColor: COLORS.border,
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 0,
  },
  content: {
    backgroundColor: COLORS.panelInner,
    borderRadius: SIZES.radiusMedium,
    padding: 12,
    borderColor: COLORS.border,
    borderWidth: SIZES.borderLight,
  },
});


