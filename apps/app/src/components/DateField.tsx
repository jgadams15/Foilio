// An optional date, picked with the phone's own date picker. Shows a
// "Set date" button until a date is chosen, then the date with a way to
// clear it. Stores the day as "YYYY-MM-DD" (see toLocalDateString).
//
// This is the phone version. DateField.web.tsx is the web version — Expo
// automatically uses a ".web.tsx" file instead of the plain one when
// running in a browser, because the native date picker doesn't exist there.
import DateTimePicker, { DateTimePickerAndroid } from "@react-native-community/datetimepicker";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";

import { formatDisplayDate, parseLocalDateString, toLocalDateString } from "@foilio/shared";

import { colors, fontFamily, fontSize, spacing } from "@/theme";

import { Chip } from "./Chip";

export interface DateFieldProps {
  /** "YYYY-MM-DD", or undefined for no date. */
  value?: string;
  onChange: (value: string | undefined) => void;
}

export function DateField({ value, onChange }: DateFieldProps) {
  const date = value ? parseLocalDateString(value) : undefined;
  const today = new Date();

  const openAndroidPicker = () =>
    DateTimePickerAndroid.open({
      value: date ?? today,
      mode: "date",
      maximumDate: today,
      onValueChange: (_event, picked) => onChange(toLocalDateString(picked)),
    });

  if (!date) {
    return (
      <View style={styles.row}>
        <Chip
          label="Set date"
          onPress={() => (Platform.OS === "android" ? openAndroidPicker() : onChange(toLocalDateString(today)))}
        />
      </View>
    );
  }

  return (
    <View style={styles.row}>
      {Platform.OS === "ios" ? (
        // iOS's "compact" style is a small date button that opens a calendar popover.
        <DateTimePicker
          value={date}
          mode="date"
          display="compact"
          themeVariant="dark"
          maximumDate={today}
          onValueChange={(_event, picked) => onChange(toLocalDateString(picked))}
        />
      ) : (
        <Chip label={formatDisplayDate(value!)} selected onPress={openAndroidPicker} />
      )}
      <Pressable onPress={() => onChange(undefined)} hitSlop={spacing.sm}>
        <Text style={styles.clear}>Clear</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  clear: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
});
