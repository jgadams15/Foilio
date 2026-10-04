// A PortfolioStore that saves everything on the device itself.
//
// It doesn't know *how* the device saves things — it's handed a tiny
// "save some text under a name / read it back" helper (KeyValueStorage).
// The app passes in AsyncStorage, which works on iOS, Android, and web.
// Keeping that outside this file means packages/shared never imports any
// phone-specific code.
import type { NewPortfolioEntry, PortfolioEntry } from "../types";
import type { PortfolioStore } from "./store";

/** The bare minimum we need from a device's storage. AsyncStorage fits this shape. */
export interface KeyValueStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
}

const STORAGE_KEY = "foilio.portfolio";

// The whole portfolio is saved as one JSON blob. The version number lets a
// future app update recognize (and convert) data saved by an older version
// instead of misreading it.
interface SavedPortfolio {
  version: 1;
  entries: PortfolioEntry[];
}

export class LocalPortfolioStore implements PortfolioStore {
  // Saves run one after another, never at the same time — otherwise two
  // quick adds could each read the old list and the second save would
  // overwrite the first one's entry.
  private queue: Promise<unknown> = Promise.resolve();

  constructor(
    private readonly storage: KeyValueStorage,
    private readonly createId: () => string,
  ) {}

  list(): Promise<PortfolioEntry[]> {
    return this.enqueue(() => this.read());
  }

  add(entry: NewPortfolioEntry): Promise<PortfolioEntry> {
    return this.enqueue(async () => {
      const entries = await this.read();
      const saved: PortfolioEntry = { ...entry, id: this.createId(), addedAt: new Date().toISOString() };
      await this.write([...entries, saved]);
      return saved;
    });
  }

  update(id: string, changes: Partial<NewPortfolioEntry>): Promise<PortfolioEntry> {
    return this.enqueue(async () => {
      const entries = await this.read();
      const existing = entries.find((entry) => entry.id === id);
      if (!existing) throw new Error(`No portfolio entry with id ${id}`);
      const updated: PortfolioEntry = { ...existing, ...changes, id: existing.id, addedAt: existing.addedAt };
      await this.write(entries.map((entry) => (entry.id === id ? updated : entry)));
      return updated;
    });
  }

  remove(id: string): Promise<void> {
    return this.enqueue(async () => {
      const entries = await this.read();
      await this.write(entries.filter((entry) => entry.id !== id));
    });
  }

  private enqueue<T>(task: () => Promise<T>): Promise<T> {
    const result = this.queue.then(task);
    // Keep the queue going even if this task fails.
    this.queue = result.catch(() => undefined);
    return result;
  }

  private async read(): Promise<PortfolioEntry[]> {
    const raw = await this.storage.getItem(STORAGE_KEY);
    if (raw === null) return [];
    // If the saved data is unreadable we stop with an error rather than
    // treating it as empty — treating it as empty would let the next save
    // overwrite (and lose) whatever was there.
    const saved = JSON.parse(raw) as SavedPortfolio;
    if (saved.version !== 1 || !Array.isArray(saved.entries)) {
      throw new Error(`Unrecognized saved portfolio (version ${String(saved.version)})`);
    }
    return saved.entries;
  }

  private write(entries: PortfolioEntry[]): Promise<void> {
    const saved: SavedPortfolio = { version: 1, entries };
    return this.storage.setItem(STORAGE_KEY, JSON.stringify(saved));
  }
}
