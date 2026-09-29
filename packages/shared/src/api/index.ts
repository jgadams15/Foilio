export type { CardDataProvider } from "./provider";
export { buildCardImageUrl, buildSetSymbolUrl } from "./tcgdex";
export type { ImageQuality } from "./tcgdex";

import type { CardDataProvider } from "./provider";
import { TcgdexProvider } from "./tcgdex";

// The one provider instance the app uses. Screens should depend on this (and
// on the CardDataProvider interface), never on TcgdexProvider directly —
// swapping in a different data source later means changing only this line.
export const cardDataProvider: CardDataProvider = new TcgdexProvider();
