// The card-shaped outline drawn over the live camera, so the user knows where
// to line up their card. Everything outside the outline is dimmed, which
// makes the "hole" stand out — the same trick document-scanner apps use.
//
// The overlay is built from plain Views: a dim strip above, a dim strip
// below, and a middle row of [dim | outline | dim]. It ignores touches
// (pointerEvents="none") so it never blocks the camera underneath.
import { useState } from "react";
import { type LayoutChangeEvent, StyleSheet, Text, View } from "react-native";

import { colors, fontFamily, fontSize, radii, spacing } from "@/theme";

// A standard Pokémon card is 63 × 88 mm, so width ÷ height ≈ 0.716.
const CARD_ASPECT_RATIO = 63 / 88;
// How much of the camera area the outline may take up, at most.
const MAX_WIDTH_SHARE = 0.8;
const MAX_HEIGHT_SHARE = 0.75;

export function CardGuide() {
  // We need the camera area's size to work out how big the outline can be,
  // so we measure it once it's been laid out.
  const [area, setArea] = useState<{ width: number; height: number } | null>(null);

  function handleLayout(event: LayoutChangeEvent) {
    const { width, height } = event.nativeEvent.layout;
    setArea({ width, height });
  }

  // Fit the card shape inside the area: as wide as allowed, unless that
  // would make it too tall — then as tall as allowed instead.
  let guideWidth = 0;
  if (area) {
    guideWidth = Math.min(area.width * MAX_WIDTH_SHARE, area.height * MAX_HEIGHT_SHARE * CARD_ASPECT_RATIO);
  }
  const guideHeight = guideWidth / CARD_ASPECT_RATIO;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none" onLayout={handleLayout}>
      {area ? (
        <>
          <View style={styles.dim} />
          <View style={[styles.middleRow, { height: guideHeight }]}>
            <View style={styles.dim} />
            <View style={[styles.outline, { width: guideWidth, height: guideHeight }]} />
            <View style={styles.dim} />
          </View>
          <View style={[styles.dim, styles.hintArea]}>
            <Text style={styles.hint}>Line up your card inside the frame</Text>
          </View>
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  dim: {
    flex: 1,
    backgroundColor: colors.scrim,
  },
  middleRow: {
    flexDirection: "row",
  },
  outline: {
    borderWidth: 2,
    borderColor: colors.text,
    borderRadius: radii.md,
  },
  hintArea: {
    alignItems: "center",
    paddingTop: spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  hint: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.md,
    color: colors.text,
    textAlign: "center",
  },
});
