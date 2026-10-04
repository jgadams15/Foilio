// The web version of the Scan tab's capture step (see CameraCapture.tsx).
// Live scanning is built for phones, so in a browser we ask for a photo of
// the card instead. Browsers only allow opening a file picker straight from
// a click, so the picker opens from the button press itself.
import { useState } from "react";
import { StyleSheet, Text } from "react-native";

import { Button } from "@/components";
import { colors, fontFamily, fontSize } from "@/theme";

import type { CameraCaptureProps } from "./CameraCapture";
import { pickPhoto } from "./pickPhoto";
import { ScanMessage } from "./ScanMessage";

export function CameraCapture({ onCapture }: CameraCaptureProps) {
  const [error, setError] = useState<string | null>(null);

  async function handleUpload() {
    setError(null);
    try {
      const uri = await pickPhoto();
      if (uri) onCapture(uri);
    } catch {
      setError("Couldn't open that photo. Please try another one.");
    }
  }

  return (
    <ScanMessage
      icon="image-outline"
      title="Scan a card"
      body="Live camera scanning works in the Foilio phone app. Here, upload a clear photo of your card, taken straight on, instead."
    >
      <Button label="Upload a photo" onPress={handleUpload} />
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </ScanMessage>
  );
}

const styles = StyleSheet.create({
  error: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.sm,
    color: colors.loss,
    textAlign: "center",
  },
});
