(function (root, factory) {
  const api = factory();
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
  if (root && typeof root === "object") {
    root.WuxianSmartFormat = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const VOID_TAGS = new Set([
    "area",
    "base",
    "br",
    "col",
    "embed",
    "hr",
    "img",
    "input",
    "link",
    "meta",
    "param",
    "source",
    "track",
    "wbr",
  ]);

  const STRIP_CONTENT_TAGS = new Set([
    "head",
    "noscript",
    "script",
    "style",
    "svg",
    "template",
    "xml",
  ]);

  const BLOCK_TAGS = new Set([
    "address",
    "article",
    "aside",
    "blockquote",
    "dd",
    "details",
    "div",
    "dl",
    "dt",
    "fieldset",
    "figcaption",
    "figure",
    "footer",
    "form",
    "h1",
    "h2",
    "h3",
    "h4",
    "h5",
    "h6",
    "header",
    "hr",
    "li",
    "main",
    "nav",
    "ol",
    "p",
    "pre",
    "section",
    "summary",
    "table",
    "tbody",
    "td",
    "tfoot",
    "th",
    "thead",
    "tr",
    "ul",
  ]);

  const HTML_ENTITY_MAP = {
    amp: "&",
    apos: "'",
    bull: "•",
    copy: "©",
    deg: "°",
    divide: "÷",
    emsp: " ",
    ensp: " ",
    gt: ">",
    hellip: "…",
    laquo: "«",
    ldquo: "“",
    lsquo: "‘",
    lt: "<",
    mdash: "—",
    middot: "·",
    nbsp: "\u00A0",
    ndash: "–",
    plusmn: "±",
    quot: '"',
    raquo: "»",
    rdquo: "”",
    reg: "®",
    rsquo: "’",
    thinsp: " ",
    times: "×",
    trade: "™",
    zwj: "",
    zwnj: "",
  };

  const WECHAT_JUNK_LINE_RE =
    /^(?:原创|预览时标签不可点|继续滑动看下一个|轻触阅读原文|向上滑动看下一个|阅读原文|微信扫一扫|使用小程序|在小说阅读器中沉浸阅读|关注该公众号|收录于合集.*|喜欢此内容的人还喜欢|赞赏作者|Scan QR Code|Follow us|javascript:;)$/i;

  const MD5_OR_GARBAGE_ALT_RE =
    /^(?:[0-9a-f]{16,64}(?:\.[a-z0-9]{2,5})?|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}(?:\.[a-z0-9]{2,5})?|\d{2,16}(?:\.[a-z0-9]{2,5})?|image(?:\d+)?(?:\.[a-z0-9]+)?|img[_-]?\d+(?:\.[a-z0-9]+)?|pic[_-]?\d+(?:\.[a-z0-9]+)?|photo[_-]?\d+(?:\.[a-z0-9]+)?|wps[_-]?(?:doc|image)?[_-]?\d*(?:\.[a-z0-9]+)?|mmexport\d+(?:\.[a-z0-9]+)?|blob|图片\d*|插图\d*|配图\d*|未命名(?:图片)?)$/i;

  const EXPLICIT_CAPTION_RE =
    /^(?:图\s*[注说片名题]?\s*[:：]|图为|图[一二三四五六七八九十0-9]+\s*[:：]|配图\s*[:：]?|插图\s*[:：]?|附图\s*[:：]?|图源\s*[:：]|图片来源\s*[:：]|摄影\s*[:：]|摄于\s*[:：]?|左图|右图|上图|下图|左\s*[:：]|右\s*[:：]|上\s*[:：]|下\s*[:：]|[▲▼△▽●◆■★]\s*\S|Fig(?:ure)?\.?\s*\d*\s*[:：.]|Photo\s*(?:by|credit)?\s*[:：])/i;

  const CAPTION_CREDIT_SUFFIX_RE =
    /[（(]\s*(?:摄影|图源|图片来自|图片来源|供图|摄于|资料图|受访者供图|视觉中国|图)\s*(?:[:：][^）)]*)?[）)]\s*$/;

  const CAPTION_DEICTIC_RE =
    /^(?:这方|这张|这幅|这座|这组|这棵|这两|这一|每一张|照片|画面|图中|此图|镜头|右图|左图|上图|下图)/;

  const CAPTION_CUE_WORDS_RE =
    /(?:（(?:左|右|中|前排|后排|摄影|供图)[^）]*）|\((?:left|right|photo|credit)[^)]*\)|旧址|合影|调研|碑文|铭刻|牌位|拍摄)/i;

  const TRAILING_SENTENCE_PUNCT_RE = /[。！？.!?；;…—][”’"」』）)]*$/;

  const TOP_CREDIT_META_RE =
    /^(title|标题|题目|author|作者|撰文|撰稿|编辑|责编|date|日期|发布日期|发布时间|时间|excerpt|摘要|简介|导语|来源|出处)\s*[:：]\s*(.+)$/i;

  const WECHAT_DATE_BAR_RE =
    /^\d{4}[-年/.]\d{1,2}[-月/.]\d{1,2}日?(?:\s+\d{1,2}:\d{2}(?::\d{2})?)?$/;

  const PROVINCE_LOCATION_RE =
    /^(?:北京|上海|天津|重庆|河北|山西|辽宁|吉林|黑龙江|江苏|浙江|安徽|福建|江西|山东|河南|湖北|湖南|广东|海南|四川|贵州|云南|陕西|甘肃|青海|台湾|内蒙古|广西|西藏|宁夏|新疆|香港|澳门|中国|美国|英国|新加坡|马来西亚|日本|海外)$/;

  const HOTLINK_RISK_HOST_RE =
    /(?:qpic\.cn|qlogo\.cn|weixin\.qq\.com|byteimg\.com|feishu\.cn|larksuite\.com|notion\.so|notion-static\.com|zhimg\.com|sinaimg\.cn|126\.net|bcebos\.com|alicdn\.com)/i;

  function decodeHtmlEntities(str) {
    if (!str || str.indexOf("&") === -1) return str || "";
    return str.replace(/&(#x[0-9a-f]+|#\d+|[a-z][a-z0-9]+);/gi, (full, entity) => {
      const lower = entity.toLowerCase();
      if (lower.startsWith("#x")) {
        const cp = parseInt(lower.slice(2), 16);
        return Number.isFinite(cp) && cp > 0 && cp <= 0x10ffff ? String.fromCodePoint(cp) : full;
      }
      if (lower.startsWith("#")) {
        const cp = parseInt(lower.slice(1), 10);
        return Number.isFinite(cp) && cp > 0 && cp <= 0x10ffff ? String.fromCodePoint(cp) : full;
      }
      return Object.prototype.hasOwnProperty.call(HTML_ENTITY_MAP, lower)
        ? HTML_ENTITY_MAP[lower]
        : full;
    });
  }

  function cleanUnicodeSpaces(str, stats) {
    if (!str) return "";
    let nbspCount = 0;
    let out = str.replace(/\u00A0/g, () => {
      nbspCount += 1;
      return " ";
    });
    if (stats && nbspCount > 0) {
      stats.nbspRemoved += nbspCount;
    }
    out = out.replace(/[\u200B-\u200D\u2060\uFEFF]/g, "");
    return out;
  }

  function stripTrailingMarkdownSpaces(str) {
    return String(str || "")
      .replace(/^[\t \u3000\u00A0]+/, "")
      .replace(/[\t \u3000\u00A0]+$/, "");
  }

  function parseStyleString(styleStr) {
    const map = {};
    if (!styleStr) return map;
    const parts = String(styleStr).split(";");
    for (let i = 0; i < parts.length; i += 1) {
      const part = parts[i];
      const colonIdx = part.indexOf(":");
      if (colonIdx === -1) continue;
      const key = part.slice(0, colonIdx).trim().toLowerCase();
      const val = part.slice(colonIdx + 1).trim();
      if (key) map[key] = val;
    }
    return map;
  }

  function parseAttributes(attrStr) {
    const attrs = {};
    if (!attrStr) return attrs;
    const re = /([a-zA-Z0-9:_-]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
    let match;
    while ((match = re.exec(attrStr)) !== null) {
      const name = match[1].toLowerCase();
      const rawVal = match[2] !== undefined ? match[2] : match[3] !== undefined ? match[3] : match[4] !== undefined ? match[4] : "";
      attrs[name] = decodeHtmlEntities(rawVal);
    }
    return attrs;
  }

  function parseHtmlNodes(html) {
    const cleaned = String(html || "")
      .replace(/<!--[\s\S]*?-->/g, "")
      .replace(/<!\[CDATA\[[\s\S]*?\]\]>/g, "")
      .replace(/<!DOCTYPE[^>]*>/gi, "")
      .replace(/<(head|script|style|noscript|template|xml)\b[^>]*>[\s\S]*?<\/\1>/gi, "");

    const rootNode = { type: "element", tag: "root", attrs: {}, style: {}, children: [] };
    const stack = [rootNode];
    const tokenRe = /<(\/?)([a-zA-Z][a-zA-Z0-9:_-]*)((?:[^>"']|"[^"]*"|'[^']*')*)>|([^<]+)/g;
    let match;

    while ((match = tokenRe.exec(cleaned)) !== null) {
      if (match[4] !== undefined) {
        const text = decodeHtmlEntities(match[4]);
        if (text) {
          stack[stack.length - 1].children.push({ type: "text", text });
        }
        continue;
      }

      const isClosing = match[1] === "/";
      const tag = match[2].toLowerCase();
      const attrRaw = match[3] || "";
      const selfClosing = /\/\s*$/.test(attrRaw) || VOID_TAGS.has(tag);

      if (isClosing) {
        for (let i = stack.length - 1; i > 0; i -= 1) {
          if (stack[i].tag === tag) {
            stack.length = i;
            break;
          }
        }
        continue;
      }

      // Auto-close unclosed p before another block element, or li before another li
      const top = stack[stack.length - 1];
      if (top.tag === "p" && BLOCK_TAGS.has(tag)) {
        stack.pop();
      } else if (top.tag === "li" && tag === "li") {
        stack.pop();
      }

      const attrs = parseAttributes(attrRaw);
      const style = parseStyleString(attrs.style || "");
      const node = {
        type: "element",
        tag,
        attrs,
        style,
        children: [],
      };
      stack[stack.length - 1].children.push(node);

      if (!selfClosing) {
        stack.push(node);
      }
    }

    return rootNode;
  }

  function isHiddenElement(node) {
    if (!node || node.type !== "element") return false;
    if (STRIP_CONTENT_TAGS.has(node.tag)) return true;
    const style = node.style || {};
    if (style.display === "none" || style.visibility === "hidden") return true;
    const cls = String(node.attrs.class || "").toLowerCase();
    const id = String(node.attrs.id || "").toLowerCase();
    if (
      /\b(?:rich_media_tool|qr_code_pc|mp-common-profile|wx_profile_card|js_tags|reward_area|original_primary_card)\b/.test(
        cls + " " + id
      )
    ) {
      return true;
    }
    return false;
  }

  function parseFontSizePx(val) {
    if (!val) return null;
    const str = String(val).trim().toLowerCase();
    const m = str.match(/^(\d+(?:\.\d+)?)\s*(px|pt|em|rem)$/);
    if (!m) return null;
    const num = parseFloat(m[1]);
    if (!Number.isFinite(num)) return null;
    if (m[2] === "px") return num;
    if (m[2] === "pt") return num * 1.3333;
    if (m[2] === "em" || m[2] === "rem") return num * 16;
    return null;
  }

  function isMutedColor(colorStr) {
    if (!colorStr) return false;
    const c = String(colorStr).trim().toLowerCase();
    const hex6 = c.match(/^#([0-9a-f]{6})$/);
    if (hex6) {
      const r = parseInt(hex6[1].slice(0, 2), 16);
      const g = parseInt(hex6[1].slice(2, 4), 16);
      const b = parseInt(hex6[1].slice(4, 6), 16);
      const maxDiff = Math.max(r, g, b) - Math.min(r, g, b);
      const lum = (r + g + b) / 3;
      return maxDiff <= 30 && lum >= 95 && lum <= 215;
    }
    const hex3 = c.match(/^#([0-9a-f]{3})$/);
    if (hex3) {
      const r = parseInt(hex3[1][0] + hex3[1][0], 16);
      const g = parseInt(hex3[1][1] + hex3[1][1], 16);
      const b = parseInt(hex3[1][2] + hex3[1][2], 16);
      const maxDiff = Math.max(r, g, b) - Math.min(r, g, b);
      const lum = (r + g + b) / 3;
      return maxDiff <= 30 && lum >= 95 && lum <= 215;
    }
    const rgba = c.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*([\d.]+))?\s*\)$/);
    if (rgba) {
      const r = parseInt(rgba[1], 10);
      const g = parseInt(rgba[2], 10);
      const b = parseInt(rgba[3], 10);
      const a = rgba[4] !== undefined ? parseFloat(rgba[4]) : 1;
      if (a <= 0.72) return true;
      const maxDiff = Math.max(r, g, b) - Math.min(r, g, b);
      const lum = (r + g + b) / 3;
      return maxDiff <= 30 && lum >= 95 && lum <= 215;
    }
    if (c === "gray" || c === "grey" || c === "darkgray" || c === "silver") return true;
    return false;
  }

  function resolveImageSrc(attrs) {
    if (!attrs) return "";
    const candidates = [
      attrs["data-src"],
      attrs["data-original"],
      attrs["data-lazy-src"],
      attrs["data-actualsrc"],
      attrs["data-url"],
      attrs.src,
    ];
    let fallback = "";
    for (let i = 0; i < candidates.length; i += 1) {
      const val = String(candidates[i] || "").trim();
      if (!val) continue;
      if (/^data:image\/svg\+xml/i.test(val) || /^about:blank/i.test(val)) {
        if (!fallback) fallback = val;
        continue;
      }
      return val;
    }
    return fallback;
  }

  function cleanImageAlt(alt, stats) {
    const trimmed = stripTrailingMarkdownSpaces(cleanUnicodeSpaces(alt || "", stats));
    if (!trimmed) return "";
    if (MD5_OR_GARBAGE_ALT_RE.test(trimmed)) {
      if (stats) stats.imagesCleaned += 1;
      return "";
    }
    return trimmed.replace(/[\[\]]/g, "");
  }

  function getFontWeightFlag(node, inheritedBold) {
    const tag = node.tag;
    const style = node.style || {};
    const fw = String(style["font-weight"] || "").trim().toLowerCase();
    if (fw) {
      if (fw === "normal" || fw === "lighter") return false;
      const num = parseInt(fw, 10);
      if (Number.isFinite(num)) return num >= 600;
      if (fw === "bold" || fw === "bolder") return true;
    }
    if (tag === "strong" || tag === "b") {
      // Google Docs wraps entire copy in <b id="docs-internal-guid-..." style="font-weight:normal;">
      if (String(node.attrs.id || "").startsWith("docs-internal-guid-")) {
        return false;
      }
      return true;
    }
    return inheritedBold;
  }

  function getItalicFlag(node, inheritedItalic) {
    const tag = node.tag;
    const style = node.style || {};
    const fs = String(style["font-style"] || "").trim().toLowerCase();
    if (fs) {
      if (fs === "normal") return false;
      if (fs === "italic" || fs === "oblique") return true;
    }
    if (tag === "em" || tag === "i" || tag === "cite") return true;
    return inheritedItalic;
  }

  function computeStyleHint(node, parentHint) {
    const hint = {
      centered: parentHint.centered,
      muted: parentHint.muted,
      smallFont: parentHint.smallFont,
      largeFont: parentHint.largeFont,
      captionClass: parentHint.captionClass,
      headingClass: parentHint.headingClass,
      bold: getFontWeightFlag(node, parentHint.bold),
      italic: getItalicFlag(node, parentHint.italic),
    };
    const style = node.style || {};
    const align = String(style["text-align"] || node.attrs.align || "").trim().toLowerCase();
    if (align === "center") hint.centered = true;
    else if (align === "left" || align === "right" || align === "justify") hint.centered = false;

    if (style.color) {
      hint.muted = isMutedColor(style.color);
    }

    const px = parseFontSizePx(style["font-size"]);
    if (px !== null) {
      if (px <= 14.2) {
        hint.smallFont = true;
        hint.largeFont = false;
      } else if (px >= 18) {
        hint.largeFont = true;
        hint.smallFont = false;
      } else {
        hint.smallFont = false;
        hint.largeFont = false;
      }
    }
    if (node.tag === "small") hint.smallFont = true;

    const cls = String(node.attrs.class || "").toLowerCase();
    if (/(?:caption|figcaption|img[-_]?desc|pic[-_]?desc|photo[-_]?note|img[-_]?note|subtitle)/.test(cls)) {
      hint.captionClass = true;
    }
    if (/(?:msoheading|msotitle|heading)/.test(cls)) {
      hint.headingClass = true;
    }
    return hint;
  }

  function hasBlockChildren(node) {
    if (!node || !node.children) return false;
    for (let i = 0; i < node.children.length; i += 1) {
      const child = node.children[i];
      if (child.type === "element") {
        if (BLOCK_TAGS.has(child.tag) || hasBlockChildren(child)) {
          return true;
        }
      }
    }
    return false;
  }

  function extractInlineRuns(node, hint, stats, outRuns) {
    if (!node) return;
    if (node.type === "text") {
      const text = cleanUnicodeSpaces(node.text, stats).replace(/\s*\n\s*/g, " ");
      if (text) {
        outRuns.push({
          type: "text",
          text,
          bold: hint.bold,
          italic: hint.italic,
          muted: hint.muted,
          smallFont: hint.smallFont,
          largeFont: hint.largeFont,
        });
      }
      return;
    }
    if (node.type !== "element" || isHiddenElement(node)) return;

    if (node.tag === "br") {
      outRuns.push({ type: "br" });
      return;
    }
    if (node.tag === "img") {
      const src = resolveImageSrc(node.attrs);
      if (src) {
        outRuns.push({
          type: "img",
          src,
          alt: cleanImageAlt(node.attrs.alt || node.attrs.title || "", stats),
        });
      }
      return;
    }
    if (node.tag === "code") {
      const codeText = collectPlainText(node, stats).replace(/\n+/g, " ").trim();
      if (codeText) {
        outRuns.push({ type: "code", text: codeText });
      }
      return;
    }
    if (node.tag === "a") {
      const href = String(node.attrs.href || "").trim();
      const childRuns = [];
      const nextHint = computeStyleHint(node, hint);
      for (let i = 0; i < node.children.length; i += 1) {
        extractInlineRuns(node.children[i], nextHint, stats, childRuns);
      }
      // If link wraps an image or has invalid javascript: href, keep inner runs unwrapped
      const hasImg = childRuns.some((r) => r.type === "img");
      const linkText = childRuns
        .filter((r) => r.type === "text")
        .map((r) => r.text)
        .join("")
        .trim();
      if (!href || href === "#" || /^javascript:/i.test(href) || hasImg || !linkText) {
        for (let i = 0; i < childRuns.length; i += 1) outRuns.push(childRuns[i]);
      } else if (linkText === href) {
        outRuns.push({ type: "text", text: href, bold: hint.bold, italic: hint.italic });
      } else {
        outRuns.push({
          type: "link",
          href,
          runs: childRuns,
        });
      }
      return;
    }

    const nextHint = computeStyleHint(node, hint);
    for (let i = 0; i < node.children.length; i += 1) {
      extractInlineRuns(node.children[i], nextHint, stats, outRuns);
    }
  }

  function collectPlainText(node, stats) {
    if (!node) return "";
    if (node.type === "text") return cleanUnicodeSpaces(node.text, stats);
    if (node.type !== "element" || isHiddenElement(node)) return "";
    if (node.tag === "br") return "\n";
    let out = "";
    for (let i = 0; i < node.children.length; i += 1) {
      out += collectPlainText(node.children[i], stats);
    }
    return out;
  }

  function runsToMarkdownAndMeta(runs) {
    let md = "";
    let totalChars = 0;
    let boldChars = 0;
    let italicChars = 0;
    let mutedChars = 0;
    let smallChars = 0;
    let largeChars = 0;

    function formatRunSpan(text, bold, italic) {
      const lead = text.match(/^\s*/)[0];
      const trail = text.match(/\s*$/)[0];
      const core = text.slice(lead.length, text.length - trail.length);
      if (!core) return text;
      if (bold && italic) return `${lead}***${core}***${trail}`;
      if (bold) return `${lead}**${core}**${trail}`;
      if (italic) return `${lead}*${core}*${trail}`;
      return text;
    }

    // Coalesce consecutive text runs with identical bold/italic
    const merged = [];
    for (let i = 0; i < runs.length; i += 1) {
      const r = runs[i];
      if (r.type === "text") {
        const len = r.text.replace(/\s+/g, "").length;
        totalChars += len;
        if (r.bold) boldChars += len;
        if (r.italic) italicChars += len;
        if (r.muted) mutedChars += len;
        if (r.smallFont) smallChars += len;
        if (r.largeFont) largeChars += len;
        const prev = merged[merged.length - 1];
        if (prev && prev.type === "text" && prev.bold === r.bold && prev.italic === r.italic) {
          prev.text += r.text;
          continue;
        }
      }
      merged.push({ ...r });
    }

    for (let i = 0; i < merged.length; i += 1) {
      const r = merged[i];
      if (r.type === "text") {
        md += formatRunSpan(r.text, r.bold, r.italic);
      } else if (r.type === "code") {
        const codeLen = r.text.length;
        totalChars += codeLen;
        md += "`" + r.text.replace(/`/g, "\\`") + "`";
      } else if (r.type === "link") {
        const inner = runsToMarkdownAndMeta(r.runs);
        totalChars += inner.totalChars;
        md += `[${inner.text.trim()}](${r.href})`;
      }
    }

    // Merge zero-width touching bold markers like **a****b** -> **ab**, preserving whitespace between distinct bold spans
    md = md.replace(/\*\*\*\*/g, "");

    return {
      text: stripTrailingMarkdownSpaces(md),
      totalChars,
      allBold: totalChars > 0 && boldChars / totalChars >= 0.92,
      allItalic: totalChars > 0 && italicChars / totalChars >= 0.92,
      mostlyMuted: totalChars > 0 && mutedChars / totalChars >= 0.75,
      mostlySmall: totalChars > 0 && smallChars / totalChars >= 0.75,
      mostlyLarge: totalChars > 0 && largeChars / totalChars >= 0.75,
    };
  }

  function splitRunsIntoBlocks(runs, blockHint, stats, outBlocks, extraProps) {
    // Split on <img> or <br> boundaries cleanly so images and <br>-separated lines become blocks
    let currentRuns = [];

    function flushCurrent() {
      if (currentRuns.length === 0) return;
      const meta = runsToMarkdownAndMeta(currentRuns);
      currentRuns = [];
      if (!meta.text) return;
      outBlocks.push({
        kind: "paragraph",
        text: meta.text,
        allBold: meta.allBold || blockHint.bold,
        allItalic: meta.allItalic || blockHint.italic,
        centered: blockHint.centered,
        muted: blockHint.muted || meta.mostlyMuted,
        smallFont: blockHint.smallFont || meta.mostlySmall,
        largeFont: blockHint.largeFont || meta.mostlyLarge,
        captionClass: blockHint.captionClass,
        headingClass: blockHint.headingClass,
        ...(extraProps || {}),
      });
    }

    for (let i = 0; i < runs.length; i += 1) {
      const r = runs[i];
      if (r.type === "img") {
        flushCurrent();
        outBlocks.push({
          kind: "image",
          src: r.src,
          alt: r.alt || "",
        });
      } else if (r.type === "br") {
        flushCurrent();
      } else {
        currentRuns.push(r);
      }
    }
    flushCurrent();
  }

  function extractBlocksFromAst(node, parentHint, stats, outBlocks, context) {
    if (!node) return;
    if (node.type === "text") {
      const t = stripTrailingMarkdownSpaces(cleanUnicodeSpaces(node.text, stats));
      if (t) {
        outBlocks.push({
          kind: "paragraph",
          text: t,
          allBold: parentHint.bold,
          allItalic: parentHint.italic,
          centered: parentHint.centered,
          muted: parentHint.muted,
          smallFont: parentHint.smallFont,
          largeFont: parentHint.largeFont,
          captionClass: parentHint.captionClass,
          headingClass: parentHint.headingClass,
          ...(context || {}),
        });
      }
      return;
    }
    if (node.type !== "element" || isHiddenElement(node)) return;

    const hint = computeStyleHint(node, parentHint);
    const tag = node.tag;

    if (tag === "hr") {
      outBlocks.push({ kind: "hr" });
      return;
    }

    if (tag === "img") {
      const src = resolveImageSrc(node.attrs);
      if (src) {
        outBlocks.push({
          kind: "image",
          src,
          alt: cleanImageAlt(node.attrs.alt || node.attrs.title || "", stats),
        });
      }
      return;
    }

    if (tag === "pre") {
      const rawCode = collectPlainText(node, stats).replace(/^\n+|\n+$/g, "");
      if (rawCode.trim()) {
        outBlocks.push({ kind: "code", text: rawCode });
      }
      return;
    }

    if (tag === "h1" || tag === "h2" || tag === "h3" || tag === "h4") {
      const runs = [];
      extractInlineRuns(node, { ...hint, bold: false }, stats, runs);
      const beforeCount = outBlocks.length;
      splitRunsIntoBlocks(runs, { ...hint, bold: false }, stats, outBlocks, {
        htmlHeadingTag: tag,
      });
      // Mark the extracted text blocks as explicit html headings
      for (let i = beforeCount; i < outBlocks.length; i += 1) {
        if (outBlocks[i].kind === "paragraph") {
          outBlocks[i].isHtmlHeading = true;
        }
      }
      return;
    }

    if (tag === "figcaption") {
      const runs = [];
      extractInlineRuns(node, { ...hint, bold: false, italic: false }, stats, runs);
      const beforeCount = outBlocks.length;
      splitRunsIntoBlocks(runs, { ...hint, bold: false, italic: false }, stats, outBlocks, {
        isHtmlCaption: true,
      });
      for (let i = beforeCount; i < outBlocks.length; i += 1) {
        if (outBlocks[i].kind === "paragraph") {
          outBlocks[i].isHtmlCaption = true;
        }
      }
      return;
    }

    if (tag === "blockquote") {
      const innerBlocks = [];
      for (let i = 0; i < node.children.length; i += 1) {
        extractBlocksFromAst(node.children[i], hint, stats, innerBlocks, context);
      }
      for (let i = 0; i < innerBlocks.length; i += 1) {
        const b = innerBlocks[i];
        if (b.kind === "paragraph") {
          b.inBlockquote = true;
        }
        outBlocks.push(b);
      }
      return;
    }

    if (tag === "ul" || tag === "ol") {
      const ordered = tag === "ol";
      let idx = 1;
      for (let i = 0; i < node.children.length; i += 1) {
        const child = node.children[i];
        if (child.type === "element" && child.tag === "li") {
          const itemBlocks = [];
          extractBlocksFromAst(child, hint, stats, itemBlocks, {
            listType: ordered ? "ol" : "ul",
            listIndex: idx,
          });
          for (let j = 0; j < itemBlocks.length; j += 1) {
            outBlocks.push(itemBlocks[j]);
          }
          idx += 1;
        }
      }
      return;
    }

    if (tag === "root" || hasBlockChildren(node)) {
      // Group consecutive inline/text children between block elements so stray inline spans stay together
      let inlineBuffer = [];
      const flushInline = () => {
        if (inlineBuffer.length === 0) return;
        const runs = [];
        for (let i = 0; i < inlineBuffer.length; i += 1) {
          extractInlineRuns(inlineBuffer[i], hint, stats, runs);
        }
        inlineBuffer = [];
        splitRunsIntoBlocks(runs, hint, stats, outBlocks, context);
      };

      for (let i = 0; i < node.children.length; i += 1) {
        const child = node.children[i];
        if (child.type === "element" && (BLOCK_TAGS.has(child.tag) || hasBlockChildren(child))) {
          flushInline();
          extractBlocksFromAst(child, hint, stats, outBlocks, context);
        } else {
          inlineBuffer.push(child);
        }
      }
      flushInline();
      return;
    }

    // Leaf block element (<p>, <section>, <div>, <li>, etc.)
    const runs = [];
    extractInlineRuns(node, hint, stats, runs);
    splitRunsIntoBlocks(runs, hint, stats, outBlocks, context);
  }

  function stripOuterBoldMarkdown(text) {
    const trimmed = stripTrailingMarkdownSpaces(text);
    if (!trimmed) return { isWrappedBold: false, inner: trimmed };
    if (/^\*\*\*[^*].*\*\*\*$/.test(trimmed)) {
      const inner = trimmed.slice(3, -3);
      if (inner.indexOf("***") === -1) {
        return { isWrappedBold: true, inner: stripTrailingMarkdownSpaces(inner), wasBoldItalic: true };
      }
    }
    if (/^\*\*[^*].*\*\*$/.test(trimmed) || /^__[^_].*__$/.test(trimmed)) {
      const marker = trimmed.startsWith("**") ? "**" : "__";
      const inner = trimmed.slice(2, -2);
      // Verify the opening marker matches the closing marker without closing prematurely
      if (inner.indexOf(marker) === -1) {
        return { isWrappedBold: true, inner: stripTrailingMarkdownSpaces(inner), wasBoldItalic: false };
      }
    }
    return { isWrappedBold: false, inner: trimmed, wasBoldItalic: false };
  }

  function stripOuterItalicMarkdown(text) {
    const trimmed = stripTrailingMarkdownSpaces(text);
    if (!trimmed) return { isWrappedItalic: false, inner: trimmed };
    if (/^\*[^*].*\*$/.test(trimmed) && !trimmed.startsWith("**")) {
      const inner = trimmed.slice(1, -1);
      if (inner.indexOf("*") === -1) {
        return { isWrappedItalic: true, inner: stripTrailingMarkdownSpaces(inner) };
      }
    }
    if (/^_[^_].*_$/.test(trimmed) && !trimmed.startsWith("__")) {
      const inner = trimmed.slice(1, -1);
      if (inner.indexOf("_") === -1) {
        return { isWrappedItalic: true, inner: stripTrailingMarkdownSpaces(inner) };
      }
    }
    return { isWrappedItalic: false, inner: trimmed };
  }

  function stripInlineBoldSyntax(text) {
    return String(text || "")
      .replace(/\*\*([^*]+)\*\*/g, "$1")
      .replace(/__([^_]+)__/g, "$1");
  }

  function parsePlainTextToBlocks(rawText, stats) {
    let text = String(rawText || "").replace(/\r\n?/g, "\n");
    text = cleanUnicodeSpaces(text, stats);

    // Check leading YAML frontmatter block
    let extractedYamlMeta = null;
    const fmMatch = text.match(/^---\n([\s\S]*?)\n---(?:\n+|$)/);
    if (fmMatch) {
      extractedYamlMeta = parseYamlFrontmatterBlock(fmMatch[1]);
      text = text.slice(fmMatch[0].length);
      if (stats) stats.frontmatterStripped = true;
    }

    const lines = text.split("\n");
    const blocks = [];
    let paraLines = [];
    let inCodeFence = false;
    let codeLines = [];

    function flushPara() {
      if (paraLines.length === 0) return;
      const joined = paraLines.map((l) => stripTrailingMarkdownSpaces(l)).join(" ");
      paraLines = [];
      const clean = stripTrailingMarkdownSpaces(joined);
      if (!clean) return;
      blocks.push({ kind: "paragraph", text: clean });
    }

    for (let i = 0; i < lines.length; i += 1) {
      const rawLine = lines[i];
      const line = stripTrailingMarkdownSpaces(rawLine);

      if (/^```/.test(line)) {
        flushPara();
        if (!inCodeFence) {
          inCodeFence = true;
          codeLines = [];
        } else {
          blocks.push({ kind: "code", text: codeLines.join("\n") });
          inCodeFence = false;
          codeLines = [];
        }
        continue;
      }

      if (inCodeFence) {
        codeLines.push(rawLine);
        continue;
      }

      if (!line) {
        flushPara();
        continue;
      }

      if (/^(?:---|\*\*\*|___)\s*$/.test(line)) {
        flushPara();
        blocks.push({ kind: "hr" });
        continue;
      }

      // Line contains one or more markdown images (possibly concatenated like ![](a)![](b)caption)
      if (/!\[[^\]]*\]\([^)]+\)/.test(line)) {
        flushPara();
        splitMarkdownLineWithImages(line, blocks, stats);
        continue;
      }

      // Markdown heading line
      const mdHeading = line.match(/^(#{1,6})\s+(.+)$/);
      if (mdHeading) {
        flushPara();
        blocks.push({
          kind: "paragraph",
          text: stripInlineBoldSyntax(mdHeading[2]),
          isMarkdownHeading: true,
          headingLevel: mdHeading[1].length,
        });
        continue;
      }

      // HTML <figcaption> pasted directly into markdown
      const htmlFigcap = line.match(/^<figcaption[^>]*>([\s\S]*?)<\/figcaption>$/i);
      if (htmlFigcap) {
        flushPara();
        blocks.push({
          kind: "paragraph",
          text: stripTrailingMarkdownSpaces(htmlFigcap[1].replace(/<[^>]+>/g, "")),
          isHtmlCaption: true,
        });
        continue;
      }

      // Blockquote line
      if (/^>\s?/.test(line)) {
        flushPara();
        blocks.push({
          kind: "paragraph",
          text: stripTrailingMarkdownSpaces(line.replace(/^>\s?/, "")),
          inBlockquote: true,
        });
        continue;
      }

      // Unordered list item
      const ulMatch = line.match(/^[-*+]\s+(.+)$/);
      if (ulMatch && !/^\*[^*]+\*$/.test(line)) {
        flushPara();
        blocks.push({
          kind: "paragraph",
          text: ulMatch[1],
          listType: "ul",
        });
        continue;
      }

      // Ordered list item (keep careful distinction from "1. Heading" when alone)
      const olMatch = line.match(/^(\d{1,3})\.\s+(.+)$/);
      if (olMatch) {
        flushPara();
        blocks.push({
          kind: "paragraph",
          text: olMatch[2],
          listType: "ol",
          listIndex: parseInt(olMatch[1], 10),
          rawLine: line,
        });
        continue;
      }

      // Treat each non-empty line in pasted Chinese/Web articles as its own block unless inside code
      flushPara();
      blocks.push({ kind: "paragraph", text: line });
    }
    flushPara();
    if (inCodeFence && codeLines.length > 0) {
      blocks.push({ kind: "code", text: codeLines.join("\n") });
    }

    return { blocks, extractedYamlMeta };
  }

  function splitMarkdownLineWithImages(line, outBlocks, stats) {
    const imgRe = /!\[([^\]]*)\]\(\s*([^)\s]+(?:\s+"[^"]*")?)\s*\)/g;
    let lastIndex = 0;
    let match;

    while ((match = imgRe.exec(line)) !== null) {
      const before = stripTrailingMarkdownSpaces(line.slice(lastIndex, match.index));
      if (before) {
        outBlocks.push({ kind: "paragraph", text: before });
      }
      const alt = cleanImageAlt(match[1], stats);
      let src = match[2].trim();
      const titleMatch = src.match(/^(\S+)\s+"[^"]*"$/);
      if (titleMatch) src = titleMatch[1];
      if (src.startsWith("//")) src = `https:${src}`;
      outBlocks.push({
        kind: "image",
        src,
        alt,
      });
      lastIndex = imgRe.lastIndex;
    }

    const after = stripTrailingMarkdownSpaces(line.slice(lastIndex));
    if (after) {
      outBlocks.push({ kind: "paragraph", text: after });
    }
  }

  function parseYamlFrontmatterBlock(yamlBody) {
    const meta = {};
    const lines = String(yamlBody || "").split("\n");
    let currentKey = null;
    let multiline = [];

    function commitKey() {
      if (currentKey && multiline.length > 0) {
        meta[currentKey] = multiline.join("\n").trim();
      }
      currentKey = null;
      multiline = [];
    }

    for (let i = 0; i < lines.length; i += 1) {
      const line = lines[i];
      if (currentKey && /^\s{2,}/.test(line)) {
        multiline.push(line.replace(/^\s{2}/, ""));
        continue;
      }
      commitKey();
      const m = line.match(/^([a-zA-Z_][a-zA-Z0-9_-]*)\s*:\s*(.*)$/);
      if (!m) continue;
      const key = m[1].toLowerCase();
      let val = m[2].trim();
      if (val === "|-" || val === "|" || val === ">-" || val === ">") {
        currentKey = key;
        multiline = [];
        continue;
      }
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      meta[key] = val;
    }
    commitKey();
    return meta;
  }

  function isLikelyMarkdownDocument(input) {
    const str = String(input || "").replace(/\r\n?/g, "\n");
    if (!str.trim()) return false;
    // Top-level pasted HTML document wrappers are never treated as raw Markdown
    if (/^\s*<(?:!DOCTYPE|html|body|section|div|article|p|h[1-6]|figure|b\s+id="docs-internal-guid)/i.test(str)) {
      return false;
    }
    if (/^---\n[\s\S]*?\n---(?:\n|$)/.test(str)) return true;
    const mdBlocks = str.match(/^(?:#{1,6}\s+\S|!\[[^\]]*\]\([^)]+\)|>\s+\S|\*\*[^*\n]+\*\*\s*$)/gm) || [];
    if (mdBlocks.length >= 2) return true;
    if (mdBlocks.length === 1 && !/<(?:p|div|section|article|h[1-6]|figure)\b/i.test(str)) {
      return true;
    }
    return false;
  }

  function isLikelyHtml(input) {
    const str = String(input || "");
    if (isLikelyMarkdownDocument(str)) return false;
    return /<(?:p|div|section|article|h[1-6]|figure|figcaption|img|strong|b|em|i|span|blockquote|ul|ol|li|br)\b[^>]*>|<!--StartFragment-->/i.test(
      str
    );
  }

  function shouldPreferHtmlOverText(html, text) {
    if (!html || !isLikelyHtml(html)) return false;
    if (!text) return true;
    // If plain text looks like raw markdown (e.g., copied from a code editor with <pre><span>), prefer text
    if (isLikelyMarkdownDocument(text) && !/<(?:img|figure|figcaption)\b|data-src/i.test(html)) {
      return false;
    }
    // If HTML contains rich signals (images, headings, bold, italic, figcaption, styles), prefer HTML
    if (
      /<(?:img|h[1-6]|strong|b|em|i|figure|figcaption|blockquote|ul|ol)\b|text-align|font-size|font-weight|data-src/i.test(
        html
      )
    ) {
      return true;
    }
    return true;
  }

  function isCaptionTextCandidate(plainText, block, aggressiveCaptions) {
    if (!plainText) return false;
    const len = plainText.length;
    if (len > 200) return false;

    if (block.isHtmlCaption) return true;

    // Explicit italic-only paragraph directly under image(s)
    const italicWrap = stripOuterItalicMarkdown(block.text);
    if (italicWrap.isWrappedItalic) return true;

    // Explicit caption prefixes/suffixes (图： / 图为 / ▲ / （摄影： / 左：...右：... / Fig.)
    if (EXPLICIT_CAPTION_RE.test(plainText) || CAPTION_CREDIT_SUFFIX_RE.test(plainText)) {
      return true;
    }

    // HTML caption styling cues (centered, muted color, small font, caption class)
    if (block.captionClass || block.centered || block.muted || block.smallFont) {
      return len <= 160;
    }

    // Plain-text short line without trailing sentence punctuation directly under image(s)
    if (!TRAILING_SENTENCE_PUNCT_RE.test(plainText) && len <= 70) {
      return true;
    }

    // Deictic photo-descriptive sentence right under image(s)
    if (len <= 95 && (CAPTION_DEICTIC_RE.test(plainText) || CAPTION_CUE_WORDS_RE.test(plainText))) {
      return true;
    }

    if (aggressiveCaptions && len <= 95 && !/^(?:我|我们|“|「)/.test(plainText)) {
      return true;
    }

    return false;
  }

  function isSubheadingCandidate(block, prevBlock, nextBlock, afterImage) {
    if (!block || block.kind !== "paragraph") return false;
    if (block.inBlockquote || block.listType || block.isHtmlCaption) return false;

    const rawText = stripTrailingMarkdownSpaces(block.text);
    if (!rawText || /!\[/.test(rawText)) return false;

    const boldInfo = stripOuterBoldMarkdown(rawText);
    const plain = stripInlineBoldSyntax(boldInfo.isWrappedBold ? boldInfo.inner : rawText).trim();
    if (!plain) return false;

    // If explicitly marked caption in HTML or starts with explicit caption marker, never make it a heading
    if (EXPLICIT_CAPTION_RE.test(plain) || CAPTION_CREDIT_SUFFIX_RE.test(plain)) {
      return false;
    }

    // 1. HTML <h1>-<h4> or explicit Markdown headings
    if (block.isHtmlHeading) {
      return plain.length <= 80;
    }
    if (block.isMarkdownHeading) {
      return true;
    }

    // Check trailing sentence punctuation (headings do not end in 。！？；：…—)
    if (/[。！？.!?；;：:…—][”’"」』）)]*$/.test(plain)) {
      return false;
    }

    // 2. HTML heading class or large bold style
    if (block.headingClass && plain.length <= 60) return true;
    if (block.largeFont && (block.allBold || plain.length <= 45)) return true;

    // 3. Standalone short bold line (**标题** or <strong>标题</strong>)
    if (boldInfo.isWrappedBold || block.allBold) {
      // Do not mistake a bolded photo caption directly beneath an image for a section heading
      if (afterImage) {
        if (block.captionClass || block.muted || block.smallFont) {
          return false;
        }
        const hasExplicitHeadingNumbering =
          /^[一二三四五六七八九十百]+[、.．]\s*\S+/.test(plain) ||
          /^第[一二三四五六七八九十百千0-9]+[章节部分回节讲篇](?:\s*[:：、.\s]\s*\S+|\s*$)/.test(plain) ||
          /^(?:Part|Section|Chapter)\s+[0-9IVX]+(?:[:：.\s-].*)?$/i.test(plain) ||
          /^（[一二三四五六七八九十0-9]+）\s*\S+/.test(plain);
        const hasTitleColon = /[：:]/.test(plain);
        if (!hasExplicitHeadingNumbering && !hasTitleColon) {
          return false;
        }
      }
      if (plain.length >= 2 && plain.length <= 55) {
        return true;
      }
      return false;
    }

    // 4. Numbered section headings (一、... / 第一章 ... / Part 1 / （一）...)
    if (/^[一二三四五六七八九十百]+[、.．]\s*\S+/.test(plain) && plain.length <= 40) {
      return true;
    }
    if (/^第[一二三四五六七八九十百千0-9]+[章节部分回节讲篇](?:\s*[:：、.\s]\s*\S+|\s*$)/.test(plain) && plain.length <= 40) {
      return true;
    }
    if (/^(?:Part|Section|Chapter)\s+[0-9IVX]+(?:[:：.\s-].*)?$/i.test(plain) && plain.length <= 60) {
      return true;
    }
    if (/^（[一二三四五六七八九十0-9]+）\s*\S+/.test(plain) && plain.length <= 35) {
      return true;
    }

    // 5. Unbolded standalone short title line (e.g., "一香聚四姓", "离开，未曾离开")
    // Guard rigorously against captions, parenthetical notes, credit lines, and poem stanzas
    if (
      !afterImage &&
      plain.length >= 2 &&
      plain.length <= 24 &&
      !/^[（(【\[]/.test(plain) &&
      !/[）)\]]$/.test(plain) &&
      !/^[“"「]/.test(plain) &&
      !TOP_CREDIT_META_RE.test(plain) &&
      !/^(?:调研人员|摄影|作者|责编|编辑|整理|口述|访谈|来源|附记|注)\s*[:：]/.test(plain) &&
      !CAPTION_CUE_WORDS_RE.test(plain)
    ) {
      const prevIsLongProse =
        prevBlock && prevBlock.kind === "paragraph" && stripInlineBoldSyntax(prevBlock.text).length >= 35;
      const nextIsLongProse =
        nextBlock && nextBlock.kind === "paragraph" && stripInlineBoldSyntax(nextBlock.text).length >= 35;
      if (prevIsLongProse || nextIsLongProse) {
        return true;
      }
    }

    return false;
  }

  function cleanTopBlocks(blocks, meta, options, stats) {
    const titleOpt = options && options.title ? stripTrailingMarkdownSpaces(options.title) : "";
    let idx = 0;
    let inHeaderZone = true;

    while (idx < blocks.length && inHeaderZone && idx < 10) {
      const b = blocks[idx];
      if (b.kind !== "paragraph") break;
      const plain = stripInlineBoldSyntax(stripOuterBoldMarkdown(b.text).inner).trim();

      if (WECHAT_JUNK_LINE_RE.test(plain) || WECHAT_DATE_BAR_RE.test(plain)) {
        stats.junkLinesRemoved += 1;
        idx += 1;
        continue;
      }

      if (idx <= 3 && PROVINCE_LOCATION_RE.test(plain)) {
        stats.junkLinesRemoved += 1;
        idx += 1;
        continue;
      }

      if (titleOpt && plain === titleOpt && idx <= 2) {
        stats.junkLinesRemoved += 1;
        idx += 1;
        continue;
      }

      // Duplicate top <h1> matching extracted frontmatter title
      if (b.isHtmlHeading && b.htmlHeadingTag === "h1" && idx === 0 && !meta.title) {
        meta.title = plain;
        stats.junkLinesRemoved += 1;
        idx += 1;
        continue;
      }

      const metaMatch = plain.match(TOP_CREDIT_META_RE);
      if (metaMatch) {
        const keyRaw = metaMatch[1].toLowerCase();
        const val = metaMatch[2].trim();
        if (keyRaw === "title" || keyRaw === "标题" || keyRaw === "题目") {
          if (!meta.title) meta.title = val;
        } else if (keyRaw === "author" || keyRaw === "作者" || keyRaw === "撰文" || keyRaw === "撰稿") {
          if (!meta.author) meta.author = val;
        } else if (keyRaw === "date" || keyRaw === "日期" || keyRaw === "发布日期" || keyRaw === "发布时间" || keyRaw === "时间") {
          if (!meta.date) meta.date = val;
        } else if (keyRaw === "excerpt" || keyRaw === "摘要" || keyRaw === "简介" || keyRaw === "导语") {
          if (!meta.excerpt) meta.excerpt = val;
        }
        stats.junkLinesRemoved += 1;
        idx += 1;
        continue;
      }

      inHeaderZone = false;
    }

    return blocks.slice(idx);
  }

  function classifyImageKind(src) {
    if (/^data:image\//i.test(src)) return "data-uri";
    if (/^blob:/i.test(src)) return "blob";
    if (/^file:/i.test(src)) return "file-local";
    if (/^(?:https?:)?\/\//i.test(src)) return "external";
    return "local";
  }

  function formatBodyBlocks(rawBlocks, options, stats, meta) {
    const aggressiveCaptions = Boolean(options && options.aggressiveCaptions);
    // Filter out WeChat junk anywhere and empty blocks
    const cleaned = [];
    for (let i = 0; i < rawBlocks.length; i += 1) {
      const b = rawBlocks[i];
      if (b.kind === "paragraph") {
        const plain = stripInlineBoldSyntax(b.text).trim();
        if (!plain) continue;
        if (WECHAT_JUNK_LINE_RE.test(plain)) {
          stats.junkLinesRemoved += 1;
          continue;
        }
      }
      cleaned.push(b);
    }

    // Disambiguate single isolated "1. ..." vs genuine ordered list
    for (let i = 0; i < cleaned.length; i += 1) {
      const b = cleaned[i];
      if (b.listType === "ol") {
        const prevIsOl = i > 0 && cleaned[i - 1].listType === "ol";
        const nextIsOl = i + 1 < cleaned.length && cleaned[i + 1].listType === "ol";
        if (!prevIsOl && !nextIsOl) {
          // Single standalone numbered item — treat as normal paragraph/heading candidate
          b.listType = undefined;
          if (b.rawLine) b.text = b.rawLine;
        }
      }
    }

    const bodyBlocks = cleanTopBlocks(cleaned, meta, options, stats);
    const outputParts = [];
    const images = [];
    const warnings = [];
    let afterImageRun = false;

    for (let i = 0; i < bodyBlocks.length; i += 1) {
      const b = bodyBlocks[i];
      const prev = i > 0 ? bodyBlocks[i - 1] : null;
      const next = i + 1 < bodyBlocks.length ? bodyBlocks[i + 1] : null;

      if (b.kind === "image") {
        const kind = classifyImageKind(b.src);
        const isHotlinkRisk = kind === "external" && HOTLINK_RISK_HOST_RE.test(b.src);
        const imgEntry = {
          index: images.length,
          src: b.src,
          alt: b.alt || "",
          kind,
          isHotlinkRisk,
        };
        if (kind === "data-uri") {
          const commaIdx = b.src.indexOf(",");
          if (commaIdx !== -1) {
            imgEntry.estimatedBytes = Math.round(((b.src.length - commaIdx - 1) * 3) / 4);
          }
        }
        images.push(imgEntry);
        if (kind === "file-local") {
          warnings.push(`检测到本地临时路径图片（${b.src.slice(0, 60)}...），浏览器无法自动上传，请改用截图粘贴或直接上传图片文件。`);
        }
        outputParts.push(`![${b.alt || ""}](${b.src})`);
        afterImageRun = true;
        continue;
      }

      if (b.kind === "hr") {
        outputParts.push("---");
        afterImageRun = false;
        continue;
      }

      if (b.kind === "code") {
        outputParts.push("```\n" + b.text + "\n```");
        afterImageRun = false;
        continue;
      }

      // Paragraph / heading / caption / list / blockquote
      if (b.inBlockquote) {
        const lines = b.text.split("\n").map((l) => `> ${l}`);
        outputParts.push(lines.join("\n"));
        afterImageRun = false;
        continue;
      }

      if (b.listType === "ul") {
        outputParts.push(`- ${b.text}`);
        afterImageRun = false;
        continue;
      }

      if (b.listType === "ol") {
        outputParts.push(`${b.listIndex || 1}. ${b.text}`);
        afterImageRun = false;
        continue;
      }

      // Check subheading BEFORE caption so headings following uncaptioned images aren't treated as captions
      if (isSubheadingCandidate(b, prev, next, afterImageRun)) {
        const boldInfo = stripOuterBoldMarkdown(b.text);
        const headingText = stripInlineBoldSyntax(boldInfo.isWrappedBold ? boldInfo.inner : b.text).trim();
        const prefix = b.isMarkdownHeading && b.headingLevel === 3 ? "###" : "##";
        outputParts.push(`${prefix} ${headingText}`);
        if (!b.isMarkdownHeading) {
          stats.headingsConverted += 1;
        }
        afterImageRun = false;
        continue;
      }

      // Check photo caption immediately beneath one or more images
      const plainForCaption = stripInlineBoldSyntax(
        stripOuterItalicMarkdown(stripOuterBoldMarkdown(b.text).inner).inner
      ).trim();

      if (b.isHtmlCaption && !afterImageRun) {
        // Preserve standalone/orphaned <figcaption> cleanly when no preceding image exists
        let captionBody = stripOuterItalicMarkdown(b.text).inner;
        const capBold = stripOuterBoldMarkdown(captionBody);
        if (capBold.isWrappedBold) captionBody = capBold.inner;
        captionBody = stripTrailingMarkdownSpaces(captionBody).replace(/\*\*([^*]+)\*\*/g, "$1");
        if (captionBody) {
          outputParts.push(`<figcaption>${captionBody}</figcaption>`);
        }
        afterImageRun = false;
        continue;
      }

      if (afterImageRun && isCaptionTextCandidate(plainForCaption, b, aggressiveCaptions)) {
        // Strip outer bold/italic wrappers so caption renders cleanly as *图注*
        let captionBody = stripOuterItalicMarkdown(b.text).inner;
        const capBold = stripOuterBoldMarkdown(captionBody);
        if (capBold.isWrappedBold) captionBody = capBold.inner;
        captionBody = stripTrailingMarkdownSpaces(captionBody)
          .replace(/\*\*([^*]+)\*\*/g, "$1")
          .replace(/^\*+|\*+$/g, "");
        if (captionBody) {
          outputParts.push(`*${captionBody}*`);
          if (!stripOuterItalicMarkdown(b.text).isWrappedItalic) {
            stats.captionsFormatted += 1;
          }
        }
        afterImageRun = false;
        continue;
      }

      afterImageRun = false;

      // Unbold accidentally bolded whole long paragraphs while keeping genuine short bold emphasis
      let finalPara = b.text;
      const outerBold = stripOuterBoldMarkdown(finalPara);
      if (outerBold.isWrappedBold) {
        const inner = outerBold.inner;
        const sentenceBreaks = (inner.match(/[。！？.!?]/g) || []).length;
        if (inner.length > 65 || (inner.length > 48 && sentenceBreaks >= 2)) {
          finalPara = outerBold.wasBoldItalic ? `*${inner}*` : inner;
          stats.paragraphsUnbolded += 1;
        }
      } else if (b.allBold && plainForCaption.length > 65) {
        finalPara = stripInlineBoldSyntax(finalPara);
        stats.paragraphsUnbolded += 1;
      }

      // Clean broken inline bold/italic whitespace like "** 文字 **" -> "**文字**"
      finalPara = finalPara
        .replace(/\*\*\s+([^*]+?)\s+\*\*/g, "**$1**")
        .replace(/([^*])\s+\*\*/g, (m, c) => (c === "*" ? m : `${c}**`))
        .replace(/^\*\*\s+/, "**");

      outputParts.push(finalPara);
    }

    const markdown = outputParts.join("\n\n").replace(/\n{3,}/g, "\n\n").trim();
    return { markdown, images, warnings };
  }

  function smartFormat(input, options) {
    const opts = options || {};
    const stats = {
      inputType: "text",
      headingsConverted: 0,
      captionsFormatted: 0,
      paragraphsUnbolded: 0,
      imagesCleaned: 0,
      nbspRemoved: 0,
      junkLinesRemoved: 0,
      frontmatterStripped: false,
    };

    let html = "";
    let text = "";
    if (input && typeof input === "object") {
      html = typeof input.html === "string" ? input.html : "";
      text = typeof input.text === "string" ? input.text : "";
    } else {
      const str = typeof input === "string" ? input : "";
      if (isLikelyHtml(str)) {
        html = str;
      } else {
        text = str;
      }
    }

    let rawBlocks = [];
    const meta = {};

    if (shouldPreferHtmlOverText(html, text)) {
      stats.inputType = "html";
      const ast = parseHtmlNodes(html);
      const baseHint = {
        centered: false,
        muted: false,
        smallFont: false,
        largeFont: false,
        captionClass: false,
        headingClass: false,
        bold: false,
        italic: false,
      };
      extractBlocksFromAst(ast, baseHint, stats, rawBlocks, {});
    } else {
      const sourceText = text || html;
      stats.inputType = /^\s*(?:#{1,6}\s|!\[|\*\*|---|>)/m.test(sourceText) ? "markdown" : "text";
      const parsed = parsePlainTextToBlocks(sourceText, stats);
      rawBlocks = parsed.blocks;
      if (parsed.extractedYamlMeta) {
        Object.assign(meta, parsed.extractedYamlMeta);
      }
    }

    const { markdown, images, warnings } = formatBodyBlocks(rawBlocks, opts, stats, meta);

    return {
      markdown,
      meta,
      images,
      stats,
      warnings,
    };
  }

  return {
    smartFormat,
    decodeHtmlEntities,
    isLikelyHtml,
    cleanImageAlt,
    HOTLINK_RISK_HOST_RE,
  };
});
