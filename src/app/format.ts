const dateFormatter = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeZone: "America/Sao_Paulo" });

export function formatDate(value: string | Date | null | undefined): string {
  if (!value) return "—";
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : dateFormatter.format(date);
}

/*
 * Money is persisted as an integer in the currency's ISO 4217 minor unit (BRL cents, JPY yen, KWD fils).
 * The number of minor digits therefore belongs to the currency, never to the formatter.
 */

/** Minor digits of a currency (BRL 2, JPY 0, KWD 3); null when the code is not a valid currency code. */
function fractionDigitsOrNull(currencyCode: string): number | null {
  try {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: currencyCode }).resolvedOptions().maximumFractionDigits ?? 2;
  } catch {
    return null;
  }
}

export function currencyFractionDigits(currencyCode: string): number {
  return fractionDigitsOrNull(currencyCode) ?? 2;
}

/** Formats an integer amount in minor units without floating point. */
export function formatMinor(amountMinor: string, currencyCode: string): string {
  if (!/^\d+$/.test(amountMinor)) return "—";
  const digits = fractionDigitsOrNull(currencyCode);
  const places = digits ?? 2;
  const raw = amountMinor.replace(/^0+(?=\d)/, "").padStart(places + 1, "0");
  // Exact decimal string: Intl formats numeric strings without converting them to a double.
  const decimal = (places === 0 ? raw : `${raw.slice(0, -places)}.${raw.slice(-places)}`) as `${number}`;
  if (digits === null) return `${currencyCode} ${new Intl.NumberFormat("pt-BR", { minimumFractionDigits: places, maximumFractionDigits: places }).format(decimal)}`;
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: currencyCode }).format(decimal);
}

/**
 * Parses user input such as "1500", "1500,5" or "1500.50" into integer minor units for the currency,
 * or null when the value is malformed, has more decimals than the currency allows, or the currency is invalid.
 */
export function parseMoneyToMinor(input: string, currencyCode: string): number | null {
  const digits = fractionDigitsOrNull(currencyCode);
  if (digits === null) return null;
  const match = /^(\d{1,12})(?:[.,](\d+))?$/.exec(input.trim());
  if (!match) return null;
  const fraction = match[2] ?? "";
  if (fraction.length > digits) return null;
  return Number(match[1]) * 10 ** digits + Number(fraction.padEnd(digits, "0") || "0");
}

/** Example value for money inputs, with the currency's own number of decimals. */
export function moneyInputPlaceholder(currencyCode: string): string {
  const digits = currencyFractionDigits(currencyCode);
  return digits === 0 ? "1500" : `1500,${"0".repeat(digits)}`;
}
