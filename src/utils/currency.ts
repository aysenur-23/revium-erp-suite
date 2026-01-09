// Ortak para birimi tanımlamaları
export const CURRENCIES = ["TRY", "USD", "EUR", "GBP"] as const;

export type Currency = typeof CURRENCIES[number];

export const CURRENCY_OPTIONS: { value: Currency; label: string }[] = [
  { value: "TRY", label: "TRY (₺)" },
  { value: "USD", label: "USD ($)" },
  { value: "EUR", label: "EUR (€)" },
  { value: "GBP", label: "GBP (£)" },
];

export const CURRENCY_SYMBOLS: Record<Currency, string> = {
  TRY: "₺",
  USD: "$",
  EUR: "€",
  GBP: "£",
};

export const DEFAULT_CURRENCY: Currency = "TRY";

