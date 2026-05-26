"use client";

import { useState, useRef, useEffect } from "react";
import { useSettings } from "../contexts/SettingsContext";
import { Settings, Moon, Sun, Globe } from "lucide-react";

export default function SettingsMenu() {
  const { language, changeLanguage, theme, toggleTheme } = useSettings();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="settings-container" ref={menuRef}>
      <button className="settings-btn" onClick={() => setIsOpen(!isOpen)} aria-label="Settings">
        <Settings size={20} strokeWidth={1.5} />
      </button>

      {isOpen && (
        <div className="settings-dropdown fade-in">
          <div className="settings-group">
            <div className="settings-label"><Globe size={14} /> Language / 语言</div>
            <div className="settings-options">
              <button className={language === "zh-CN" ? "active" : ""} onClick={() => changeLanguage("zh-CN")}>简体</button>
              <button className={language === "zh-TW" ? "active" : ""} onClick={() => changeLanguage("zh-TW")}>繁體</button>
              <button className={language === "en" ? "active" : ""} onClick={() => changeLanguage("en")}>EN</button>
            </div>
          </div>
          <div className="settings-divider"></div>
          <div className="settings-group">
            <div className="settings-label">{theme === "dark" ? <Moon size={14}/> : <Sun size={14}/>} Mode / 模式</div>
            <div className="settings-options">
              <button className={theme === "light" ? "active" : ""} onClick={() => toggleTheme("light")}>日间</button>
              <button className={theme === "dark" ? "active" : ""} onClick={() => toggleTheme("dark")}>夜间</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
