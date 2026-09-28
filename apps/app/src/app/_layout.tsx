// _layout.tsx wraps every screen in this folder. The underscore means
// "this is not a screen itself". Here we use Tabs: a bar at the bottom of the
// screen lets people switch between top-level screens directly, instead of
// stacking screens on top of each other.
import { Tabs } from "expo-router";

export default function RootLayout() {
  return (
    <Tabs screenOptions={{ headerTitle: "Foilio" }}>
      <Tabs.Screen name="index" options={{ title: "Portfolio" }} />
      <Tabs.Screen name="scan" options={{ title: "Scan" }} />
      <Tabs.Screen name="search" options={{ title: "Search" }} />
    </Tabs>
  );
}
