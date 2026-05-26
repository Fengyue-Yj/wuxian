"use client";
import Link from "next/link";
import { useSettings } from "../../contexts/SettingsContext";
import SettingsMenu from "../../components/SettingsMenu";
import { format, parseISO } from "date-fns";
import { zhCN, zhTW, enUS } from "date-fns/locale";
import { ReactCusdis } from "react-cusdis";

export default function EssayDetailClient({ essay, contentHtml }) {
  const { t, language, theme } = useSettings();

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
        
        {/* Clean, official ReactCusdis integration with no hacks */}
        <div className="comments-section" style={{ marginTop: '4rem', width: '100%' }}>
          <ReactCusdis
            attrs={{
              host: 'https://cusdis.com',
              appId: 'cebdd209-f404-44a9-8181-6d4c1eafcf94',
              pageId: essay.slug,
              pageTitle: essay.title,
              pageUrl: `https://Fengyue-Yj.github.io/wuxian/essays/${essay.slug}`,
              theme: theme === 'dark' ? 'dark' : 'light'
            }}
          />
        </div>
      </footer>
    </div>
  );
}
