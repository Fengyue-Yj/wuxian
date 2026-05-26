"use client";
import Link from "next/link";
import { useSettings } from "../../contexts/SettingsContext";
import SettingsMenu from "../../components/SettingsMenu";
import { format, parseISO } from "date-fns";
import { zhCN, zhTW, enUS } from "date-fns/locale";

import Script from "next/script";
import { useEffect } from "react";

export default function EssayDetailClient({ essay, contentHtml }) {
  const { t, language, theme } = useSettings();

  useEffect(() => {
    // Listen for Cusdis resize events to fix mobile scrolling cleanly
    const handleCusdisMessage = (e) => {
      try {
        const msg = typeof e.data === 'string' ? JSON.parse(e.data) : e.data;
        if (msg.from === 'cusdis' && msg.event === 'resize') {
          const iframe = document.querySelector('#cusdis_thread iframe');
          if (iframe) {
            // Add a static buffer to the calculated height to prevent mobile scrollbars
            iframe.style.height = (parseInt(msg.data) + 30) + 'px';
            iframe.setAttribute('scrolling', 'no');
            iframe.style.overflow = 'hidden';
          }
        }
      } catch (err) {
        // Ignore JSON parse errors from other extensions
      }
    };
    
    window.addEventListener('message', handleCusdisMessage);
    return () => window.removeEventListener('message', handleCusdisMessage);
  }, []);
  
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
        
        <div style={{ marginTop: '4rem', textAlign: 'left', minHeight: '300px' }}>
          <div 
            id="cusdis_thread"
            data-host="https://cusdis.com"
            data-app-id="cebdd209-f404-44a9-8181-6d4c1eafcf94"
            data-page-id={essay.slug}
            data-page-url={`https://Fengyue-Yj.github.io/wuxian/essays/${essay.slug}`}
            data-page-title={essay.title}
            data-theme={theme === 'dark' ? 'dark' : 'auto'}
            style={{ width: '100%' }}
          ></div>
          <Script src="https://cusdis.com/js/cusdis.es.js" strategy="lazyOnload" />
        </div>
      </footer>
    </div>
  );
}
