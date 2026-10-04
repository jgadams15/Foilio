// The phone version of the Scan tab's capture step: asks for camera
// permission, shows the live camera with a card outline, and takes a photo.
// The web version lives in CameraCapture.web.tsx — the bundler automatically
// picks the ".web" file when building for a browser.
import { CameraView, useCameraPermissions } from "expo-camera";
import * as Linking from "expo-linking";
import { useIsFocused } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { AppState, Pressable, StyleSheet, Text, View } from "react-native";

import { Button } from "@/components";
import { colors, fontFamily, fontSize, radii, sizes, spacing } from "@/theme";

import { CardGuide } from "./CardGuide";
import { pickPhoto } from "./pickPhoto";
import { ScanMessage } from "./ScanMessage";

export interface CameraCaptureProps {
  /** Called with the photo's address once one is taken or picked. */
  onCapture: (uri: string) => void;
}

export function CameraCapture({ onCapture }: CameraCaptureProps) {
  // `permission` is null while we're still checking, then says whether
  // access is granted and whether the phone will let us ask again.
  const [permission, requestPermission, refreshPermission] = useCameraPermissions();

  // If the user leaves to turn the camera on in Settings, the phone doesn't
  // tell us when they come back — so re-check whenever the app returns to
  // the foreground.
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") refreshPermission();
    });
    return () => subscription.remove();
  }, [refreshPermission]);

  async function handlePickPhoto() {
    const uri = await pickPhoto();
    if (uri) onCapture(uri);
  }

  // Still checking — show a plain background instead of flashing a message.
  if (!permission) return <View style={styles.blank} />;

  if (!permission.granted) {
    const firstTime = permission.status === "undetermined";
    // After a "Don't allow", iOS (and Android after two) won't show the
    // system prompt again — the only way back is the Settings app.
    if (!firstTime && !permission.canAskAgain) {
      return (
        <ScanMessage
          icon="camera-outline"
          title="Camera access is off"
          body="To scan cards, turn on camera access for Foilio in your phone's Settings. You can still pick a photo from your library."
        >
          <Button label="Open Settings" onPress={() => Linking.openSettings()} />
          <Button label="Choose a photo" variant="secondary" onPress={handlePickPhoto} />
        </ScanMessage>
      );
    }
    return (
      <ScanMessage
        icon="scan-outline"
        title={firstTime ? "Scan your cards" : "Camera access needed"}
        body="Foilio uses your camera to take a photo of a card so it can be identified. Photos stay on your phone."
      >
        <Button label={firstTime ? "Allow camera" : "Try again"} onPress={requestPermission} />
        <Button label="Choose a photo instead" variant="secondary" onPress={handlePickPhoto} />
      </ScanMessage>
    );
  }

  return <LiveCamera onCapture={onCapture} />;
}

function LiveCamera({ onCapture }: CameraCaptureProps) {
  // Tabs stay loaded in the background, so without this the camera (and
  // the phone's "camera in use" light) would stay on while you're on
  // another tab. We remove the camera whenever this tab isn't showing; when
  // you come back, a fresh one starts up (with fresh "is it ready?" state).
  const isFocused = useIsFocused();
  return isFocused ? <CameraSession onCapture={onCapture} /> : <View style={styles.preview} />;
}

function CameraSession({ onCapture }: CameraCaptureProps) {
  // A "ref" is a handle to the on-screen camera, so we can tell it to take a picture.
  const cameraRef = useRef<CameraView>(null);
  const [isReady, setIsReady] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCapture() {
    if (!cameraRef.current || isCapturing) return;
    setIsCapturing(true);
    setError(null);
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.8 });
      onCapture(photo.uri);
    } catch {
      setError("Couldn't take the photo. Please try again.");
    } finally {
      setIsCapturing(false);
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.preview}>
        <CameraView
          ref={cameraRef}
          style={StyleSheet.absoluteFill}
          facing="back"
          onCameraReady={() => setIsReady(true)}
          onMountError={() => setError("The camera couldn't start. Try leaving this tab and coming back.")}
        />
        <CardGuide />
      </View>
      <View style={styles.controls}>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Pressable
          onPress={handleCapture}
          disabled={!isReady || isCapturing}
          accessibilityRole="button"
          accessibilityLabel="Take photo"
          style={({ pressed }) => [
            styles.shutter,
            (pressed || isCapturing) && styles.shutterPressed,
            !isReady && styles.shutterDisabled,
          ]}
        >
          <View style={styles.shutterInner} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  blank: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  preview: {
    flex: 1,
    backgroundColor: colors.cameraBackground,
    overflow: "hidden",
  },
  controls: {
    alignItems: "center",
    paddingVertical: spacing.xl,
    gap: spacing.md,
  },
  error: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.sm,
    color: colors.loss,
    textAlign: "center",
  },
  // The shutter is a white ring with an indigo dot, like a camera app's.
  shutter: {
    width: sizes.captureButton,
    height: sizes.captureButton,
    borderRadius: radii.pill,
    borderWidth: 4,
    borderColor: colors.text,
    padding: spacing.xs,
  },
  shutterInner: {
    flex: 1,
    borderRadius: radii.pill,
    backgroundColor: colors.accent,
  },
  shutterPressed: {
    opacity: 0.7,
  },
  shutterDisabled: {
    opacity: 0.4,
  },
});
