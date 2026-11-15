(function () {
  "use strict";

  const SmartFormat = window.WuxianSmartFormat;
  const ImgOpt = window.WuxianImageOptimizer;
  if (!SmartFormat || !ImgOpt) return;

  const PREFS_KEY = "wuxian-admin-prefs-v1";
  const DEFAULT_PREFS = {
    autoFormatOnPaste: true,
    autoCompressImages: true,
    fetchExternalImages: true,
    aggressiveCaptions: false,
  };

  let prefs = loadPrefs();
  let editorBusy = false;
  let lastUndoMarkdown = null;
  let lastStagingMarkdown = "";
  let lastStagingMeta = null;

  const ui = {
    root: null,
    pill: null,
    pillDot: null,
    pillLabel: null,
    toastStack: null,
    backdrop: null,
    drawer: null,
    authBadge: null,
    statsBox: null,
    warningsBox: null,
    logBox: null,
    undoBtn: null,
    applyMetaBtn: null,
    pasteInput: null,
    writeStagingBtn: null,
    copyStagingBtn: null,
    dropzone: null,
    fileInput: null,
  };

  function loadPrefs() {
    try {
      const raw = localStorage.getItem(PREFS_KEY);
      if (!raw) return { ...DEFAULT_PREFS };
      const parsed = JSON.parse(raw);
      return { ...DEFAULT_PREFS, ...(parsed && typeof parsed === "object" ? parsed : {}) };
    } catch {
      return { ...DEFAULT_PREFS };
    }
  }

  function savePrefs() {
    try {
      localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
    } catch {
      // Ignore storage quota errors
    }
    syncPillState();
  }

  function getGithubSession() {
    const keys = ["sveltia-cms.user", "decap-cms-user", "netlify-cms-user"];
    for (let i = 0; i < keys.length; i += 1) {
      try {
        const raw = localStorage.getItem(keys[i]);
        if (!raw) continue;
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed.token === "string" && parsed.token.trim()) {
          return {
            token: parsed.token.trim(),
            login: parsed.login || parsed.name || "github-user",
            backendName: parsed.backendName || "github",
          };
        }
      } catch {
        // Ignore malformed localStorage entry
      }
    }
    return null;
  }

  function refreshAuthBadge() {
    if (!ui.authBadge) return;
    const session = getGithubSession();
    if (session) {
      ui.authBadge.textContent = `GitHub 已登录 (@${session.login})`;
      ui.authBadge.classList.add("is-ok");
    } else {
      ui.authBadge.textContent = "未登录 GitHub（压缩为本地/轻量 WebP）";
      ui.authBadge.classList.remove("is-ok");
    }
  }

  function syncPillState(busy) {
    if (!ui.pillDot || !ui.pillLabel) return;
    ui.pillDot.classList.remove("is-off", "is-busy");
    if (busy) {
      ui.pillDot.classList.add("is-busy");
      ui.pillLabel.textContent = "处理排版与 WebP 图片中…";
      return;
    }
    const active = prefs.autoFormatOnPaste || prefs.autoCompressImages;
    if (!active) ui.pillDot.classList.add("is-off");
    ui.pillLabel.textContent = active ? "智能排版 · 图片瘦身" : "智能助手 (自动粘贴已关)";
  }

  function showToast(message, level, durationMs) {
    if (!ui.toastStack) return;
    const item = document.createElement("div");
    item.className = "wx-admin-toast";
    if (level === "warn") item.classList.add("is-warn");
    if (level === "error") item.classList.add("is-error");

    const textSpan = document.createElement("span");
    textSpan.textContent = message;
    const closeBtn = document.createElement("button");
    closeBtn.type = "button";
    closeBtn.className = "wx-admin-toast-close";
    closeBtn.textContent = "×";
    closeBtn.setAttribute("aria-label", "关闭提示");
    closeBtn.addEventListener("click", () => item.remove());

    item.appendChild(textSpan);
    item.appendChild(closeBtn);
    ui.toastStack.appendChild(item);

    const ttl = typeof durationMs === "number" ? durationMs : 4200;
    if (ttl > 0) {
      setTimeout(() => {
        if (item.parentNode) item.remove();
      }, ttl);
    }
  }

  function clearLogsAndWarnings() {
    if (ui.statsBox) {
      ui.statsBox.hidden = true;
      ui.statsBox.textContent = "";
    }
    if (ui.warningsBox) {
      ui.warningsBox.hidden = true;
      ui.warningsBox.innerHTML = "";
    }
    if (ui.logBox) {
      ui.logBox.hidden = true;
      ui.logBox.innerHTML = "";
    }
  }

  function renderResultReport(statsText, imageLogs, warnings) {
    if (ui.statsBox && statsText) {
      ui.statsBox.textContent = statsText;
      ui.statsBox.hidden = false;
    }
    if (ui.warningsBox) {
      ui.warningsBox.innerHTML = "";
      if (warnings && warnings.length > 0) {
        for (let i = 0; i < warnings.length; i += 1) {
          const li = document.createElement("li");
          li.textContent = warnings[i];
          ui.warningsBox.appendChild(li);
        }
        ui.warningsBox.hidden = false;
      } else {
        ui.warningsBox.hidden = true;
      }
    }
    if (ui.logBox) {
      ui.logBox.innerHTML = "";
      if (imageLogs && imageLogs.length > 0) {
        for (let i = 0; i < imageLogs.length; i += 1) {
          const entry = imageLogs[i];
          const row = document.createElement("div");
          row.className = "wx-admin-log-item";
          const left = document.createElement("span");
          left.textContent = entry.label;
          const right = document.createElement("span");
          right.textContent = entry.detail;
          row.appendChild(left);
          row.appendChild(right);
          ui.logBox.appendChild(row);
        }
        ui.logBox.hidden = false;
      } else {
        ui.logBox.hidden = true;
      }
    }
  }

  function setNativeFormValue(el, value) {
    if (!el) return;
    const proto =
      el.tagName === "TEXTAREA"
        ? window.HTMLTextAreaElement && window.HTMLTextAreaElement.prototype
        : window.HTMLInputElement && window.HTMLInputElement.prototype;
    const descriptor = proto && Object.getOwnPropertyDescriptor(proto, "value");
    if (descriptor && typeof descriptor.set === "function") {
      descriptor.set.call(el, value);
    } else {
      el.value = value;
    }
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
  }

  function getCurrentTitleValue() {
    const input = document.querySelector('[data-key-path="title"] input, [data-key-path="title"] textarea');
    return input ? String(input.value || "").trim() : "";
  }

  function applyExtractedMetaToFields(meta) {
    if (!meta) return 0;
    let applied = 0;
    const map = [
      { key: "title", selector: '[data-key-path="title"] input, [data-key-path="title"] textarea' },
      { key: "author", selector: '[data-key-path="author"] input, [data-key-path="author"] textarea' },
      { key: "excerpt", selector: '[data-key-path="excerpt"] textarea, [data-key-path="excerpt"] input' },
    ];
    for (let i = 0; i < map.length; i += 1) {
      const val = meta[map[i].key];
      if (!val) continue;
      const el = document.querySelector(map[i].selector);
      if (el && !String(el.value || "").trim()) {
        setNativeFormValue(el, val);
        applied += 1;
      }
    }
    return applied;
  }

  function findBodyEditorRoot() {
    const bodyField = document.querySelector('[data-key-path="body"]');
    if (bodyField) {
      const ed = bodyField.querySelector(".sui.text-editor");
      if (ed) return ed;
    }
    return document.querySelector(".sui.text-editor");
  }

  function isElementVisible(el) {
    if (!el) return false;
    if (el.hidden || el.getAttribute("aria-hidden") === "true") return false;
    if (el.closest("[hidden]")) return false;
    return el.offsetParent !== null;
  }

  function getPlainTextarea(editorRoot) {
    if (!editorRoot) return null;
    const candidates = editorRoot.querySelectorAll('textarea[id$="-plain-text"], .text-area textarea, textarea');
    for (let i = 0; i < candidates.length; i += 1) {
      if (isElementVisible(candidates[i])) return candidates[i];
    }
    return null;
  }

  function getLexicalRoot(editorRoot) {
    if (!editorRoot) return null;
    const el = editorRoot.querySelector('[data-lexical-editor="true"], .lexical-root[contenteditable="true"]');
    return isElementVisible(el) ? el : null;
  }

  function findModeToggleButton(editorRoot) {
    if (!editorRoot) return null;
    const labeled = editorRoot.querySelector(
      'button[aria-pressed][aria-label*="Markdown" i], button[aria-pressed][aria-label*="HTML" i], button[aria-pressed][aria-label*="纯文本"], button[aria-pressed][aria-label*="源码"]'
    );
    if (labeled) return labeled;
    const toolbar = editorRoot.querySelector('[role="toolbar"]') || editorRoot;
    const pressedBtns = toolbar.querySelectorAll("button[aria-pressed]");
    return pressedBtns.length > 0 ? pressedBtns[pressedBtns.length - 1] : null;
  }

  function waitForCondition(checkFn, timeoutMs) {
    return new Promise((resolve) => {
      const start = Date.now();
      function step() {
        const val = checkFn();
        if (val) {
          resolve(val);
          return;
        }
        if (Date.now() - start >= (timeoutMs || 500)) {
          resolve(null);
          return;
        }
        setTimeout(step, 20);
      }
      step();
    });
  }

  function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async function withPlainMarkdownMode(fn) {
    const editorRoot = findBodyEditorRoot();
    if (!editorRoot) {
      throw new Error("未找到正文编辑器，请先在后台打开或新建一篇文章。");
    }
    let ta = getPlainTextarea(editorRoot);
    let toggled = false;
    let toggleBtn = null;

    if (!ta) {
      toggleBtn = findModeToggleButton(editorRoot);
      if (!toggleBtn) {
        throw new Error("无法定位编辑器 Markdown 源码切换按钮。");
      }
      toggleBtn.click();
      toggled = true;
      ta = await waitForCondition(() => getPlainTextarea(editorRoot), 600);
      if (!ta) {
        throw new Error("未能切换到 Markdown 源码模式，请手动点击右上角切换按钮后重试。");
      }
    }

    try {
      return await fn(ta);
    } finally {
      if (toggled && toggleBtn) {
        await delay(50);
        toggleBtn.click();
        await delay(40);
      }
    }
  }

  function escapeHtmlAttr(str) {
    return String(str || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function isSafeHtmlUrl(url) {
    const u = String(url || "").trim();
    if (!u) return false;
    if (/^(?:javascript|vbscript):/i.test(u.replace(/[\u0000-\u0020]+/g, ""))) return false;
    return /^(?:https?:\/\/|\/|data:image\/)/i.test(u);
  }

  function renderInlineSafeHtml(text) {
    let escaped = escapeHtmlAttr(text);
    escaped = escaped.replace(/`([^`]+)`/g, "<code>$1</code>");
    escaped = escaped.replace(/\*\*\*([^*]+)\*\*\*/g, "<strong><em>$1</em></strong>");
    escaped = escaped.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
    escaped = escaped.replace(/\*([^*]+)\*/g, "<em>$1</em>");
    escaped = escaped.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, label, href) => {
      return isSafeHtmlUrl(href) ? `<a href="${escapeHtmlAttr(href)}">${label}</a>` : label;
    });
    return escaped;
  }

  function markdownToSafeHtml(markdown) {
    const blocks = String(markdown || "").split(/\n{2,}/);
    const htmlParts = [];
    for (let i = 0; i < blocks.length; i += 1) {
      const b = blocks[i].trim();
      if (!b) continue;
      if (b === "---") {
        htmlParts.push("<hr />");
        continue;
      }
      if (/^```/.test(b)) {
        const inner = b.replace(/^```[^\n]*\n?/, "").replace(/\n?```$/, "");
        htmlParts.push(`<pre><code>${escapeHtmlAttr(inner)}</code></pre>`);
        continue;
      }
      const imgMatch = b.match(/^!\[([^\]]*)\]\(([^)\s]+)\)$/);
      if (imgMatch && isSafeHtmlUrl(imgMatch[2])) {
        htmlParts.push(`<p><img src="${escapeHtmlAttr(imgMatch[2])}" alt="${escapeHtmlAttr(imgMatch[1])}" /></p>`);
        continue;
      }
      const hMatch = b.match(/^(#{1,4})\s+(.+)$/);
      if (hMatch) {
        const lvl = hMatch[1].length;
        htmlParts.push(`<h${lvl}>${renderInlineSafeHtml(hMatch[2])}</h${lvl}>`);
        continue;
      }
      if (b.startsWith("> ")) {
        const inner = b
          .split("\n")
          .map((l) => renderInlineSafeHtml(l.replace(/^>\s?/, "")))
          .join("<br />");
        htmlParts.push(`<blockquote><p>${inner}</p></blockquote>`);
        continue;
      }
      if (/^[-*+]\s+/.test(b)) {
        const items = b
          .split("\n")
          .map((l) => `<li>${renderInlineSafeHtml(l.replace(/^[-*+]\s+/, ""))}</li>`)
          .join("");
        htmlParts.push(`<ul>${items}</ul>`);
        continue;
      }
      if (/^\d+\.\s+/.test(b)) {
        const items = b
          .split("\n")
          .map((l) => `<li>${renderInlineSafeHtml(l.replace(/^\d+\.\s+/, ""))}</li>`)
          .join("");
        htmlParts.push(`<ol>${items}</ol>`);
        continue;
      }
      htmlParts.push(`<p>${renderInlineSafeHtml(b)}</p>`);
    }
    return htmlParts.join("");
  }

  function insertIntoTextareaAtSelection(ta, textToInsert) {
    const start = typeof ta.selectionStart === "number" ? ta.selectionStart : ta.value.length;
    const end = typeof ta.selectionEnd === "number" ? ta.selectionEnd : ta.value.length;
    const before = ta.value.slice(0, start);
    const after = ta.value.slice(end);
    const sepBefore = before && !before.endsWith("\n\n") ? (before.endsWith("\n") ? "\n" : "\n\n") : "";
    const sepAfter = after && !after.startsWith("\n\n") ? (after.startsWith("\n") ? "\n" : "\n\n") : "";
    const nextVal = before + sepBefore + textToInsert + sepAfter + after;
    setNativeFormValue(ta, nextVal);
    const nextCaret = (before + sepBefore + textToInsert).length;
    try {
      ta.setSelectionRange(nextCaret, nextCaret);
    } catch {
      // Ignore selection range errors on non-focused textarea
    }
  }

  async function optimizeMarkdownImagesInText(markdown, options) {
    const opts = options || {};
    const compressEnabled = opts.compressImages !== false;
    const fetchExternal = Boolean(opts.fetchExternal);
    const session = getGithubSession();
    const imgs = ImgOpt.extractMarkdownImageSources(markdown);

    if (imgs.length === 0 || !compressEnabled) {
      return {
        markdown,
        imageLogs: [],
        warnings: [],
        compressedCount: 0,
        savedBytes: 0,
      };
    }

    const replacementMap = new Map();
    const imageLogs = [];
    const warnings = [];
    let compressedCount = 0;
    let savedBytes = 0;
    const prefix = getCurrentTitleValue() || "essay";
    const seenSrc = new Set();

    const externalQueue = [];

    for (let i = 0; i < imgs.length; i += 1) {
      const item = imgs[i];
      if (seenSrc.has(item.src)) continue;
      seenSrc.add(item.src);

      if (item.isDataUri) {
        const decoded = ImgOpt.dataUriToUint8Array(item.src);
        if (!decoded) continue;
        const origBlob = new Blob([decoded.bytes], { type: decoded.mime });
        try {
          const comp = await ImgOpt.compressBlobToWebp(origBlob, {
            maxWidth: ImgOpt.DEFAULT_MAX_WIDTH,
            maxHeight: ImgOpt.DEFAULT_MAX_HEIGHT,
            quality: ImgOpt.DEFAULT_WEBP_QUALITY,
          });
          const filename = ImgOpt.buildSafeWebpFilename({
            prefix,
            index: i,
            contentHash: comp.contentHash,
            extension: comp.extension,
          });

          if (session && session.token) {
            const up = await ImgOpt.uploadImageToGithub({
              token: session.token,
              filename,
              bytes: comp.bytes,
            });
            if (up.ok) {
              replacementMap.set(item.src, up.publicUrl);
              compressedCount += 1;
              savedBytes += Math.max(0, comp.originalBytes - comp.compressedBytes);
              imageLogs.push({
                label: `${filename} (${comp.width}×${comp.height})`,
                detail: `${ImgOpt.formatBytes(comp.originalBytes)} → ${ImgOpt.formatBytes(comp.compressedBytes)}${up.reused ? " (复用已有)" : " (已上传)"}`,
              });
              continue;
            }
            warnings.push(up.message || `上传 ${filename} 失败，已回退为压缩版内嵌 WebP。`);
          } else {
            warnings.push(`未检测到 GitHub 登录态，图片 ${filename} 已压缩为轻量内嵌 WebP（建议登录后一键转存到 public/images/）。`);
          }

          const compressedDataUri = `data:${comp.mime};base64,${ImgOpt.uint8ArrayToBase64(comp.bytes)}`;
          replacementMap.set(item.src, compressedDataUri);
          compressedCount += 1;
          savedBytes += Math.max(0, comp.originalBytes - comp.compressedBytes);
          imageLogs.push({
            label: `${filename} (内嵌 WebP)`,
            detail: `${ImgOpt.formatBytes(comp.originalBytes)} → ${ImgOpt.formatBytes(comp.compressedBytes)}`,
          });
        } catch (err) {
          warnings.push(`第 ${i + 1} 张内嵌图片压缩失败：${err && err.message ? err.message : "未知错误"}`);
        }
        continue;
      }

      if (item.isExternal && fetchExternal) {
        externalQueue.push({ item, index: i });
      }
    }

    if (externalQueue.length > 0) {
      await Promise.all(
        externalQueue.map(async ({ item, index }) => {
          const fetched = await ImgOpt.fetchExternalImageAsBlob(item.src);
          if (!fetched.ok) {
            warnings.push(fetched.message);
            return;
          }
          try {
            const comp = await ImgOpt.compressBlobToWebp(fetched.blob, {
              maxWidth: ImgOpt.DEFAULT_MAX_WIDTH,
              maxHeight: ImgOpt.DEFAULT_MAX_HEIGHT,
              quality: ImgOpt.DEFAULT_WEBP_QUALITY,
            });
            const filename = ImgOpt.buildSafeWebpFilename({
              prefix,
              index,
              contentHash: comp.contentHash,
              extension: comp.extension,
            });
            if (session && session.token) {
              const up = await ImgOpt.uploadImageToGithub({
                token: session.token,
                filename,
                bytes: comp.bytes,
              });
              if (up.ok) {
                replacementMap.set(item.src, up.publicUrl);
                compressedCount += 1;
                savedBytes += Math.max(0, comp.originalBytes - comp.compressedBytes);
                imageLogs.push({
                  label: `${filename} (外链转存)`,
                  detail: `${ImgOpt.formatBytes(comp.originalBytes)} → ${ImgOpt.formatBytes(comp.compressedBytes)}`,
                });
              } else {
                warnings.push(up.message);
              }
            } else {
              warnings.push(`已抓取外链图片但当前未登录 GitHub，保留原外链：${item.src.slice(0, 60)}...`);
            }
          } catch (err) {
            warnings.push(`外链图片压缩失败：${err && err.message ? err.message : "未知错误"}`);
          }
        })
      );
    }

    const updatedMarkdown = ImgOpt.replaceMarkdownImageSources(markdown, replacementMap);
    return {
      markdown: updatedMarkdown,
      imageLogs,
      warnings,
      compressedCount,
      savedBytes,
    };
  }

  async function processArticlePayload(input, options) {
    const opts = options || {};
    const doFormat = opts.formatText !== false;
    const doImages = opts.compressImages !== false;
    const fetchExternal = opts.fetchExternal !== undefined ? opts.fetchExternal : prefs.fetchExternalImages;

    let formatted;
    if (doFormat) {
      formatted = SmartFormat.smartFormat(input, {
        title: getCurrentTitleValue(),
        aggressiveCaptions: prefs.aggressiveCaptions,
      });
    } else {
      const rawText = typeof input === "string" ? input : input.text || input.html || "";
      formatted = {
        markdown: rawText,
        meta: {},
        images: [],
        stats: {
          inputType: "text",
          headingsConverted: 0,
          captionsFormatted: 0,
          paragraphsUnbolded: 0,
          imagesCleaned: 0,
          nbspRemoved: 0,
          junkLinesRemoved: 0,
          frontmatterStripped: false,
        },
        warnings: [],
      };
    }

    const imgResult = await optimizeMarkdownImagesInText(formatted.markdown, {
      compressImages: doImages,
      fetchExternal,
    });

    const allWarnings = [...(formatted.warnings || []), ...(imgResult.warnings || [])];
    const s = formatted.stats;
    const summaryParts = [];
    if (s.headingsConverted) summaryParts.push(`小标题 ${s.headingsConverted}`);
    if (s.captionsFormatted) summaryParts.push(`图注 ${s.captionsFormatted}`);
    if (s.paragraphsUnbolded) summaryParts.push(`取消整段加粗 ${s.paragraphsUnbolded}`);
    if (s.imagesCleaned) summaryParts.push(`清理哈希alt ${s.imagesCleaned}`);
    if (s.nbspRemoved) summaryParts.push(`清理NBSP ${s.nbspRemoved}`);
    if (imgResult.compressedCount) {
      summaryParts.push(
        `图片WebP ${imgResult.compressedCount} 张${imgResult.savedBytes > 0 ? ` (省 ${ImgOpt.formatBytes(imgResult.savedBytes)})` : ""}`
      );
    }

    const summaryText = summaryParts.length > 0 ? summaryParts.join(" · ") : "格式已规范，未发现需要调整的杂质";
    return {
      markdown: imgResult.markdown,
      meta: formatted.meta,
      stats: formatted.stats,
      summaryText,
      imageLogs: imgResult.imageLogs,
      warnings: allWarnings,
    };
  }

  async function compressAndHandleFiles(files) {
    const session = getGithubSession();
    const prefix = getCurrentTitleValue() || "essay";
    const markdownLines = [];
    const compressedFiles = [];
    const logs = [];
    const warnings = [];
    let totalSaved = 0;

    for (let i = 0; i < files.length; i += 1) {
      const file = files[i];
      if (!/^image\//i.test(file.type || "")) continue;
      try {
        const comp = await ImgOpt.compressFileToWebpFile(file, {
          prefix,
          index: i,
          maxWidth: ImgOpt.DEFAULT_MAX_WIDTH,
          maxHeight: ImgOpt.DEFAULT_MAX_HEIGHT,
          quality: ImgOpt.DEFAULT_WEBP_QUALITY,
        });
        compressedFiles.push(comp);
        totalSaved += Math.max(0, comp.originalBytes - comp.compressedBytes);

        if (session && session.token) {
          const up = await ImgOpt.uploadImageToGithub({
            token: session.token,
            filename: comp.filename,
            bytes: comp.bytes,
          });
          if (up.ok) {
            markdownLines.push(`![](${up.publicUrl})`);
            logs.push({
              label: `${comp.filename} (${comp.width || "?"}×${comp.height || "?"})`,
              detail: `${ImgOpt.formatBytes(comp.originalBytes)} → ${ImgOpt.formatBytes(comp.compressedBytes)} (已上传)`,
            });
            continue;
          }
          warnings.push(up.message);
        }

        logs.push({
          label: `${comp.filename} (${comp.width || "?"}×${comp.height || "?"})`,
          detail: `${ImgOpt.formatBytes(comp.originalBytes)} → ${ImgOpt.formatBytes(comp.compressedBytes)} (待提交)`,
        });
      } catch (err) {
        warnings.push(`图片 ${file.name || i + 1} 压缩失败：${err && err.message ? err.message : "未知错误"}`);
      }
    }

    return { markdownLines, compressedFiles, logs, warnings, totalSaved };
  }

  async function optimizeHtmlImagesOnly(html, options) {
    const opts = options || {};
    if (!html || typeof DOMParser === "undefined") {
      return { html, imageLogs: [], warnings: [], compressedCount: 0, savedBytes: 0 };
    }
    const doc = new DOMParser().parseFromString(html, "text/html");
    const imgEls = Array.from(doc.querySelectorAll("img"));
    if (imgEls.length === 0) {
      return { html, imageLogs: [], warnings: [], compressedCount: 0, savedBytes: 0 };
    }

    const srcList = [];
    const perImgResolved = [];
    for (let i = 0; i < imgEls.length; i += 1) {
      const el = imgEls[i];
      const candidate =
        el.getAttribute("data-src") ||
        el.getAttribute("data-original") ||
        el.getAttribute("data-lazy-src") ||
        el.getAttribute("src") ||
        "";
      perImgResolved.push(candidate.trim());
      if (candidate.trim()) srcList.push(`![](${candidate.trim()})`);
    }
    const optimized = await optimizeMarkdownImagesInText(srcList.join("\n\n"), {
      compressImages: opts.compressImages !== false,
      fetchExternal: Boolean(opts.fetchExternal),
    });
    const outMatches = ImgOpt.extractMarkdownImageSources(optimized.markdown);
    let idx = 0;
    for (let i = 0; i < imgEls.length; i += 1) {
      if (!perImgResolved[i]) continue;
      const next = outMatches[idx];
      idx += 1;
      if (next && next.src && next.src !== perImgResolved[i]) {
        imgEls[i].setAttribute("src", next.src);
        imgEls[i].removeAttribute("data-src");
        imgEls[i].removeAttribute("data-original");
        imgEls[i].removeAttribute("data-lazy-src");
      }
    }
    return {
      html: doc.body ? doc.body.innerHTML : html,
      imageLogs: optimized.imageLogs,
      warnings: optimized.warnings,
      compressedCount: optimized.compressedCount,
      savedBytes: optimized.savedBytes,
    };
  }

  function trySyntheticHtmlPaste(targetEl, html, text) {
    if (!targetEl || typeof DataTransfer === "undefined" || typeof ClipboardEvent === "undefined") {
      return false;
    }
    const lexicalEl =
      targetEl.closest && typeof targetEl.closest === "function"
        ? targetEl.closest('.lexical-root, [data-lexical-editor="true"]') || targetEl
        : targetEl;
    if (!lexicalEl || typeof lexicalEl.dispatchEvent !== "function") return false;
    try {
      const dt = new DataTransfer();
      if (html) dt.setData("text/html", html);
      if (text) dt.setData("text/plain", text);
      const evt = new ClipboardEvent("paste", {
        bubbles: true,
        cancelable: true,
        clipboardData: dt,
      });
      evt.__wuxianHandled = true;
      if (typeof lexicalEl.focus === "function") lexicalEl.focus();
      const beforeSnapshot = lexicalEl.innerHTML;
      const notCanceled = lexicalEl.dispatchEvent(evt);
      return !notCanceled || lexicalEl.innerHTML !== beforeSnapshot;
    } catch {
      return false;
    }
  }

  function dispatchCompressedFilesFallback(targetEl, eventType, files, clientX, clientY) {
    if (!targetEl || typeof targetEl.closest !== "function" || typeof DataTransfer === "undefined") {
      return false;
    }
    // Sveltia CMS only handles image paste/drop when target is inside .lexical-root
    const lexicalEl = targetEl.closest('.lexical-root, [data-lexical-editor="true"]');
    if (!lexicalEl) return false;

    try {
      const dt = new DataTransfer();
      for (let i = 0; i < files.length; i += 1) {
        dt.items.add(files[i].file);
      }
      if (!dt.files || dt.files.length === 0) return false;
      let evt;
      if (eventType === "drop" && typeof DragEvent !== "undefined") {
        evt = new DragEvent("drop", {
          bubbles: true,
          cancelable: true,
          dataTransfer: dt,
          clientX: clientX || 0,
          clientY: clientY || 0,
        });
        if (!evt.dataTransfer || evt.dataTransfer.files.length === 0) return false;
      } else if (typeof ClipboardEvent !== "undefined") {
        evt = new ClipboardEvent("paste", {
          bubbles: true,
          cancelable: true,
          clipboardData: dt,
        });
        if (!evt.clipboardData || evt.clipboardData.files.length === 0) return false;
      }
      if (!evt) return false;
      evt.__wuxianHandled = true;
      const beforeSnapshot = lexicalEl.innerHTML;
      const notCanceled = lexicalEl.dispatchEvent(evt);
      return !notCanceled || lexicalEl.innerHTML !== beforeSnapshot;
    } catch {
      return false;
    }
  }

  async function applyCompressedFilesUploadOrFallback(res, targetEl, eventType, clientX, clientY) {
    if (res.markdownLines.length > 0) {
      await insertMarkdownSmartly(res.markdownLines.join("\n\n"));
      return;
    }
    if (res.compressedFiles.length === 0) return;

    const injected = dispatchCompressedFilesFallback(targetEl, eventType, res.compressedFiles, clientX, clientY);
    if (!injected) {
      const fallbackDataUrls = [];
      for (let i = 0; i < res.compressedFiles.length; i += 1) {
        const c = res.compressedFiles[i];
        fallbackDataUrls.push(`![](data:${c.mime};base64,${ImgOpt.uint8ArrayToBase64(c.bytes)})`);
      }
      await insertMarkdownSmartly(fallbackDataUrls.join("\n\n"));
      res.warnings.push("未检测到 GitHub 登录态，已压缩为轻量 WebP 内嵌（建议登录后自动上传至 public/images/）。");
    }
  }

  async function insertMarkdownSmartly(markdownText) {
    const editorRoot = findBodyEditorRoot();
    if (!editorRoot) throw new Error("未检测到正文编辑器");
    const ta = getPlainTextarea(editorRoot);
    if (ta) {
      insertIntoTextareaAtSelection(ta, markdownText);
      return;
    }
    const lex = getLexicalRoot(editorRoot);
    if (lex) {
      const hasContent = Boolean(lex.textContent.trim() || lex.querySelector("img"));
      if (!hasContent) {
        await withPlainMarkdownMode((plainTa) => {
          setNativeFormValue(plainTa, markdownText);
        });
        return;
      }
      if (trySyntheticHtmlPaste(lex, markdownToSafeHtml(markdownText), markdownText)) {
        return;
      }
    }
    await withPlainMarkdownMode((plainTa) => {
      insertIntoTextareaAtSelection(plainTa, markdownText);
    });
  }

  function isTargetInsideBodyEditor(target) {
    if (!target || typeof target.closest !== "function") return false;
    if (target.closest(".wx-admin-root")) return false;
    const editorRoot = target.closest(".sui.text-editor");
    if (!editorRoot) return false;
    const fieldWrap = editorRoot.closest("[data-key-path]");
    if (fieldWrap && fieldWrap.getAttribute("data-key-path") !== "body") return false;
    return Boolean(target.closest('[data-lexical-editor="true"], textarea[id$="-plain-text"], .text-area textarea'));
  }

  function handleEditorPaste(e) {
    if (e.__wuxianHandled || editorBusy) return;
    if (!prefs.autoFormatOnPaste && !prefs.autoCompressImages) return;
    if (!isTargetInsideBodyEditor(e.target)) return;
    const dt = e.clipboardData;
    if (!dt) return;

    const imageFiles = Array.from(dt.files || []).filter((f) => /^image\//i.test(f.type || ""));
    const html = dt.getData("text/html") || "";
    const text = dt.getData("text/plain") || "";

    // Pure image/screenshot paste (e.g. clipboard image file without rich multi-paragraph article HTML)
    if (imageFiles.length > 0 && !/<(?:p|section|div|h[1-6]|article)\b/i.test(html)) {
      if (!prefs.autoCompressImages) return;
      e.preventDefault();
      e.stopPropagation();
      const targetEl = e.target;
      editorBusy = true;
      syncPillState(true);
      compressAndHandleFiles(imageFiles)
        .then(async (res) => {
          await applyCompressedFilesUploadOrFallback(res, targetEl, "paste");
          renderResultReport(
            `图片 WebP 压缩完成 (${res.compressedFiles.length} 张${res.totalSaved > 0 ? `，节省 ${ImgOpt.formatBytes(res.totalSaved)}` : ""})`,
            res.logs,
            res.warnings
          );
          showToast(
            `已将粘贴图片转为轻量 WebP${res.totalSaved > 0 ? `（节省 ${ImgOpt.formatBytes(res.totalSaved)}）` : ""}`,
            res.warnings.length > 0 ? "warn" : "ok"
          );
        })
        .catch((err) => {
          showToast(`图片自动压缩失败：${err && err.message ? err.message : "请重试"}`, "error", 5500);
        })
        .finally(() => {
          editorBusy = false;
          syncPillState(false);
        });
      return;
    }

    const isTargetInLexical = Boolean(
      e.target && e.target.closest && e.target.closest('.lexical-root, [data-lexical-editor="true"]')
    );
    const hasDataUriInHtml = /data:image\//i.test(html);
    const hasDataUriInText = /!\[[^\]]*\]\(\s*data:image\//i.test(text);
    const hasExternalInHtml =
      prefs.fetchExternalImages &&
      /<img\b[^>]+(?:src|data-src|data-original|data-lazy-src)\s*=\s*["']?(?:https?:)?\/\//i.test(html);
    const hasExternalInText = prefs.fetchExternalImages && /!\[[^\]]*\]\(\s*(?:https?:)?\/\//i.test(text);
    const hasOptimizableImages =
      prefs.autoCompressImages &&
      (isTargetInLexical
        ? hasDataUriInHtml || hasExternalInHtml || hasDataUriInText || hasExternalInText
        : hasDataUriInText || hasExternalInText);

    // If auto-formatting is disabled, ONLY intercept when pasted content has images needing WebP optimization
    if (!prefs.autoFormatOnPaste) {
      if (!hasOptimizableImages) return;
      e.preventDefault();
      e.stopPropagation();
      const targetEl = e.target;
      editorBusy = true;
      syncPillState(true);

      (async () => {
        if (isTargetInLexical && html && /<img\b/i.test(html)) {
          const optHtml = await optimizeHtmlImagesOnly(html, {
            compressImages: true,
            fetchExternal: prefs.fetchExternalImages,
          });
          const pasted = trySyntheticHtmlPaste(targetEl, optHtml.html, text);
          if (!pasted) {
            if (text && /!\[[^\]]*\]\(/i.test(text)) {
              const fallback = await optimizeMarkdownImagesInText(text, {
                compressImages: true,
                fetchExternal: prefs.fetchExternalImages,
              });
              await insertMarkdownSmartly(fallback.markdown);
            } else {
              const fallbackMd =
                SmartFormat && SmartFormat.smartFormat ? SmartFormat.smartFormat(optHtml.html).markdown : text;
              if (fallbackMd) await insertMarkdownSmartly(fallbackMd);
            }
          }
          renderResultReport(
            `图片压缩完成 (${optHtml.compressedCount} 张${optHtml.savedBytes > 0 ? `，节省 ${ImgOpt.formatBytes(optHtml.savedBytes)}` : ""})`,
            optHtml.imageLogs,
            optHtml.warnings
          );
          showToast(
            `图片已压缩为 WebP${optHtml.savedBytes > 0 ? `（节省 ${ImgOpt.formatBytes(optHtml.savedBytes)}）` : ""}`,
            optHtml.warnings.length > 0 ? "warn" : "ok"
          );
          return;
        }

        const optText = await optimizeMarkdownImagesInText(text, {
          compressImages: true,
          fetchExternal: prefs.fetchExternalImages,
        });
        await insertMarkdownSmartly(optText.markdown);
        renderResultReport(
          `图片压缩完成 (${optText.compressedCount} 张${optText.savedBytes > 0 ? `，节省 ${ImgOpt.formatBytes(optText.savedBytes)}` : ""})`,
          optText.imageLogs,
          optText.warnings
        );
        showToast(
          `图片已压缩为 WebP${optText.savedBytes > 0 ? `（节省 ${ImgOpt.formatBytes(optText.savedBytes)}）` : ""}`,
          optText.warnings.length > 0 ? "warn" : "ok"
        );
      })()
        .catch((err) => {
          showToast(`图片优化失败：${err && err.message ? err.message : "请重试"}`, "error", 5500);
        })
        .finally(() => {
          editorBusy = false;
          syncPillState(false);
        });
      return;
    }

    const hasRichTags =
      /<(?:img|h[1-6]|figcaption|figure|blockquote|ul|ol|strong|b)\b|data-src|data:image\/|text-align|font-size/i.test(
        html
      );
    const hasRichTextSignals =
      /data:image\/|\u00A0|!\[[^\]]*\]\(/i.test(text) || text.includes("\n") || text.length >= 60;

    // Let short single-line inline pastes pass natively without interrupting normal typing
    if (!hasRichTags && !hasRichTextSignals) return;

    e.preventDefault();
    e.stopPropagation();
    editorBusy = true;
    syncPillState(true);

    processArticlePayload(
      { html, text },
      {
        formatText: true,
        compressImages: prefs.autoCompressImages,
        fetchExternal: prefs.fetchExternalImages,
      }
    )
      .then(async (res) => {
        await insertMarkdownSmartly(res.markdown);
        if (res.meta && (res.meta.title || res.meta.author || res.meta.excerpt)) {
          lastStagingMeta = res.meta;
          if (ui.applyMetaBtn) ui.applyMetaBtn.disabled = false;
        }
        renderResultReport(res.summaryText, res.imageLogs, res.warnings);
        if (res.warnings.length > 0) {
          showToast(`粘贴排版完成（${res.summaryText}），有 ${res.warnings.length} 条外链/图片提醒，请点右下角查看`, "warn", 6000);
        } else {
          showToast(`智能排版完成：${res.summaryText}`, "ok", 4500);
        }
      })
      .catch((err) => {
        showToast(`自动排版失败：${err && err.message ? err.message : "请打开助手面板重试"}`, "error", 5500);
      })
      .finally(() => {
        editorBusy = false;
        syncPillState(false);
      });
  }

  function handleEditorDrop(e) {
    if (e.__wuxianHandled || editorBusy || !prefs.autoCompressImages) return;
    if (!isTargetInsideBodyEditor(e.target)) return;
    const files = Array.from((e.dataTransfer && e.dataTransfer.files) || []).filter((f) =>
      ImgOpt.isConvertibleMimeType(f.type)
    );
    if (files.length === 0) return;

    e.preventDefault();
    e.stopPropagation();
    const targetEl = e.target;
    const { clientX, clientY } = e;
    editorBusy = true;
    syncPillState(true);

    compressAndHandleFiles(files)
      .then(async (res) => {
        await applyCompressedFilesUploadOrFallback(res, targetEl, "drop", clientX, clientY);
        renderResultReport(
          `拖入图片已压缩为 WebP (${res.compressedFiles.length} 张${res.totalSaved > 0 ? `，节省 ${ImgOpt.formatBytes(res.totalSaved)}` : ""})`,
          res.logs,
          res.warnings
        );
        showToast(
          `拖入图片已压缩为 WebP${res.totalSaved > 0 ? `（节省 ${ImgOpt.formatBytes(res.totalSaved)}）` : ""}`,
          res.warnings.length > 0 ? "warn" : "ok"
        );
      })
      .catch((err) => {
        showToast(`拖入图片压缩失败：${err && err.message ? err.message : "未知错误"}`, "error", 5500);
      })
      .finally(() => {
        editorBusy = false;
        syncPillState(false);
      });
  }

  async function runFormatCurrentEditor() {
    if (editorBusy) return;
    editorBusy = true;
    syncPillState(true);
    try {
      const current = await withPlainMarkdownMode((ta) => ta.value || "");
      if (!current.trim()) {
        throw new Error("当前正文为空，请先粘贴或输入文章内容。");
      }
      const result = await processArticlePayload(current, {
        formatText: true,
        compressImages: true,
        fetchExternal: prefs.fetchExternalImages,
      });

      if (result.markdown !== current) {
        lastUndoMarkdown = current;
        await withPlainMarkdownMode((ta) => {
          setNativeFormValue(ta, result.markdown);
        });
      }

      if (ui.undoBtn) ui.undoBtn.disabled = !lastUndoMarkdown;
      if (result && result.meta && (result.meta.title || result.meta.author || result.meta.excerpt)) {
        lastStagingMeta = result.meta;
        if (ui.applyMetaBtn) ui.applyMetaBtn.disabled = false;
      }
      renderResultReport(result.summaryText, result.imageLogs, result.warnings);
      showToast(`正文排版完成：${result.summaryText}`, result.warnings.length ? "warn" : "ok");
    } catch (err) {
      showToast(err && err.message ? err.message : "正文排版失败", "error", 5500);
    } finally {
      editorBusy = false;
      syncPillState(false);
    }
  }

  async function undoLastEditorFormat() {
    if (editorBusy || lastUndoMarkdown === null) return;
    editorBusy = true;
    syncPillState(true);
    try {
      const snapshot = lastUndoMarkdown;
      await withPlainMarkdownMode((ta) => {
        setNativeFormValue(ta, snapshot);
      });
      lastUndoMarkdown = null;
      if (ui.undoBtn) ui.undoBtn.disabled = true;
      showToast("已恢复到排版前的正文内容", "ok");
    } catch (err) {
      showToast(err && err.message ? err.message : "撤销失败", "error");
    } finally {
      editorBusy = false;
      syncPillState(false);
    }
  }

  function openDrawer() {
    refreshAuthBadge();
    if (ui.backdrop) ui.backdrop.classList.add("is-open");
    if (ui.drawer) ui.drawer.classList.add("is-open");
  }

  function closeDrawer() {
    if (ui.backdrop) ui.backdrop.classList.remove("is-open");
    if (ui.drawer) ui.drawer.classList.remove("is-open");
  }

  function createToggleControl(prefKey, title, subtitle) {
    const label = document.createElement("label");
    label.className = "wx-admin-toggle";
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = Boolean(prefs[prefKey]);
    checkbox.addEventListener("change", () => {
      prefs[prefKey] = checkbox.checked;
      savePrefs();
    });
    const textWrap = document.createElement("span");
    const mainText = document.createElement("span");
    mainText.textContent = title;
    const subText = document.createElement("small");
    subText.textContent = subtitle;
    textWrap.appendChild(mainText);
    textWrap.appendChild(subText);
    label.appendChild(checkbox);
    label.appendChild(textWrap);
    return label;
  }

  function buildAssistantUi() {
    if (document.querySelector(".wx-admin-root")) return;

    const root = document.createElement("div");
    root.className = "wx-admin-root";

    const toastStack = document.createElement("div");
    toastStack.className = "wx-admin-toast-stack";
    toastStack.setAttribute("aria-live", "polite");

    const pill = document.createElement("button");
    pill.type = "button";
    pill.className = "wx-admin-pill";
    pill.setAttribute("aria-label", "打开智能排版与图片瘦身面板");
    const pillDot = document.createElement("span");
    pillDot.className = "wx-admin-pill-dot";
    const pillLabel = document.createElement("span");
    pill.appendChild(pillDot);
    pill.appendChild(pillLabel);
    pill.addEventListener("click", openDrawer);

    const backdrop = document.createElement("div");
    backdrop.className = "wx-admin-backdrop";
    backdrop.addEventListener("click", closeDrawer);

    const drawer = document.createElement("aside");
    drawer.className = "wx-admin-drawer";
    drawer.setAttribute("aria-label", "智能排版与图片瘦身助手");

    const head = document.createElement("div");
    head.className = "wx-admin-drawer-head";
    const headLeft = document.createElement("div");
    const titleEl = document.createElement("h2");
    titleEl.className = "wx-admin-drawer-title";
    titleEl.textContent = "智能排版与图片瘦身";
    const subEl = document.createElement("div");
    subEl.className = "wx-admin-drawer-sub";
    subEl.textContent = "自动识别小标题 / 图注 / 杂质，并将大图转为轻量 WebP";
    headLeft.appendChild(titleEl);
    headLeft.appendChild(subEl);

    const closeBtn = document.createElement("button");
    closeBtn.type = "button";
    closeBtn.className = "wx-admin-close-btn";
    closeBtn.textContent = "收起";
    closeBtn.addEventListener("click", closeDrawer);

    head.appendChild(headLeft);
    head.appendChild(closeBtn);

    const body = document.createElement("div");
    body.className = "wx-admin-drawer-body";

    // Card 1: Current editor & automation settings
    const cardEditor = document.createElement("section");
    cardEditor.className = "wx-admin-card";
    const cardEditorTitle = document.createElement("h3");
    cardEditorTitle.className = "wx-admin-card-title";
    const cardEditorTitleText = document.createElement("span");
    cardEditorTitleText.textContent = "一、当前文章一键处理与粘贴增强";
    const authBadge = document.createElement("span");
    authBadge.className = "wx-admin-auth-badge";
    cardEditorTitle.appendChild(cardEditorTitleText);
    cardEditorTitle.appendChild(authBadge);

    cardEditor.appendChild(cardEditorTitle);
    cardEditor.appendChild(
      createToggleControl(
        "autoFormatOnPaste",
        "粘贴文章时自动识别并排版",
        "支持微信公众平台、Word、飞书、Notion 富文本及纯文本"
      )
    );
    cardEditor.appendChild(
      createToggleControl(
        "autoCompressImages",
        "自动将复制/拖入的图片转为 WebP（≤1600px, 质量 0.82）",
        "避免上 MB 的 Base64 写入文章，登录 GitHub 后直接上传至 public/images/"
      )
    );
    cardEditor.appendChild(
      createToggleControl(
        "fetchExternalImages",
        "粘贴外链图片时尝试自动抓取并转存 WebP",
        "若遇到微信公众号等防盗链/CORS 限制会明确提示具体图片链接"
      )
    );
    cardEditor.appendChild(
      createToggleControl(
        "aggressiveCaptions",
        "严格模式：将图片下方短段落（≤90字）均识别为图注",
        "适合从纯文本粘贴多图游记/田野调查文章"
      )
    );

    const btnRowEditor = document.createElement("div");
    btnRowEditor.className = "wx-admin-btn-row";
    const formatCurrentBtn = document.createElement("button");
    formatCurrentBtn.type = "button";
    formatCurrentBtn.className = "wx-admin-btn is-primary";
    formatCurrentBtn.textContent = "一键优化当前正文";
    formatCurrentBtn.addEventListener("click", runFormatCurrentEditor);

    const undoBtn = document.createElement("button");
    undoBtn.type = "button";
    undoBtn.className = "wx-admin-btn";
    undoBtn.textContent = "撤销上次正文排版";
    undoBtn.disabled = true;
    undoBtn.addEventListener("click", undoLastEditorFormat);

    const applyMetaBtn = document.createElement("button");
    applyMetaBtn.type = "button";
    applyMetaBtn.className = "wx-admin-btn";
    applyMetaBtn.textContent = "填入提取的标题/作者/摘要";
    applyMetaBtn.disabled = true;
    applyMetaBtn.addEventListener("click", () => {
      if (!lastStagingMeta) return;
      const count = applyExtractedMetaToFields(lastStagingMeta);
      showToast(count > 0 ? `已自动填入 ${count} 个空白顶部字段` : "顶部字段已有内容，未覆盖", "ok");
    });

    btnRowEditor.appendChild(formatCurrentBtn);
    btnRowEditor.appendChild(undoBtn);
    btnRowEditor.appendChild(applyMetaBtn);
    cardEditor.appendChild(btnRowEditor);

    // Card 2: Smart paste staging workbench
    const cardPaste = document.createElement("section");
    cardPaste.className = "wx-admin-card";
    const cardPasteTitle = document.createElement("h3");
    cardPasteTitle.className = "wx-admin-card-title";
    cardPasteTitle.textContent = "二、粘贴板工作台（先预览再写入）";

    const pasteInput = document.createElement("textarea");
    pasteInput.className = "wx-admin-paste-box";
    pasteInput.placeholder =
      "直接在此 Ctrl+V 粘贴微信文章 / Word / 飞书内容或原始 Markdown，立即生成规范小标题（##）、图注（*图注*）与压缩图片…";

    const btnRowPaste = document.createElement("div");
    btnRowPaste.className = "wx-admin-btn-row";
    const runStagingBtn = document.createElement("button");
    runStagingBtn.type = "button";
    runStagingBtn.className = "wx-admin-btn";
    runStagingBtn.textContent = "整理上方文本";

    const writeStagingBtn = document.createElement("button");
    writeStagingBtn.type = "button";
    writeStagingBtn.className = "wx-admin-btn is-primary";
    writeStagingBtn.textContent = "覆盖写入正文编辑器";
    writeStagingBtn.disabled = true;

    const copyStagingBtn = document.createElement("button");
    copyStagingBtn.type = "button";
    copyStagingBtn.className = "wx-admin-btn";
    copyStagingBtn.textContent = "复制整理结果";
    copyStagingBtn.disabled = true;

    async function handleStagingInput(payload) {
      if (editorBusy) return;
      editorBusy = true;
      syncPillState(true);
      try {
        const res = await processArticlePayload(payload, {
          formatText: true,
          compressImages: true,
          fetchExternal: prefs.fetchExternalImages,
        });
        lastStagingMarkdown = res.markdown;
        pasteInput.value = res.markdown;
        writeStagingBtn.disabled = !res.markdown;
        copyStagingBtn.disabled = !res.markdown;
        if (res.meta && (res.meta.title || resultHasMeta(res.meta))) {
          lastStagingMeta = res.meta;
          applyMetaBtn.disabled = false;
        }
        renderResultReport(res.summaryText, res.imageLogs, res.warnings);
      } catch (err) {
        showToast(err && err.message ? err.message : "工作台处理失败", "error");
      } finally {
        editorBusy = false;
        syncPillState(false);
      }
    }

    pasteInput.addEventListener("paste", (ev) => {
      const dt = ev.clipboardData;
      if (!dt) return;
      const imageFiles = Array.from(dt.files || []).filter((f) => /^image\//i.test(f.type || ""));
      const html = dt.getData("text/html") || "";
      const text = dt.getData("text/plain") || "";
      if (imageFiles.length > 0 && !/<(?:p|section|div|h[1-6]|article)\b/i.test(html)) {
        ev.preventDefault();
        processSelectedBatchFiles(imageFiles);
        return;
      }
      if (html || text) {
        ev.preventDefault();
        handleStagingInput({ html, text });
      }
    });

    runStagingBtn.addEventListener("click", () => {
      if (!pasteInput.value.trim()) {
        showToast("请先粘贴文章内容", "warn");
        return;
      }
      handleStagingInput(pasteInput.value);
    });

    writeStagingBtn.addEventListener("click", async () => {
      const md = pasteInput.value || lastStagingMarkdown;
      if (!md.trim()) return;
      try {
        await withPlainMarkdownMode((ta) => {
          lastUndoMarkdown = ta.value || "";
          setNativeFormValue(ta, md);
        });
        undoBtn.disabled = !lastUndoMarkdown;
        showToast("已写入正文编辑器并同步至可视化视图", "ok");
      } catch (err) {
        showToast(err && err.message ? err.message : "写入失败", "error");
      }
    });

    copyStagingBtn.addEventListener("click", async () => {
      const md = pasteInput.value || lastStagingMarkdown;
      if (!md) return;
      try {
        await navigator.clipboard.writeText(md);
        showToast("已复制整理后的 Markdown", "ok");
      } catch {
        pasteInput.select();
        showToast("剪贴板权限受限，请按 Ctrl+C 复制上方框内文本", "warn");
      }
    });

    btnRowPaste.appendChild(runStagingBtn);
    btnRowPaste.appendChild(writeStagingBtn);
    btnRowPaste.appendChild(copyStagingBtn);
    cardPaste.appendChild(cardPasteTitle);
    cardPaste.appendChild(pasteInput);
    cardPaste.appendChild(btnRowPaste);

    // Card 3: Batch image converter
    const cardBatch = document.createElement("section");
    cardBatch.className = "wx-admin-card";
    const cardBatchTitle = document.createElement("h3");
    cardBatchTitle.className = "wx-admin-card-title";
    cardBatchTitle.textContent = "三、批量图片转 WebP（拖入或选择多张大图）";

    const fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.accept = "image/*";
    fileInput.multiple = true;
    fileInput.hidden = true;

    const dropzone = document.createElement("div");
    dropzone.className = "wx-admin-dropzone";
    dropzone.textContent = "点击选择或将多张 JPG / PNG / BMP 图片拖放到此处，自动压缩为 ≤1600px WebP 并插入正文";
    dropzone.addEventListener("click", () => fileInput.click());

    async function processSelectedBatchFiles(fileList) {
      const files = Array.from(fileList || []).filter((f) => /^image\//i.test(f.type || ""));
      if (files.length === 0) {
        showToast("未检测到可处理的图片文件", "warn");
        return;
      }
      if (editorBusy) return;
      editorBusy = true;
      syncPillState(true);
      try {
        const res = await compressAndHandleFiles(files);
        renderResultReport(
          `批量处理 ${res.compressedFiles.length} 张图片（节省 ${ImgOpt.formatBytes(res.totalSaved)}）`,
          res.logs,
          res.warnings
        );
        if (res.markdownLines.length > 0) {
          const joined = res.markdownLines.join("\n\n");
          pasteInput.value = pasteInput.value ? `${pasteInput.value}\n\n${joined}` : joined;
          writeStagingBtn.disabled = false;
          copyStagingBtn.disabled = false;
          try {
            await insertMarkdownSmartly(joined);
            showToast(`已压缩上传 ${res.markdownLines.length} 张 WebP 并插入正文`, "ok");
          } catch {
            showToast(`已压缩上传 ${res.markdownLines.length} 张 WebP，请从上方工作台复制插入`, "ok");
          }
        } else if (res.compressedFiles.length > 0) {
          // Offer download of compressed files when not authenticated
          for (let i = 0; i < res.compressedFiles.length; i += 1) {
            const c = res.compressedFiles[i];
            const url = URL.createObjectURL(c.blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = c.filename;
            document.body.appendChild(a);
            a.click();
            a.remove();
            setTimeout(() => URL.revokeObjectURL(url), 4000);
          }
          showToast(`已将 ${res.compressedFiles.length} 张图片压缩为 WebP 并下载到本地`, "warn", 5000);
        }
      } finally {
        editorBusy = false;
        syncPillState(false);
        fileInput.value = "";
      }
    }

    fileInput.addEventListener("change", () => processSelectedBatchFiles(fileInput.files));
    dropzone.addEventListener("dragover", (ev) => {
      ev.preventDefault();
      dropzone.classList.add("is-dragover");
    });
    dropzone.addEventListener("dragleave", () => dropzone.classList.remove("is-dragover"));
    dropzone.addEventListener("drop", (ev) => {
      ev.preventDefault();
      dropzone.classList.remove("is-dragover");
      processSelectedBatchFiles(ev.dataTransfer && ev.dataTransfer.files);
    });

    cardBatch.appendChild(cardBatchTitle);
    cardBatch.appendChild(fileInput);
    cardBatch.appendChild(dropzone);

    // Output boxes
    const statsBox = document.createElement("div");
    statsBox.className = "wx-admin-stats";
    statsBox.hidden = true;

    const warningsBox = document.createElement("ul");
    warningsBox.className = "wx-admin-warnings";
    warningsBox.hidden = true;

    const logBox = document.createElement("div");
    logBox.className = "wx-admin-log";
    logBox.hidden = true;

    body.appendChild(cardEditor);
    body.appendChild(cardPaste);
    body.appendChild(cardBatch);
    body.appendChild(statsBox);
    body.appendChild(warningsBox);
    body.appendChild(logBox);

    drawer.appendChild(head);
    drawer.appendChild(body);

    root.appendChild(toastStack);
    root.appendChild(pill);
    root.appendChild(backdrop);
    root.appendChild(drawer);
    document.body.appendChild(root);

    ui.root = root;
    ui.pill = pill;
    ui.pillDot = pillDot;
    ui.pillLabel = pillLabel;
    ui.toastStack = toastStack;
    ui.backdrop = backdrop;
    ui.drawer = drawer;
    ui.authBadge = authBadge;
    ui.statsBox = statsBox;
    ui.warningsBox = warningsBox;
    ui.logBox = logBox;
    ui.undoBtn = undoBtn;
    ui.applyMetaBtn = applyMetaBtn;
    ui.pasteInput = pasteInput;
    ui.writeStagingBtn = writeStagingBtn;
    ui.copyStagingBtn = copyStagingBtn;
    ui.dropzone = dropzone;
    ui.fileInput = fileInput;

    refreshAuthBadge();
    syncPillState(false);
    clearLogsAndWarnings();
  }

  function resultHasMeta(meta) {
    return Boolean(meta && (meta.title || meta.author || meta.date || meta.excerpt));
  }

  function registerSveltiaPreSaveHook() {
    if (!window.CMS || typeof window.CMS.registerEventListener !== "function") return;
    try {
      window.CMS.registerEventListener({
        name: "preSave",
        handler: async ({ entry }) => {
          if (!entry || typeof entry.getIn !== "function") return entry;
          const body = entry.getIn(["data", "body"]);
          if (typeof body !== "string" || !/!\[[^\]]*\]\(\s*data:image\//i.test(body)) {
            return entry;
          }
          syncPillState(true);
          try {
            const res = await optimizeMarkdownImagesInText(body, {
              compressImages: true,
              fetchExternal: false,
            });
            if (res.compressedCount > 0) {
              showToast(`保存前已自动压缩上传 ${res.compressedCount} 张内嵌大图为 WebP`, "ok");
              return entry.setIn(["data", "body"], res.markdown);
            }
          } catch (err) {
            showToast(`保存前图片压缩提示：${err && err.message ? err.message : "请检查图片"}`, "warn", 5000);
          } finally {
            syncPillState(false);
          }
          return entry;
        },
      });
    } catch {
      // Ignore if CMS event listener API differs
    }
  }

  function init() {
    buildAssistantUi();
    document.addEventListener("paste", handleEditorPaste, true);
    document.addEventListener("drop", handleEditorDrop, true);
    window.addEventListener("storage", refreshAuthBadge);
    window.addEventListener("focus", refreshAuthBadge);
    document.addEventListener("keydown", (ev) => {
      if (ev.key === "Escape" && ui.drawer && ui.drawer.classList.contains("is-open")) {
        closeDrawer();
      }
    });
    registerSveltiaPreSaveHook();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
