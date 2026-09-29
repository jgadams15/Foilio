// The root layout for the whole app. A Stack shows one screen at a time and
// lets you "push" a new one on top (with a back button to return) — unlike
// Tabs, which only switches between its own fixed set of screens. Here the
// Stack holds two things: the entire tab bar ("(tabs)", as one screen) and
// the card detail screen ("card/[id]"). That's what lets tapping a card from
// any tab push the detail screen on top of that tab, instead of the detail
// screen needing to be a tab itself.
import { Stack } from "expo-router";

export default function RootLayout() {
  return (
    <Stack>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="card/[id]" options={{ title: "Card" }} />
    </Stack>
  );
}
