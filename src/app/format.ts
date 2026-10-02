const dateFormatter = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeZone: "America/Sao_Paulo" });

export function formatDate(value: string | Date | null | undefined): string {
  if (!value) return "—";
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : dateFormatter.format(date);
}

/**
 * Formats an integer amount in minor units without floating point.
 * Assumes two minor digits per unit (the platform stores amounts as integer minor units).
 */
export function formatMinor(amountMinor: string, currencyCode: string): string {
  if (!/^\d+$/.test(amountMinor)) return "—";
  const value = BigInt(amountMinor);
  const whole = new Intl.NumberFormat("pt-BR").format(value / 100n);
  const cents = String(value % 100n).padStart(2, "0");
  const symbol = currencyCode === "BRL" ? "R$" : currencyCode;
  return `${symbol} ${whole},${cents}`;
}

/** Parses "1234", "1234.5" or "1.234,56"-free user input ("1234,56") into integer minor units, or null when invalid. */
export function parseMoneyToMinor(input: string): number | null {
  const match = /^(\d{1,12})(?:[.,](\d{1,2}))?$/.exec(input.trim());
  if (!match) return null;
  const cents = (match[2] ?? "").padEnd(2, "0");
  return Number(match[1]) * 100 + Number(cents);
}
