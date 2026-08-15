export function localDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function shiftedMonthStart(year: number, zeroBasedMonth: number, amount: number): Date {
  return new Date(year, zeroBasedMonth + amount, 1, 12, 0, 0, 0);
}

export function localizedMonthTag(date: Date, locale = "es-PA"): string {
  return new Intl.DateTimeFormat(locale, { month: "long" })
    .format(date)
    .toLocaleLowerCase(locale);
}

export function safeExportFilename(name: string): string {
  const cleaned = name.trim().replace(/[\\/:*?"<>|]+/g, "-").replace(/[. ]+$/g, "");
  const safe = cleaned || "Documento";
  return /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(safe)
    ? `Documento-${safe}`
    : safe;
}

export function safeCsvCell(value: string): string {
  const neutralized = /^[=+\-@]/.test(value.trimStart()) ? `'${value}` : value;
  return `"${neutralized.replaceAll('"', '""')}"`;
}
