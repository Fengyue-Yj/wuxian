"use client";

import dynamic from "next/dynamic";
import { useSettings } from "../contexts/SettingsContext";
import styles from "./EssayComments.module.css";

const Giscus = dynamic(() => import("@giscus/react"), { ssr: false });

export default function EssayComments({ slug }) {
  const { t, language, theme } = useSettings();

  return (
    <section className={styles.section} aria-labelledby="essay-comments-heading">
      <h2 id="essay-comments-heading">{t.commentsHeading}</h2>
      <p>{t.commentsSignIn}</p>
      <Giscus
        id="essay-comments"
        repo="Fengyue-Yj/wuxian"
        repoId="R_kgDOSoKAFg"
        category="Announcements"
        categoryId="DIC_kwDOSoKAFs4DLten"
        mapping="specific"
        term={`随笔：${slug}`}
        strict="1"
        reactionsEnabled="0"
        inputPosition="top"
        theme={theme === "dark" ? "transparent_dark" : "light"}
        lang={language}
        loading="lazy"
      />
    </section>
  );
}
