// The root layout for the whole app. A Stack shows one screen at a time and
// lets you "push" a new one on top (with a back button to return) — unlike
// Tabs, which only switches between its own fixed set of screens. Here the
// Stack holds two things: the entire tab bar ("(tabs)", as one screen) and
// the card detail screen ("card/[id]"). That's what lets tapping a card from
// any tab push the detail screen on top of that tab, instead of the detail
// screen needing to be a tab itself. The portfolio's holding screen and
// add/edit form live here too, so they can open from any tab.
//
// PortfolioProvider wraps everything so every screen shares the same
// portfolio data (see src/portfolio/PortfolioProvider.tsx).
//
// This is also where we load the Inter font before showing anything —
// useFonts() starts the (async) load, and until it (or an error) resolves we
// return null so the native splash screen stays up instead of flashing
// default system fonts for a moment.
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from "@expo-google-fonts/inter";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";

import { PortfolioProvider } from "@/portfolio";
import { colors, fontFamily } from "@/theme";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <PortfolioProvider>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          contentStyle: { backgroundColor: colors.background },
          headerStyle: { backgroundColor: colors.background },
          headerTitleStyle: { fontFamily: fontFamily.semiBold, color: colors.text },
          headerTintColor: colors.text,
          headerShadowVisible: false,
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="card/[id]" options={{ title: "Card" }} />
        <Stack.Screen name="portfolio/holding" options={{ title: "Holding" }} />
        {/* "modal" slides the form up over the current screen (on iOS); swipe down to dismiss. */}
        <Stack.Screen name="portfolio/entry" options={{ title: "Add to portfolio", presentation: "modal" }} />
      </Stack>
    </PortfolioProvider>
  );
}
