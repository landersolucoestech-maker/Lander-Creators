import { describe, expect, it } from "vitest";
import { currencyFractionDigits, formatMinor, parseMoneyToMinor } from "@/app/format";

const plain = (value: string) => value.replace(/\s/g, " ");

describe("money formatting follows the currency's own minor unit", () => {
  it("knows how many minor digits each currency has", () => {
    expect(currencyFractionDigits("BRL")).toBe(2);
    expect(currencyFractionDigits("USD")).toBe(2);
    expect(currencyFractionDigits("JPY")).toBe(0);
    expect(currencyFractionDigits("KWD")).toBe(3);
  });

  it("formats BRL minor units exactly", () => {
    expect(plain(formatMinor("250000", "BRL"))).toBe("R$ 2.500,00");
    expect(plain(formatMinor("5", "BRL"))).toBe("R$ 0,05");
    expect(plain(formatMinor("0", "BRL"))).toBe("R$ 0,00");
  });

  it("does not divide zero-decimal currencies by 100", () => {
    expect(formatMinor("1234", "JPY")).toContain("1.234");
    expect(formatMinor("1234", "JPY")).not.toContain(",");
  });

  it("keeps three decimals for three-decimal currencies", () => {
    expect(formatMinor("1234567", "KWD")).toContain("1.234,567");
  });

  it("is exact for amounts beyond double precision", () => {
    expect(formatMinor("900719925474099312", "BRL")).toContain("9.007.199.254.740.993,12");
  });

  it("degrades safely for malformed input or unknown currency codes", () => {
    expect(formatMinor("abc", "BRL")).toBe("—");
    expect(formatMinor("100", "Z1")).toContain("1,00");
  });
});

describe("parsing user money input into minor units", () => {
  it("honours the currency's minor digits", () => {
    expect(parseMoneyToMinor("1500,5", "BRL")).toBe(150050);
    expect(parseMoneyToMinor("1500", "BRL")).toBe(150000);
    expect(parseMoneyToMinor("1500", "JPY")).toBe(1500);
    expect(parseMoneyToMinor("1,234", "KWD")).toBe(1234);
  });

  it("rejects more decimals than the currency allows", () => {
    expect(parseMoneyToMinor("10,555", "BRL")).toBeNull();
    expect(parseMoneyToMinor("10,5", "JPY")).toBeNull();
  });

  it("rejects malformed values", () => {
    expect(parseMoneyToMinor("", "BRL")).toBeNull();
    expect(parseMoneyToMinor("-5", "BRL")).toBeNull();
    expect(parseMoneyToMinor("1e3", "BRL")).toBeNull();
    expect(parseMoneyToMinor("10", "Z1")).toBeNull();
  });
});
