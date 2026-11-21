"use client";

import { createContext, useContext, useEffect, useSyncExternalStore } from "react";

const SettingsContext = createContext();

const DEFAULT_LANG = "zh-CN";
const DEFAULT_THEME = "dark";
const PREFERENCE_EVENT = "app-preferences-change";

let memoryLang = null;
let memoryTheme = null;

export const translations = {
  "zh-CN": {
    brand: "吴现",
    brandTitle: "无限",
    poem1: "枝生无限月，花满自然秋。",
    poem2: "Branches cradle the endless moon, flowers bloom a natural autumn.",
    searchPlaceholder: "搜索标题、摘要或日期 (如 2026-05)...",
    searchBtn: "查找",
    clearSearch: "清空并关闭查找",
    toggleCalendar: "按日期筛选",
    settings: "阅读设置",
    languageLabel: "界面语言",
    themeLabel: "显示模式",
    light: "日间",
    dark: "夜间",
    submitBtn: "投稿",
    contactBtn: "联系",
    noEssays: "暂无随笔发布。",
    noMatch: "没有找到匹配的随笔。",
    copied: "已复制邮箱地址",
    copyFailed: "复制失败，请手动复制",
    backHome: "← 返回首页",
    endMark: "完",
    essays: "随笔"
  },
  "zh-TW": {
    brand: "吳現",
    brandTitle: "無限",
    poem1: "枝生無限月，花滿自然秋。",
    poem2: "Branches cradle the endless moon, flowers bloom a natural autumn.",
    searchPlaceholder: "搜尋標題、摘要或日期 (如 2026-05)...",
    searchBtn: "尋找",
    clearSearch: "清空並關閉搜尋",
    toggleCalendar: "依日期篩選",
    settings: "閱讀設定",
    languageLabel: "介面語言",
    themeLabel: "顯示模式",
    light: "日間",
    dark: "夜間",
    submitBtn: "投稿",
    contactBtn: "聯絡",
    noEssays: "暫無隨筆發佈。",
    noMatch: "沒有找到匹配的隨筆。",
    copied: "已複製電子郵件",
    copyFailed: "複製失敗，請手動複製",
    backHome: "← 返回首頁",
    endMark: "完",
    essays: "隨筆"
  },
  "en": {
    brand: "Wu Xian",
    brandTitle: "Infinity",
    poem1: "Branches cradle the endless moon, flowers bloom a natural autumn.",
    poem2: "枝生无限月，花满自然秋。",
    searchPlaceholder: "Search titles, excerpts, or dates...",
    searchBtn: "Search",
    clearSearch: "Clear and close search",
    toggleCalendar: "Filter by date",
    settings: "Reading settings",
    languageLabel: "Interface language",
    themeLabel: "Appearance",
    light: "Light",
    dark: "Dark",
    submitBtn: "Submit",
    contactBtn: "Contact",
    noEssays: "No essays published yet.",
    noMatch: "No matching essays found.",
    copied: "Email address copied!",
    copyFailed: "Copy failed",
    backHome: "← Back Home",
    endMark: "END",
    essays: "Essays"
  }
};

function subscribePreferences(callback) {
  if (typeof window === "undefined") return () => {};
  window.addEventListener("storage", callback);
  window.addEventListener(PREFERENCE_EVENT, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(PREFERENCE_EVENT, callback);
  };
}

function getLangSnapshot() {
  if (memoryLang) return memoryLang;
  try {
    const saved = localStorage.getItem("app-lang");
    if (saved && Object.prototype.hasOwnProperty.call(translations, saved)) {
      return saved;
    }
  } catch {
    // Ignore storage read errors in restricted environments
  }
  return DEFAULT_LANG;
}

function getThemeSnapshot() {
  if (memoryTheme) return memoryTheme;
  try {
    const saved = localStorage.getItem("app-theme");
    if (saved === "light" || saved === "dark") {
      return saved;
    }
  } catch {
    // Ignore storage read errors in restricted environments
  }
  return DEFAULT_THEME;
}

export function SettingsProvider({ children }) {
  const language = useSyncExternalStore(
    subscribePreferences,
    getLangSnapshot,
    () => DEFAULT_LANG
  );
  const theme = useSyncExternalStore(
    subscribePreferences,
    getThemeSnapshot,
    () => DEFAULT_THEME
  );

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  const toggleTheme = (newTheme) => {
    if (newTheme !== "dark" && newTheme !== "light") return;
    try {
      localStorage.setItem("app-theme", newTheme);
      memoryTheme = null;
    } catch {
      memoryTheme = newTheme;
    }
    document.documentElement.classList.toggle("dark", newTheme === "dark");
    window.dispatchEvent(new Event(PREFERENCE_EVENT));
  };

  const changeLanguage = (lang) => {
    if (!Object.prototype.hasOwnProperty.call(translations, lang)) return;
    try {
      localStorage.setItem("app-lang", lang);
      memoryLang = null;
    } catch {
      memoryLang = lang;
    }
    document.documentElement.lang = lang;
    window.dispatchEvent(new Event(PREFERENCE_EVENT));
  };

  const t = translations[language] || translations[DEFAULT_LANG];

  return (
    <SettingsContext.Provider value={{ language, changeLanguage, theme, toggleTheme, t }}>
      {children}
    </SettingsContext.Provider>
  );
}

export const useSettings = () => useContext(SettingsContext);
