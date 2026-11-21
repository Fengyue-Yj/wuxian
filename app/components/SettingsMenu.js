"use client";

import { useState, useRef, useEffect, useId } from "react";
import { useSettings } from "../contexts/SettingsContext";
import { Settings, Moon, Sun, Globe } from "lucide-react";

export default function SettingsMenu() {
  const { language, changeLanguage, theme, toggleTheme, t } = useSettings();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef(null);
  const toggleRef = useRef(null);
  const panelId = useId();
  const languageLabelId = useId();
  const themeLabelId = useId();

  useEffect(() => {
    if (!isOpen) return;

    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("pointerdown", handleClickOutside);
    return () => document.removeEventListener("pointerdown", handleClickOutside);
  }, [isOpen]);

  const handleKeyDown = (event) => {
    if (event.key !== "Escape" || !isOpen) return;
    event.preventDefault();
    event.stopPropagation();
    setIsOpen(false);
    toggleRef.current?.focus();
  };

  const handleBlur = (event) => {
    if (event.relatedTarget && !event.currentTarget.contains(event.relatedTarget)) {
      setIsOpen(false);
    }
  };

  return (
    <div className="settings-container" ref={menuRef} onKeyDown={handleKeyDown} onBlur={handleBlur}>
      <button
        ref={toggleRef}
        type="button"
        className="settings-btn"
        onClick={() => setIsOpen((open) => !open)}
        aria-label={t.settings}
        aria-expanded={isOpen}
        aria-controls={isOpen ? panelId : undefined}
      >
        <Settings size={20} strokeWidth={1.5} aria-hidden="true" />
      </button>

      {isOpen && (
        <div id={panelId} className="settings-dropdown fade-in">
          <div className="settings-group" role="group" aria-labelledby={languageLabelId}>
            <div id={languageLabelId} className="settings-label"><Globe size={14} aria-hidden="true" /> {t.languageLabel}</div>
            <div className="settings-options">
              <button type="button" lang="zh-CN" aria-pressed={language === "zh-CN"} className={language === "zh-CN" ? "active" : ""} onClick={() => changeLanguage("zh-CN")}>简体</button>
              <button type="button" lang="zh-TW" aria-pressed={language === "zh-TW"} className={language === "zh-TW" ? "active" : ""} onClick={() => changeLanguage("zh-TW")}>繁體</button>
              <button type="button" lang="en" aria-label="English" aria-pressed={language === "en"} className={language === "en" ? "active" : ""} onClick={() => changeLanguage("en")}>EN</button>
            </div>
          </div>
          <div className="settings-divider" aria-hidden="true"></div>
          <div className="settings-group" role="group" aria-labelledby={themeLabelId}>
            <div id={themeLabelId} className="settings-label">{theme === "dark" ? <Moon size={14} aria-hidden="true" /> : <Sun size={14} aria-hidden="true" />} {t.themeLabel}</div>
            <div className="settings-options">
              <button type="button" aria-pressed={theme === "light"} className={theme === "light" ? "active" : ""} onClick={() => toggleTheme("light")}>{t.light}</button>
              <button type="button" aria-pressed={theme === "dark"} className={theme === "dark" ? "active" : ""} onClick={() => toggleTheme("dark")}>{t.dark}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
