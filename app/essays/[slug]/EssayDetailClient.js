"use client";
import Link from "next/link";
import { useSettings } from "../../contexts/SettingsContext";
import SettingsMenu from "../../components/SettingsMenu";
import { format, parseISO } from "date-fns";
import { zhCN, zhTW, enUS } from "date-fns/locale";

export default function EssayDetailClient({ essay, contentHtml }) {
  const { t, language } = useSettings();
  
  const formatDate = (dateString) => {
    try {
      const dateObj = parseISO(dateString);
      if (language === "en") return format(dateObj, "MMM d, yyyy", { locale: enUS });
      if (language === "zh-TW") return format(dateObj, "yyyy年M月d日", { locale: zhTW });
      return format(dateObj, "yyyy年M月d日", { locale: zhCN });
    } catch (e) {
      return dateString;
    }
  };
  
  return (
    <div className="reading-wrapper fade-in">
      <SettingsMenu />
      <nav className="reading-nav">
        <Link href="/" className="back-link">
          <span className="arrow">←</span> {t.backHome.replace('← ', '')}
        </Link>
      </nav>

      <header className="reading-header">
        <h1 className="reading-title">{essay.title}</h1>
        <div className="reading-meta">
          <span className="reading-date">
            {formatDate(essay.date)}
            {essay.author && ` · ${essay.author}`}
          </span>
        </div>
      </header>
      
      <main className="essay-content" dangerouslySetInnerHTML={{ __html: contentHtml }} />
      
      <footer className="reading-footer">
        <div className="reading-divider"></div>
        <p className="end-mark">{t.endMark}</p>
      </footer>
    </div>
  );
}
