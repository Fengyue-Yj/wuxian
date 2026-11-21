"use client";

import { DayPicker } from "react-day-picker";
import { format, isValid, parseISO } from "date-fns";
import { enUS, zhCN, zhTW } from "date-fns/locale";
import "react-day-picker/dist/style.css";

const locales = { "zh-CN": zhCN, "zh-TW": zhTW, en: enUS };

export default function EssayCalendar({ essays, language, searchQuery, onSelectDate }) {
  const essayDates = essays
    .map((essay) => parseISO(essay.date || ""))
    .filter(isValid);
  const availableDates = new Set(essayDates.map((date) => format(date, "yyyy-MM-dd")));
  const selectedDate = availableDates.has(searchQuery) ? parseISO(searchQuery) : undefined;

  return (
    <DayPicker
      mode="single"
      locale={locales[language] || zhCN}
      defaultMonth={selectedDate || essayDates[0]}
      selected={selectedDate}
      autoFocus
      modifiers={{ hasEssay: essayDates }}
      modifiersClassNames={{ hasEssay: "day-has-essay" }}
      disabled={(day) => !availableDates.has(format(day, "yyyy-MM-dd"))}
      onDayClick={(day, modifiers) => {
        if (!modifiers.disabled) onSelectDate(format(day, "yyyy-MM-dd"));
      }}
    />
  );
}
