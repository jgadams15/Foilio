// The one PortfolioStore the app uses. Screens never touch this directly —
// they go through usePortfolio() — and nothing outside this file knows the
// portfolio is saved on-device. Moving to Supabase later means changing
// only this line.
//
// AsyncStorage is a small private key/value store that belongs to the app:
// on a phone it's a file inside the app's own sandbox; on web it's the
// browser's localStorage for this site. randomUUID gives each entry an id
// that's unique everywhere, so it can be uploaded to a database later as-is.
import AsyncStorage from "@react-native-async-storage/async-storage";
import { randomUUID } from "expo-crypto";

import { LocalPortfolioStore, type PortfolioStore } from "@foilio/shared";

export const portfolioStore: PortfolioStore = new LocalPortfolioStore(AsyncStorage, randomUUID);
