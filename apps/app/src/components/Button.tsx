// A filled (primary) or outlined (secondary) button, styled to the app theme.
import { Pressable, StyleSheet, Text } from "react-native";

import { colors, fontFamily, fontSize, radii, spacing } from "@/theme";

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: "primary" | "secondary";
  disabled?: boolean;
}

export function Button({ label, onPress, variant = "primary", disabled = false }: ButtonProps) {
  const isPrimary = variant === "primary";
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={[
        styles.base,
        isPrimary ? styles.primary : styles.secondary,
        disabled && styles.disabled,
      ]}
    >
      <Text style={[styles.label, isPrimary ? styles.primaryLabel : styles.secondaryLabel]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: radii.md,
    alignItems: "center",
    justifyContent: "center",
  },
  primary: {
    backgroundColor: colors.accent,
  },
  secondary: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: colors.accent,
  },
  disabled: {
    opacity: 0.5,
  },
  label: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.md,
  },
  primaryLabel: {
    color: colors.text,
  },
  secondaryLabel: {
    color: colors.accent,
  },
});
