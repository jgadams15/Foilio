// A subtle animated sheen over a card image, for holo-style finishes. Sweeps
// a soft diagonal highlight across the image in a loop. When the device's
// Reduce Motion accessibility setting is on, the same highlight is shown as
// a static overlay instead of animating.
import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useState } from "react";
import { AccessibilityInfo, StyleSheet, View } from "react-native";
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

import { radii } from "@/theme";

// Tuned for the card detail screen's 240x330 image — this component is only
// ever laid over that one image size today.
const SWEEP_WIDTH = 140;
const SWEEP_START_X = -160;
const SWEEP_END_X = 380;
const SWEEP_DURATION_MS = 2200;

export function FinishShimmer() {
  const [reduceMotion, setReduceMotion] = useState(false);
  const sweepX = useSharedValue(SWEEP_START_X);

  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled().then((value) => {
      if (mounted) setReduceMotion(value);
    });
    const subscription = AccessibilityInfo.addEventListener("reduceMotionChanged", setReduceMotion);
    return () => {
      mounted = false;
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    if (reduceMotion) {
      cancelAnimation(sweepX);
      return;
    }
    sweepX.value = SWEEP_START_X;
    sweepX.value = withRepeat(
      withTiming(SWEEP_END_X, { duration: SWEEP_DURATION_MS, easing: Easing.inOut(Easing.quad) }),
      -1,
      false,
    );
    return () => cancelAnimation(sweepX);
  }, [reduceMotion, sweepX]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: sweepX.value }, { rotate: "20deg" }],
  }));

  return (
    <View pointerEvents="none" style={styles.clip}>
      <Animated.View style={[styles.sweep, reduceMotion ? styles.staticSweep : animatedStyle]}>
        <LinearGradient
          colors={["transparent", "rgba(255, 255, 255, 0.35)", "transparent"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  clip: {
    ...StyleSheet.absoluteFill,
    borderRadius: radii.lg,
    overflow: "hidden",
  },
  sweep: {
    position: "absolute",
    top: -80,
    bottom: -80,
    width: SWEEP_WIDTH,
    transform: [{ rotate: "20deg" }],
  },
  staticSweep: {
    left: "35%",
  },
});
