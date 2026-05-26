"use client";

import { useSettings } from "../contexts/SettingsContext";
import EssayFeed from "./EssayFeed";
import SettingsMenu from "./SettingsMenu";

export default function HomePageContent({ essays }) {
  const { t, language } = useSettings();

  return (
    <div className="layout-wrapper fade-in">
      <SettingsMenu />
      
      <header className="site-header">
        <div className="brand">
          <h1 className="brand-name">{t.brand}</h1>
          <p className="brand-title">{t.brandTitle}</p>
        </div>
      </header>

      <section className="intro-section">
        <div className="intro-text-container">
          <p className={`poem-main ${language === 'en' ? 'poem-cursive' : ''}`}>{t.poem1}</p>
          <p className={`poem-sub ${language === 'en' ? 'poem-sub-zh' : ''}`}>{t.poem2}</p>
        </div>
      </section>

      <EssayFeed essays={essays} />
    </div>
  );
}
