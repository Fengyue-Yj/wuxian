"use client";
import Link from "next/link";
import { useSettings } from "../../contexts/SettingsContext";
import SettingsMenu from "../../components/SettingsMenu";
import { formatEssayDate } from "@/lib/formatEssayDate";

export default function EssayDetailClient({ essay, children }) {
  const { t, language } = useSettings();

  return (
    <div className="reading-wrapper fade-in">
      <SettingsMenu />
      <nav className="reading-nav">
        <Link href="/" className="back-link">
          <span className="arrow">←</span> {t.backHome.replace('← ', '')}
        </Link>
      </nav>

      <header className="reading-header">
        <h1 className="reading-title" lang="zh-CN">{essay.title}</h1>
        <div className="reading-meta">
          {essay.date && (
            <time className="reading-date" dateTime={essay.date}>
              {formatEssayDate(essay.date, language)}
            </time>
          )}
          {essay.author && <span lang="zh-CN">{essay.date && " · "}{essay.author}</span>}
        </div>
      </header>

      {children}

      <footer className="reading-footer">
        <div className="reading-divider"></div>
        <p className="end-mark">{t.endMark}</p>
        <Link href="/" className="back-link">{t.backHome}</Link>
      </footer>
    </div>
  );
}
