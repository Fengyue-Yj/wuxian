const dateFormatters = {
  "zh-CN": new Intl.DateTimeFormat("zh-CN", {
    year: "numeric", month: "long", day: "numeric", timeZone: "UTC",
  }),
  "zh-TW": new Intl.DateTimeFormat("zh-TW", {
    year: "numeric", month: "long", day: "numeric", timeZone: "UTC",
  }),
  en: new Intl.DateTimeFormat("en-US", {
    year: "numeric", month: "short", day: "numeric", timeZone: "UTC",
  }),
};

export function formatEssayDate(dateString, language) {
  if (typeof dateString !== "string") return "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateString)) return dateString;

  // Publication dates are calendar days, independent of the reader's time zone.
  const date = new Date(`${dateString}T00:00:00Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== dateString) {
    return dateString;
  }

  const formatter = dateFormatters[language] || dateFormatters["zh-CN"];
  return formatter.format(date);
}
