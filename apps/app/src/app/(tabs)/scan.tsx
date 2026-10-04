// The Scan tab. Phase 1 of the scanner: take (or, on web, upload) a photo
// of a card and check it. Recognizing which card it is comes later.
//
// The screen has two steps: capturing a photo, then reviewing it. We only
// keep track of the photo's address — no photo means we're still capturing.
// The real work lives in src/scanner, so this file just switches between
// the two steps.
import { useState } from "react";
import { Platform } from "react-native";

import { CameraCapture, PhotoReview } from "@/scanner";

export default function ScanScreen() {
  const [photoUri, setPhotoUri] = useState<string | null>(null);

  if (photoUri) {
    return (
      <PhotoReview
        uri={photoUri}
        retakeLabel={Platform.OS === "web" ? "Choose another" : "Retake"}
        onRetake={() => setPhotoUri(null)}
      />
    );
  }

  return <CameraCapture onCapture={setPhotoUri} />;
}
