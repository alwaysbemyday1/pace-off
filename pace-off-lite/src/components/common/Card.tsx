import type { PropsWithChildren } from 'react';
import type { StyleProp, TextStyle, ViewStyle } from 'react-native';
import { StyleSheet, Text, View } from 'react-native';

const COLORS = {
  base: '#0F172A',
  surface: '#1E3A8A',
  surfaceInner: '#2748A6',
  text: '#F8FAFC',
  muted: '#CBD5F5',
};

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
    backgroundColor: COLORS.surface,
    borderColor: COLORS.base,
    borderWidth: 3,
    borderRadius: 18,
    padding: 16,
    shadowColor: COLORS.base,
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
    textShadowColor: COLORS.base,
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 0,
  },
  content: {
    backgroundColor: COLORS.surfaceInner,
    borderRadius: 12,
    padding: 12,
    borderColor: COLORS.base,
    borderWidth: 2,
  },
});
