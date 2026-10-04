// The add / edit purchase form, shown as a modal (it slides up over the
// current screen instead of pushing a new page — see the root _layout.tsx).
//
// One screen, two jobs, picked by its URL params:
//   - /portfolio/entry?cardId=swsh3-136&finish=Holo  → add a new purchase
//   - /portfolio/entry?entryId=<id>                  → edit (or remove) one
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import {
  cardDataProvider,
  GRADES_BY_COMPANY,
  GRADING_COMPANIES,
  holdingKey,
  parseLocalDateString,
  pickDefaultFinish,
  type Card,
  type Grading,
  type GradingCompany,
  type NewPortfolioEntry,
  type PortfolioEntry,
} from "@foilio/shared";

import { Button, Chip, DateField, SectionLabel } from "@/components";
import { usePortfolio } from "@/portfolio";
import { colors, fontFamily, fontSize, radii, spacing, tabularNums } from "@/theme";

const MAX_QUANTITY = 999;

type Params = {
  entryId?: string;
  cardId?: string;
  finish?: string;
  company?: string;
  grade?: string;
};

/** Turns what's typed in the price box into dollars, or "invalid". Empty means no price. */
function parsePrice(text: string): number | undefined | "invalid" {
  const cleaned = text.replace(/[$,\s]/g, "");
  if (cleaned === "") return undefined;
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return "invalid";
  return Number(cleaned);
}

function isGradingCompany(value: string | undefined): value is GradingCompany {
  return GRADING_COMPANIES.includes(value as GradingCompany);
}

export default function PortfolioEntryScreen() {
  const params = useLocalSearchParams<Params>();
  const { status, entries } = usePortfolio();
  const cardId = params.entryId ? entries.find((entry) => entry.id === params.entryId)?.cardId : params.cardId;
  const existing = params.entryId ? entries.find((entry) => entry.id === params.entryId) : undefined;

  // The form needs the card's full list of finishes (and, when adding, its
  // name/set/image to save), so we fetch it — the same way the card detail
  // screen does.
  const [card, setCard] = useState<Card | null>(null);
  const [cardStatus, setCardStatus] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    if (!cardId) return;
    const controller = new AbortController();
    cardDataProvider
      .getCardDetails(cardId, controller.signal)
      .then((result) => {
        setCard(result);
        setCardStatus("ready");
      })
      .catch(() => {
        if (!controller.signal.aborted) setCardStatus("error");
      });
    return () => controller.abort();
  }, [cardId]);

  const title = params.entryId ? "Edit purchase" : "Add to portfolio";
  const header = <Stack.Screen options={{ title }} />;

  if (status !== "ready" || (params.entryId && !existing) || !cardId) {
    return (
      <View style={styles.centered}>
        {header}
        {status === "loading" ? (
          <ActivityIndicator size="large" color={colors.accent} />
        ) : (
          <Text style={styles.message}>This purchase isn&apos;t in your portfolio anymore.</Text>
        )}
      </View>
    );
  }

  // Editing works without the card (we already saved its details), just
  // limited to the finish it already has. Adding needs the card loaded.
  if (!existing && cardStatus !== "ready") {
    return (
      <View style={styles.centered}>
        {header}
        {cardStatus === "loading" ? (
          <ActivityIndicator size="large" color={colors.accent} />
        ) : (
          <Text style={styles.message}>Couldn&apos;t load this card. Check your connection and try again.</Text>
        )}
      </View>
    );
  }

  return (
    <>
      {header}
      <EntryForm existing={existing} card={card} params={params} />
    </>
  );
}

interface EntryFormProps {
  existing?: PortfolioEntry;
  card: Card | null;
  params: Params;
}

function EntryForm({ existing, card, params }: EntryFormProps) {
  const router = useRouter();
  const { summary, add, update, remove } = usePortfolio();

  const startingGrading: Grading =
    existing?.grading ??
    (isGradingCompany(params.company) && params.grade
      ? { kind: "graded", company: params.company, grade: params.grade }
      : { kind: "raw" });
  const startingFinish = existing?.finish ?? params.finish ?? (card ? pickDefaultFinish(card) : undefined);

  const [finish, setFinish] = useState(startingFinish);
  const [gradingKind, setGradingKind] = useState(startingGrading.kind);
  const [company, setCompany] = useState<GradingCompany>(
    startingGrading.kind === "graded" ? startingGrading.company : "PSA",
  );
  const [grade, setGrade] = useState(startingGrading.kind === "graded" ? startingGrading.grade : "10");
  const [quantity, setQuantity] = useState(existing?.quantity ?? 1);
  const [priceText, setPriceText] = useState(existing?.purchasePrice?.toFixed(2) ?? "");
  const [purchaseDate, setPurchaseDate] = useState(existing?.purchaseDate);
  const [notes, setNotes] = useState(existing?.notes ?? "");
  const [saving, setSaving] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);
  const [confirmingRemove, setConfirmingRemove] = useState(false);

  // Finishes to choose from: the card's real list when we have it. If it
  // didn't load (editing offline), just the finish already saved.
  const finishOptions = card && card.finishes.length > 0 ? card.finishes : finish ? [finish] : [];
  const price = parsePrice(priceText);
  const dateInvalid = purchaseDate !== undefined && !parseLocalDateString(purchaseDate);
  const canSave = Boolean(finish) && price !== "invalid" && !dateInvalid && !saving;

  const pickCompany = (next: GradingCompany) => {
    setCompany(next);
    // Not every company gives every grade (PSA has no 9.5).
    if (!GRADES_BY_COMPANY[next].includes(grade)) setGrade(GRADES_BY_COMPANY[next][0]);
  };

  const save = async () => {
    // canSave already rules out an invalid price, so TypeScript knows `price` is a number (or empty) below.
    if (!canSave || !finish) return;
    const grading: Grading = gradingKind === "raw" ? { kind: "raw" } : { kind: "graded", company, grade };
    const details = {
      finish,
      grading,
      quantity,
      purchasePrice: price,
      purchaseDate,
      notes: notes.trim() || undefined,
    };
    setSaving(true);
    setSaveFailed(false);
    try {
      if (existing) {
        await update(existing.id, details);
      } else if (card) {
        const entry: NewPortfolioEntry = {
          ...details,
          cardId: card.id,
          cardName: card.name,
          setName: card.setName,
          localId: card.localId,
          imageUrl: card.imageUrl,
        };
        await add(entry);
      }
      router.back();
    } catch {
      setSaving(false);
      setSaveFailed(true);
    }
  };

  const removeEntry = async () => {
    if (!existing) return;
    if (!confirmingRemove) {
      setConfirmingRemove(true);
      return;
    }
    // If this was the last purchase in its holding, the holding screen
    // underneath would be empty, so go all the way back to the Portfolio tab.
    const holding = summary.holdings.find((candidate) => candidate.key === holdingKey(existing));
    const lastInHolding = !holding || holding.lots.length <= 1;
    setSaving(true);
    try {
      await remove(existing.id);
      if (lastInHolding) router.dismissAll();
      else router.back();
    } catch {
      setSaving(false);
      setSaveFailed(true);
    }
  };

  const cardName = existing?.cardName ?? card?.name;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      automaticallyAdjustKeyboardInsets
    >
      <Text style={styles.cardName}>{cardName}</Text>

      {finishOptions.length > 1 && (
        <View style={styles.section}>
          <SectionLabel>Finish</SectionLabel>
          <View style={styles.chipRow}>
            {finishOptions.map((option) => (
              <Chip key={option} label={option} selected={option === finish} onPress={() => setFinish(option)} />
            ))}
          </View>
        </View>
      )}

      <View style={styles.section}>
        <SectionLabel>Condition</SectionLabel>
        <View style={styles.chipRow}>
          <Chip label="Raw" selected={gradingKind === "raw"} onPress={() => setGradingKind("raw")} />
          <Chip label="Graded" selected={gradingKind === "graded"} onPress={() => setGradingKind("graded")} />
        </View>
        {gradingKind === "graded" && (
          <>
            <View style={[styles.chipRow, styles.subRow]}>
              {GRADING_COMPANIES.map((option) => (
                <Chip key={option} label={option} selected={option === company} onPress={() => pickCompany(option)} />
              ))}
            </View>
            <View style={[styles.chipRow, styles.subRow]}>
              {GRADES_BY_COMPANY[company].map((option) => (
                <Chip key={option} label={option} selected={option === grade} onPress={() => setGrade(option)} />
              ))}
            </View>
            <Text style={styles.hint}>Graded cards don&apos;t have a price yet, so they won&apos;t count toward your total.</Text>
          </>
        )}
      </View>

      <View style={styles.section}>
        <SectionLabel>Quantity</SectionLabel>
        <View style={styles.stepper}>
          <Pressable
            style={[styles.stepperButton, quantity <= 1 && styles.disabled]}
            disabled={quantity <= 1}
            onPress={() => setQuantity(quantity - 1)}
            accessibilityLabel="Decrease quantity"
          >
            <Text style={styles.stepperSymbol}>−</Text>
          </Pressable>
          <Text style={styles.quantity}>{quantity}</Text>
          <Pressable
            style={[styles.stepperButton, quantity >= MAX_QUANTITY && styles.disabled]}
            disabled={quantity >= MAX_QUANTITY}
            onPress={() => setQuantity(quantity + 1)}
            accessibilityLabel="Increase quantity"
          >
            <Text style={styles.stepperSymbol}>+</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.section}>
        <SectionLabel>Price paid (each, optional)</SectionLabel>
        <TextInput
          style={styles.input}
          placeholder="$0.00"
          placeholderTextColor={colors.textMuted}
          keyboardType="decimal-pad"
          value={priceText}
          onChangeText={setPriceText}
        />
        {price === "invalid" && <Text style={styles.error}>Enter a price like 4.99.</Text>}
      </View>

      <View style={styles.section}>
        <SectionLabel>Purchase date (optional)</SectionLabel>
        <DateField value={purchaseDate} onChange={setPurchaseDate} />
      </View>

      <View style={styles.section}>
        <SectionLabel>Notes (optional)</SectionLabel>
        <TextInput
          style={[styles.input, styles.notes]}
          placeholder="e.g. Pulled from a booster box"
          placeholderTextColor={colors.textMuted}
          value={notes}
          onChangeText={setNotes}
          multiline
        />
      </View>

      {saveFailed && <Text style={styles.error}>Couldn&apos;t save. Please try again.</Text>}

      <View style={styles.actions}>
        <Button label={existing ? "Save changes" : "Add to portfolio"} onPress={save} disabled={!canSave} />
        <Button label="Cancel" variant="secondary" onPress={() => router.back()} />
        {existing && (
          <Pressable onPress={removeEntry} disabled={saving} style={styles.removeButton}>
            <Text style={styles.removeText}>{confirmingRemove ? "Tap again to remove" : "Remove this purchase"}</Text>
          </Pressable>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  centered: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xl,
  },
  message: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.md,
    color: colors.textMuted,
    textAlign: "center",
  },
  cardName: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.xl,
    color: colors.text,
  },
  section: {
    marginTop: spacing.xl,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  subRow: {
    marginTop: spacing.md,
  },
  hint: {
    marginTop: spacing.sm,
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
  stepper: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.lg,
  },
  stepperButton: {
    width: 44,
    height: 44,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  stepperSymbol: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.xl,
    color: colors.text,
  },
  disabled: {
    opacity: 0.4,
  },
  quantity: {
    ...tabularNums,
    minWidth: spacing.xxl,
    textAlign: "center",
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.xl,
    color: colors.text,
  },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    fontFamily: fontFamily.regular,
    fontSize: fontSize.md,
    color: colors.text,
  },
  notes: {
    minHeight: 80,
    textAlignVertical: "top",
  },
  error: {
    marginTop: spacing.xs,
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    color: colors.loss,
  },
  actions: {
    marginTop: spacing.xl,
    gap: spacing.md,
  },
  removeButton: {
    alignItems: "center",
    paddingVertical: spacing.md,
  },
  removeText: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.md,
    color: colors.loss,
  },
});
