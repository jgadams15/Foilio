// The web version of DateField (see DateField.tsx). Browsers have no native
// date picker we can use from React Native, so this is a plain text box
// for "YYYY-MM-DD". It passes along whatever is typed; the form checks it's
// a real day before saving.
import { useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";

import { parseLocalDateString } from "@foilio/shared";

import { colors, fontFamily, fontSize, radii, spacing } from "@/theme";

import type { DateFieldProps } from "./DateField";

export function DateField({ value, onChange }: DateFieldProps) {
  const [text, setText] = useState(value ?? "");
  const invalid = text.trim() !== "" && !parseLocalDateString(text);

  return (
    <View>
      <TextInput
        style={styles.input}
        placeholder="YYYY-MM-DD"
        placeholderTextColor={colors.textMuted}
        value={text}
        onChangeText={(next) => {
          setText(next);
          onChange(next.trim() === "" ? undefined : next.trim());
        }}
      />
      {invalid && <Text style={styles.error}>Use the format 2026-10-03.</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    fontFamily: fontFamily.regular,
    fontSize: fontSize.md,
    color: colors.text,
  },
  error: {
    marginTop: spacing.xs,
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    color: colors.loss,
  },
});
