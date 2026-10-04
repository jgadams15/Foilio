// Shows the photo just taken (or picked) so the user can check it before
// using it. Card recognition isn't built yet, so "Use photo" just says so
// and points them to Search in the meantime.
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { Button, Card } from "@/components";
import { colors, fontFamily, fontSize, radii, spacing } from "@/theme";

interface PhotoReviewProps {
  uri: string;
  /** "Retake" on phones; "Choose another" on web, where there's no camera. */
  retakeLabel: string;
  onRetake: () => void;
}

export function PhotoReview({ uri, retakeLabel, onRetake }: PhotoReviewProps) {
  const router = useRouter();
  const [showComingSoon, setShowComingSoon] = useState(false);

  return (
    <View style={styles.container}>
      <Image source={{ uri }} style={styles.photo} contentFit="contain" accessibilityLabel="Your card photo" />

      {showComingSoon ? (
        <Card style={styles.notice}>
          <Ionicons name="sparkles-outline" size={fontSize.xl} color={colors.accent} />
          <View style={styles.noticeText}>
            <Text style={styles.noticeTitle}>Card recognition coming soon</Text>
            <Text style={styles.noticeBody}>
              For now, you can find your card by name.{" "}
              <Text style={styles.link} onPress={() => router.navigate("/search")} accessibilityRole="link">
                Go to Search
              </Text>
            </Text>
          </View>
        </Card>
      ) : null}

      <View style={styles.actions}>
        <View style={styles.action}>
          <Button label={retakeLabel} variant="secondary" onPress={onRetake} />
        </View>
        <View style={styles.action}>
          <Button label="Use photo" onPress={() => setShowComingSoon(true)} disabled={showComingSoon} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.lg,
    gap: spacing.lg,
  },
  photo: {
    flex: 1,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
  },
  notice: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.md,
  },
  noticeText: {
    flex: 1,
    gap: spacing.xs,
  },
  noticeTitle: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.md,
    color: colors.text,
  },
  noticeBody: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  link: {
    fontFamily: fontFamily.semiBold,
    color: colors.accent,
  },
  actions: {
    flexDirection: "row",
    gap: spacing.md,
  },
  action: {
    flex: 1,
  },
});
