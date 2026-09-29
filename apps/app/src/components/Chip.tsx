// A small pill, e.g. a time-range selector (1W/1M/6M/ALL) or a filter
// toggle. The selected chip is filled indigo; the rest are outlined.
import { Pressable, StyleSheet, Text } from "react-native";

import { colors, fontFamily, fontSize, radii, spacing } from "@/theme";

interface ChipProps {
  label: string;
  selected?: boolean;
  onPress: () => void;
}

export function Chip({ label, selected = false, onPress }: ChipProps) {
  return (
    <Pressable style={[styles.base, selected && styles.selected]} onPress={onPress}>
      <Text style={[styles.label, selected && styles.selectedLabel]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  selected: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  label: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  selectedLabel: {
    color: colors.text,
  },
});
