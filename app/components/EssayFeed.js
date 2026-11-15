"use client";

import { Fragment, useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSettings } from "../contexts/SettingsContext";
import { DayPicker } from "react-day-picker";
import { format, parseISO, isValid } from "date-fns";
import { zhCN, zhTW, enUS } from "date-fns/locale";
import "react-day-picker/dist/style.css";
import { Calendar as CalendarIcon, Check, X } from "lucide-react";

const FALLBACK_LABELS = {
  "zh-CN": {
    clearSearch: "清空并关闭搜索",
    toggleCalendar: "按日期筛选",
    copyFailed: "请手动复制",
  },
  "zh-TW": {
    clearSearch: "清空並關閉搜尋",
    toggleCalendar: "按日期篩選",
    copyFailed: "請手動複製",
  },
  en: {
    clearSearch: "Clear and close search",
    toggleCalendar: "Filter by date",
    copyFailed: "Select to copy",
  },
};

const parseEssayDate = (dateValue) => {
  if (typeof dateValue !== "string") return null;
  const trimmed = dateValue.trim();
  if (!trimmed) return null;
  const parsed = parseISO(trimmed);
  return isValid(parsed) ? parsed : null;
};

export default function EssayFeed({ essays = [] }) {
  const { t, language } = useSettings();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [popupEmail, setPopupEmail] = useState(null);
  const [copyFailed, setCopyFailed] = useState(false);

  const calendarRef = useRef(null);
  const submitWrapperRef = useRef(null);
  const contactWrapperRef = useRef(null);
  const searchInputRef = useRef(null);

  const langFallback = FALLBACK_LABELS[language] || FALLBACK_LABELS["zh-CN"];

  // Close calendar and email popup on click or tap outside
  useEffect(() => {
    function handleClickOutside(event) {
      const target = event.target;
      if (calendarRef.current && !calendarRef.current.contains(target)) {
        setShowCalendar(false);
      }
      const inSubmit = submitWrapperRef.current?.contains(target);
      const inContact = contactWrapperRef.current?.contains(target);
      if (!inSubmit && !inContact) {
        setPopupEmail(null);
        setCopyFailed(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, []);

  // Auto-dismiss email popup after ~2.5s
  useEffect(() => {
    if (!popupEmail) return;
    const timer = setTimeout(() => {
      setPopupEmail(null);
      setCopyFailed(false);
    }, 2500);
    return () => clearTimeout(timer);
  }, [popupEmail]);

  const essayDates = essays
    .map((essay) => parseEssayDate(essay?.date))
    .filter(Boolean);

  const getEssaysOnDay = (day) => {
    if (!day || !isValid(day)) return [];
    const formattedDate = format(day, "yyyy-MM-dd");
    return essays.filter((essay) => {
      const parsed = parseEssayDate(essay?.date);
      return parsed ? format(parsed, "yyyy-MM-dd") === formattedDate : false;
    });
  };

  const handleDayClick = (day) => {
    const essaysOnDay = getEssaysOnDay(day);
    if (essaysOnDay.length === 1 && essaysOnDay[0]?.slug) {
      setShowCalendar(false);
      router.push(`/essays/${essaysOnDay[0].slug}`);
    } else if (essaysOnDay.length > 1) {
      setSearchQuery(format(day, "yyyy-MM-dd"));
      setIsSearching(true);
      setShowCalendar(false);
    }
  };

  const isDayWithEssay = (day) => getEssaysOnDay(day).length > 0;

  const handleCloseSearch = () => {
    setSearchQuery("");
    setShowCalendar(false);
    setIsSearching(false);
  };

  const handleSearchKeyDown = (event) => {
    if (event.key !== "Escape") return;
    event.preventDefault();
    if (showCalendar && document.activeElement !== searchInputRef.current) {
      setShowCalendar(false);
      searchInputRef.current?.focus();
      return;
    }
    handleCloseSearch();
  };

  const handleEmailClick = async (email, e) => {
    e.preventDefault();
    if (popupEmail === email) {
      setPopupEmail(null);
      setCopyFailed(false);
      return;
    }

    let didCopy = false;
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(email);
        didCopy = true;
      }
    } catch {
      didCopy = false;
    }

    setCopyFailed(!didCopy);
    setPopupEmail(email);
  };

  const normalizedQuery = searchQuery.trim().toLowerCase();
  const filteredEssays = essays.filter((essay) => {
    if (!normalizedQuery) return true;
    const title = typeof essay?.title === "string" ? essay.title.toLowerCase() : "";
    const date = typeof essay?.date === "string" ? essay.date.toLowerCase() : "";
    const excerpt = typeof essay?.excerpt === "string" ? essay.excerpt.toLowerCase() : "";
    return (
      title.includes(normalizedQuery) ||
      date.includes(normalizedQuery) ||
      excerpt.includes(normalizedQuery)
    );
  });

  const getLocale = () => {
    if (language === "zh-TW") return zhTW;
    if (language === "en") return enUS;
    return zhCN;
  };

  const formatDate = (dateString) => {
    const dateObj = parseEssayDate(dateString);
    if (!dateObj) return typeof dateString === "string" ? dateString : "";
    if (language === "en") return format(dateObj, "MMM d, yyyy", { locale: enUS });
    if (language === "zh-TW") return format(dateObj, "yyyy年M月d日", { locale: zhTW });
    return format(dateObj, "yyyy年M月d日", { locale: zhCN });
  };

  const emailActions = [
    {
      key: "submit",
      email: "wyc_chn@yeah.net",
      label: t?.submitBtn || "Submit",
      ref: submitWrapperRef,
    },
    {
      key: "contact",
      email: "ycwu25000@gmail.com",
      label: t?.contactBtn || "Contact",
      ref: contactWrapperRef,
    },
  ];

  const clearSearchLabel = t?.clearSearch || langFallback.clearSearch;
  const toggleCalendarLabel = t?.toggleCalendar || langFallback.toggleCalendar;

  return (
    <>
      <div className="divider-nav-wrapper">
        <div className="divider-line"></div>
        <nav className={`main-nav ${isSearching ? "is-searching" : ""}`}>
          <div className="search-container" ref={calendarRef} onKeyDown={handleSearchKeyDown}>
            {isSearching ? (
              <div className="search-input-wrapper">
                <input
                  ref={searchInputRef}
                  type="text"
                  className="search-input"
                  placeholder={t?.searchPlaceholder || ""}
                  aria-label={t?.searchBtn || "Search"}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  autoFocus
                />
                <button
                  type="button"
                  className="calendar-icon-btn"
                  onClick={() => setShowCalendar((prev) => !prev)}
                  aria-label={toggleCalendarLabel}
                  title={toggleCalendarLabel}
                >
                  <CalendarIcon size={16} />
                </button>
                <button
                  type="button"
                  className="search-clear-btn"
                  onClick={handleCloseSearch}
                  aria-label={clearSearchLabel}
                  title={clearSearchLabel}
                >
                  <X size={16} />
                </button>
              </div>
            ) : (
              <button
                type="button"
                className="nav-btn"
                onClick={() => setIsSearching(true)}
              >
                {t?.searchBtn || "Search"}
              </button>
            )}

            {showCalendar && (
              <div className="calendar-popup fade-in">
                <DayPicker
                  mode="single"
                  locale={getLocale()}
                  defaultMonth={essayDates[0]}
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

          {emailActions.map((item) => (
            <Fragment key={item.key}>
              <span
                className={`nav-separator ${
                  item.key === "submit" ? "nav-separator-search" : ""
                }`}
              >
                |
              </span>
              <div className="nav-item-wrapper" ref={item.ref}>
                <button
                  type="button"
                  className="nav-btn"
                  onClick={(e) => handleEmailClick(item.email, e)}
                >
                  {item.label}
                </button>
                {popupEmail === item.email && (
                  <div
                    className="email-popup popup-fade-in"
                    role="status"
                    aria-live="polite"
                  >
                    <span>{popupEmail}</span>
                    <span className={`copy-status ${copyFailed ? "copy-failed" : ""}`}>
                      {copyFailed ? (
                        t?.copyFailed || langFallback.copyFailed
                      ) : (
                        <>
                          <Check size={12} /> {t?.copied || "Copied"}
                        </>
                      )}
                    </span>
                  </div>
                )}
              </div>
            </Fragment>
          ))}
        </nav>
      </div>

      <main className="essay-feed">
        {filteredEssays.map((essay) => (
          <article className="essay-entry" key={essay.slug}>
            <div className="essay-meta">
              <span className="essay-date">
                {formatDate(essay.date)}
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
            {normalizedQuery
              ? t?.noMatch || "No matching essays found."
              : t?.noEssays || "No essays published yet."}
          </p>
        )}
      </main>
    </>
  );
}
