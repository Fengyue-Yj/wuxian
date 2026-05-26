"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSettings } from "../contexts/SettingsContext";
import { DayPicker } from "react-day-picker";
import { format, parseISO } from "date-fns";
import { zhCN, zhTW, enUS } from "date-fns/locale";
import "react-day-picker/dist/style.css";
import { Calendar as CalendarIcon, Check } from "lucide-react";

export default function EssayFeed({ essays }) {
  const { t, language } = useSettings();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [popupEmail, setPopupEmail] = useState(null);
  
  const calendarRef = useRef(null);

  // Close calendar if click outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (calendarRef.current && !calendarRef.current.contains(event.target)) {
        setShowCalendar(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const essayDates = essays.map(essay => parseISO(essay.date));
  
  const handleDayClick = (day) => {
    const formattedDate = format(day, "yyyy-MM-dd");
    const essaysOnDay = essays.filter(e => e.date === formattedDate);
    
    if (essaysOnDay.length === 1) {
      router.push(`/essays/${essaysOnDay[0].slug}`);
    } else if (essaysOnDay.length > 1) {
      setSearchQuery(formattedDate);
      setIsSearching(true);
      setShowCalendar(false);
    }
  };

  const isDayWithEssay = (day) => {
    const formattedDate = format(day, "yyyy-MM-dd");
    return essays.some(e => e.date === formattedDate);
  };

  const handleEmailClick = (email, e) => {
    e.preventDefault();
    navigator.clipboard.writeText(email);
    setPopupEmail(email);
  };

  const filteredEssays = essays.filter((essay) => {
    const query = searchQuery.toLowerCase();
    return (
      essay.title.toLowerCase().includes(query) ||
      essay.date.includes(query)
    );
  });

  const getLocale = () => {
    if (language === "zh-TW") return zhTW;
    if (language === "en") return enUS;
    return zhCN;
  };

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
    <>
      <div className="divider-nav-wrapper">
        <div className="divider-line"></div>
        <nav className="main-nav">
          <div className="search-container" ref={calendarRef}>
            {isSearching ? (
              <div className="search-input-wrapper">
                <input
                  type="text"
                  className="search-input"
                  placeholder={t.searchPlaceholder}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  autoFocus
                />
                <button className="calendar-icon-btn" onClick={() => setShowCalendar(!showCalendar)}>
                  <CalendarIcon size={16} />
                </button>
              </div>
            ) : (
              <button className="nav-btn" onClick={() => setIsSearching(true)}>
                {t.searchBtn}
              </button>
            )}
            
            {showCalendar && (
              <div className="calendar-popup fade-in">
                <DayPicker 
                  mode="single"
                  locale={getLocale()}
                  modifiers={{ hasEssay: essayDates }}
                  modifiersClassNames={{ hasEssay: "day-has-essay" }}
                  onDayClick={(day) => {
                    if (isDayWithEssay(day)) {
                      handleDayClick(day);
                    }
                  }}
                  disabled={(date) => !isDayWithEssay(date)}
                />
              </div>
            )}
          </div>
          
          <span className="nav-separator">|</span>
          <div className="nav-item-wrapper" onMouseLeave={() => setPopupEmail(null)}>
            <button className="nav-btn" onClick={(e) => handleEmailClick("wyc_chn@yeah.net", e)}>
              {t.submitBtn}
            </button>
            {popupEmail === "wyc_chn@yeah.net" && (
              <div className="email-popup popup-fade-in">
                <span>{popupEmail}</span>
                <span className="copy-status"><Check size={12}/> {t.copied}</span>
              </div>
            )}
          </div>
          
          <span className="nav-separator">|</span>
          <div className="nav-item-wrapper" onMouseLeave={() => setPopupEmail(null)}>
            <button className="nav-btn" onClick={(e) => handleEmailClick("ycwu25000@gmail.com", e)}>
              {t.contactBtn}
            </button>
            {popupEmail === "ycwu25000@gmail.com" && (
              <div className="email-popup popup-fade-in">
                <span>{popupEmail}</span>
                <span className="copy-status"><Check size={12}/> {t.copied}</span>
              </div>
            )}
          </div>
        </nav>
      </div>

      <main className="essay-feed">
        {filteredEssays.map((essay) => (
          <article className="essay-entry" key={essay.slug}>
            <div className="essay-meta">
              <span className="essay-date">
                {formatDate(essay.date)}
                {essay.author && ` · ${essay.author}`}
              </span>
              <span className="essay-dash">—</span>
            </div>
            <div className="essay-content-preview">
              <Link href={`/essays/${essay.slug}`}>
                <h2 className="essay-title">{essay.title}</h2>
              </Link>
              <p className="essay-excerpt">{essay.excerpt}</p>
            </div>
          </article>
        ))}
        {filteredEssays.length === 0 && (
          <p className="no-essays">
            {searchQuery ? t.noMatch : t.noEssays}
          </p>
        )}
      </main>
    </>
  );
}
