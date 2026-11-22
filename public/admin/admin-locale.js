(() => {
  const initializedKey = "wuxian.admin-locale-initialized";
  const preferencesKey = "sveltia-cms.prefs";

  try {
    if (localStorage.getItem(initializedKey)) return;

    // Sveltia CMS 0.270.1 reads this preference before mounting the app.
    const stored = JSON.parse(localStorage.getItem(preferencesKey));
    const preferences = stored && typeof stored === "object" && !Array.isArray(stored)
      ? stored
      : {};

    if (!preferences.locale || preferences.locale === "auto" || preferences.locale === "en") {
      localStorage.setItem(preferencesKey, JSON.stringify({ ...preferences, locale: "zh-CN" }));
    }
    // Editors can switch back to Automatic or another language in CMS settings.
    localStorage.setItem(initializedKey, "1");
  } catch {
    // The CMS can still start and use its browser-language fallback.
  }
})();
