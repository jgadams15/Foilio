// _layout.tsx wraps every screen in this folder. The underscore means
// "this is not a screen itself". Here we use Tabs: a bar at the bottom of the
// screen lets people switch between top-level screens directly, instead of
// stacking screens on top of each other.
//
// This layout lives inside a "(tabs)" folder — parentheses mean the folder
// name itself isn't part of the URL, it just groups these three screens
// under one shared tab bar. The parent layout (src/app/_layout.tsx) treats
// "(tabs)" as one screen of its own Stack, so a screen outside this group
// (like card/[id]) can push on top of whichever tab is open.
import { Tabs } from "expo-router";

export default function TabLayout() {
  return (
    <Tabs screenOptions={{ headerTitle: "Foilio" }}>
      <Tabs.Screen name="index" options={{ title: "Portfolio" }} />
      <Tabs.Screen name="scan" options={{ title: "Scan" }} />
      <Tabs.Screen name="search" options={{ title: "Search" }} />
    </Tabs>
  );
}
