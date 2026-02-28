import { StyleSheet, Text, View } from 'react-native';

import { COLORS, SIZES } from '@/styles/theme';

type RoutineDay = {
  label: string;
  completed: boolean;
  isToday?: boolean;
};

type RoutineCalendarProps = {
  days: RoutineDay[];
};

export const RoutineCalendar = ({ days }: RoutineCalendarProps) => {
  return (
    <View style={styles.container}>
      {days.map((day) => (
        <View
          key={day.label}
          style={[
            styles.day,
            day.completed && styles.dayCompleted,
            day.isToday && styles.dayToday,
          ]}
        >
          <Text style={styles.dayLabel}>{day.label}</Text>
          <Text style={styles.dayStatus}>{day.completed ? '?? : '쨌'}</Text>
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 6,
  },
  day: {
    flex: 1,
    minHeight: 46,
    borderRadius: SIZES.radiusSmall,
    borderColor: COLORS.border,
    borderWidth: SIZES.borderLight,
    backgroundColor: COLORS.panelDark,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  dayCompleted: {
    backgroundColor: COLORS.accentGreen,
  },
  dayToday: {
    borderColor: COLORS.highlight,
    borderWidth: SIZES.borderHeavy,
  },
  dayLabel: {
    color: COLORS.text,
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  dayStatus: {
    color: COLORS.border,
    fontSize: 14,
    fontWeight: '900',
  },
});

