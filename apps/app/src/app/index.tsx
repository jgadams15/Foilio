// This file is the app's home screen.
//
// Expo Router uses "file-based routing": every file inside src/app/ becomes a
// screen, and its file name becomes its address. index.tsx is the first screen
// people see (like index.html on a website). A future src/app/search.tsx would
// automatically become the "/search" screen.

// "import" pulls in building blocks written by someone else.
// View is a box (like a <div> on a website), Text shows words, and StyleSheet
// holds our styling rules (like CSS).
import { StyleSheet, Text, View } from "react-native";

// A screen is just a function that returns what to draw. The angle-bracket
// syntax below is called JSX: it looks like HTML but lives inside TypeScript.
// "export default" tells Expo Router "this is the screen for this file".
export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Hello Foilio 👋</Text>
      <Text style={styles.subtitle}>Your Pokémon card portfolio starts here.</Text>
    </View>
  );
}

// Styles look like CSS but use camelCase names (fontSize, not font-size)
// and plain numbers instead of "24px".
const styles = StyleSheet.create({
  container: {
    flex: 1, // take up the whole screen
    alignItems: "center", // center children left-to-right
    justifyContent: "center", // center children top-to-bottom
    padding: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
  },
});
