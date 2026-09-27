// _layout.tsx wraps every screen in this folder. The underscore means
// "this is not a screen itself". Here we use a Stack: screens pile on top of
// each other like cards, and the back button pops the top one off.
import { Stack } from "expo-router";

export default function RootLayout() {
  return <Stack screenOptions={{ title: "Foilio" }} />;
}
