import type { StyleProp, TextStyle, ViewStyle } from 'react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { COLORS, SIZES } from '@/styles/theme';

type PrimaryButtonProps = {
  title: string;
  onPress?: () => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  accessibilityLabel?: string;
};

export const PrimaryButton = ({
  title,
  onPress,
  disabled,
  style,
  textStyle,
  accessibilityLabel,
}: PrimaryButtonProps) => {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        pressed && styles.buttonPressed,
        disabled && styles.buttonDisabled,
        style,
      ]}
    >
      <View style={styles.inner}>
        <Text style={[styles.text, disabled && styles.textDisabled, textStyle]}>
          {title}
        </Text>
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  button: {
    backgroundColor: COLORS.accent,
    borderColor: COLORS.border,
    borderWidth: SIZES.borderHeavy,
    borderRadius: SIZES.radiusMedium,
    paddingVertical: 16,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 0,
    elevation: 6,
  },
  buttonPressed: {
    transform: [{ translateY: 2 }],
    shadowOpacity: 0.25,
    elevation: 3,
  },
  buttonDisabled: {
    backgroundColor: '#3C4A63',
    borderColor: COLORS.border,
  },
  inner: {
    width: '100%',
    alignItems: 'center',
  },
  text: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    textShadowColor: COLORS.border,
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 0,
  },
  textDisabled: {
    color: COLORS.muted,
  },
});


