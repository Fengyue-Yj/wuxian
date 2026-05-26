"use client";

import { createContext, useContext, useState, useEffect } from "react";

const SettingsContext = createContext();

export const translations = {
  "zh-CN": {
    brand: "吴现",
    brandTitle: "无限",
    poem1: "枝生无限月，花满自然秋。",
    poem2: "Branches cradle the endless moon, flowers bloom a natural autumn.",
    searchPlaceholder: "搜索标题或日期 (如 2026-05)...",
    searchBtn: "查找",
    submitBtn: "投稿",
    contactBtn: "联系",
    noEssays: "暂无随笔发布。",
    noMatch: "没有找到匹配的随笔。",
    copied: "已复制邮箱地址",
    backHome: "← 返回首页",
    endMark: "完",
    essays: "随笔"
  },
  "zh-TW": {
    brand: "吳現",
    brandTitle: "無限",
    poem1: "枝生無限月，花滿自然秋。",
    poem2: "Branches cradle the endless moon, flowers bloom a natural autumn.",
    searchPlaceholder: "搜尋標題或日期 (如 2026-05)...",
    searchBtn: "尋找",
    submitBtn: "投稿",
    contactBtn: "聯絡",
    noEssays: "暫無隨筆發佈。",
    noMatch: "沒有找到匹配的隨筆。",
    copied: "已複製電子郵件",
    backHome: "← 返回首頁",
    endMark: "完",
    essays: "隨筆"
  },
  "en": {
    brand: "Wu Xian",
    brandTitle: "Infinity",
    poem1: "Branches cradle the endless moon, flowers bloom a natural autumn.",
    poem2: "枝生无限月，花满自然秋。",
    searchPlaceholder: "Search titles or dates...",
    searchBtn: "Search",
    submitBtn: "Submit",
    contactBtn: "Contact",
    noEssays: "No essays published yet.",
    noMatch: "No matching essays found.",
    copied: "Email address copied!",
    backHome: "← Back Home",
    endMark: "END",
    essays: "Essays"
  }
};

export function SettingsProvider({ children }) {
  const [language, setLanguage] = useState("zh-CN");
  const [theme, setTheme] = useState("light");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
    const savedLang = localStorage.getItem("app-lang");
    const savedTheme = localStorage.getItem("app-theme");
    
    if (savedLang) setLanguage(savedLang);
    if (savedTheme) {
      setTheme(savedTheme);
      if (savedTheme === "dark") {
        document.documentElement.classList.add("dark");
      }
    }
  }, []);

  const toggleTheme = (newTheme) => {
    setTheme(newTheme);
    localStorage.setItem("app-theme", newTheme);
    if (newTheme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  };

  const changeLanguage = (lang) => {
    setLanguage(lang);
    localStorage.setItem("app-lang", lang);
  };

  const t = translations[language];

  return (
    <SettingsContext.Provider value={{ language, changeLanguage, theme, toggleTheme, t }}>
      {children}
    </SettingsContext.Provider>
  );
}

export const useSettings = () => useContext(SettingsContext);
