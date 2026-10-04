// Lets the user pick an existing photo instead of taking a new one. Used for
// "Upload a photo" on web (no live camera there), and as a fallback on
// phones when camera access is turned off.
import * as ImagePicker from "expo-image-picker";

/** Opens the photo library (or a file picker on web). Resolves to the
 * picked photo's address, or `null` if the user backed out. */
export async function pickPhoto(): Promise<string | null> {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images"],
    quality: 0.8,
  });
  if (result.canceled || result.assets.length === 0) return null;
  return result.assets[0].uri;
}
