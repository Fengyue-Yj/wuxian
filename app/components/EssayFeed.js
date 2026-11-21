"use client";

import { Fragment, useState, useRef, useEffect, useId } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSettings } from "../contexts/SettingsContext";
import { formatEssayDate } from "@/lib/formatEssayDate";
import { Calendar as CalendarIcon, Check, X } from "lucide-react";

const EssayCalendar = dynamic(() => import("./EssayCalendar"), { ssr: false });

export default function EssayFeed({ essays = [] }) {
  const { t, language } = useSettings();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [popupEmail, setPopupEmail] = useState(null);
  const [copyFailed, setCopyFailed] = useState(false);

  const searchRef = useRef(null);
  const searchButtonRef = useRef(null);
  const calendarButtonRef = useRef(null);
  const submitWrapperRef = useRef(null);
  const contactWrapperRef = useRef(null);
  const searchInputRef = useRef(null);
  const restoreSearchFocus = useRef(false);
  const copyRequest = useRef(0);
  const calendarId = useId();

  // Close calendar and email popup on click or tap outside
  useEffect(() => {
    function handleClickOutside(event) {
      const target = event.target;
      if (searchRef.current && !searchRef.current.contains(target)) {
        setShowCalendar(false);
      }
      const inSubmit = submitWrapperRef.current?.contains(target);
      const inContact = contactWrapperRef.current?.contains(target);
      if (!inSubmit && !inContact) {
        copyRequest.current++;
        setPopupEmail(null);
        setCopyFailed(false);
      }
    }

    document.addEventListener("pointerdown", handleClickOutside);
    return () => document.removeEventListener("pointerdown", handleClickOutside);
  }, []);

  // Leave the address available for manual copying if the clipboard failed.
  useEffect(() => {
    if (!popupEmail || copyFailed) return;
    const timer = setTimeout(() => {
      setPopupEmail(null);
    }, 2500);
    return () => clearTimeout(timer);
  }, [popupEmail, copyFailed]);

  useEffect(() => {
    if (isSearching) {
      searchInputRef.current?.focus();
    } else if (restoreSearchFocus.current) {
      searchButtonRef.current?.focus();
      restoreSearchFocus.current = false;
    }
  }, [isSearching]);

  const handleSelectDate = (date) => {
    const essaysOnDay = essays.filter((essay) => essay.date === date);
    setShowCalendar(false);
    if (essaysOnDay.length === 1) {
      router.push(`/essays/${encodeURIComponent(essaysOnDay[0].slug)}`);
      return;
    }
    setSearchQuery(date);
    searchInputRef.current?.focus();
  };

  const handleCloseSearch = () => {
    restoreSearchFocus.current = true;
    setSearchQuery("");
    setShowCalendar(false);
    setIsSearching(false);
  };

  const handleSearchKeyDown = (event) => {
    if (event.key !== "Escape" || !isSearching) return;
    event.preventDefault();
    if (showCalendar) {
      setShowCalendar(false);
      calendarButtonRef.current?.focus();
      return;
    }
    handleCloseSearch();
  };

  const handleEmailClick = async (email) => {
    const request = ++copyRequest.current;
    if (popupEmail === email) {
      setPopupEmail(null);
      setCopyFailed(false);
      return;
    }

    let didCopy = false;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(email);
        didCopy = true;
      }
    } catch {
      didCopy = false;
    }

    if (request !== copyRequest.current) return;
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

  const hasDatedEssays = essays.some((essay) => essay.date);

  return (
    <>
      <div className="divider-nav-wrapper">
        <div className="divider-line"></div>
        <nav className={`main-nav ${isSearching ? "is-searching" : ""}`}>
          <div className="search-container" ref={searchRef} onKeyDown={handleSearchKeyDown}>
            {isSearching ? (
              <div className="search-input-wrapper">
                <input
                  ref={searchInputRef}
                  type="search"
                  className="search-input"
                  placeholder={t?.searchPlaceholder || ""}
                  aria-label={t?.searchBtn || "Search"}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                {hasDatedEssays && (
                  <button
                    ref={calendarButtonRef}
                    type="button"
                    className="calendar-icon-btn"
                    onClick={() => setShowCalendar((prev) => !prev)}
                    aria-label={t.toggleCalendar}
                    title={t.toggleCalendar}
                    aria-expanded={showCalendar}
                    aria-controls={showCalendar ? calendarId : undefined}
                  >
                    <CalendarIcon size={16} aria-hidden="true" />
                  </button>
                )}
                <button
                  type="button"
                  className="search-clear-btn"
                  onClick={handleCloseSearch}
                  aria-label={t.clearSearch}
                  title={t.clearSearch}
                >
                  <X size={16} aria-hidden="true" />
                </button>
              </div>
            ) : (
              <button
                ref={searchButtonRef}
                type="button"
                className="nav-btn"
                onClick={() => setIsSearching(true)}
              >
                {t?.searchBtn || "Search"}
              </button>
            )}

            {showCalendar && (
              <div id={calendarId} className="calendar-popup fade-in">
                <EssayCalendar
                  essays={essays}
                  language={language}
                  searchQuery={normalizedQuery}
                  onSelectDate={handleSelectDate}
                />
              </div>
            )}
          </div>

          {emailActions.map((item) => (
            <Fragment key={item.key}>
              <span
                aria-hidden="true"
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
                  onClick={() => handleEmailClick(item.email)}
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
                        t.copyFailed
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
              {essay.date && (
                <time className="essay-date" dateTime={essay.date}>
                  {formatEssayDate(essay.date, language)}
                </time>
              )}
              {essay.date && <span className="essay-dash" aria-hidden="true">—</span>}
            </div>
            <div className="essay-content-preview">
              <Link href={`/essays/${encodeURIComponent(essay.slug)}`} prefetch={false}>
                <h2 className="essay-title">{essay.title}</h2>
              </Link>
              <p className="essay-excerpt">{essay.excerpt}</p>
            </div>
          </article>
        ))}
        {filteredEssays.length === 0 && (
          <p className="no-essays" role="status">
            {normalizedQuery
              ? t?.noMatch || "No matching essays found."
              : t?.noEssays || "No essays published yet."}
          </p>
        )}
      </main>
    </>
  );
}
