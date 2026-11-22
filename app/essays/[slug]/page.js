import path from "node:path";
import { cache } from "react";
import { notFound } from "next/navigation";
import { Marked, Renderer } from "marked";
import sharp from "sharp";
import { getEssays, getEssayData } from "@/lib/essays";
import EssayDetailClient from "./EssayDetailClient";

const defaultRenderer = new Renderer();
const UNSAFE_IMAGE_PROTOCOL_RE = /^(javascript|vbscript):/i;
const imagesDirectory = path.join(process.cwd(), "public", "images");
const imagePathPrefix = "/wuxian/images/";
const HTML_ESCAPE_MAP = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};
const VOID_HTML_TAGS = new Set([
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
const EXPLICIT_CAPTION_PATTERNS = [
  /^(?:图\s*[：:]|图为|图\s*\d+\s*[：:.、]|图片说明\s*[：:]|摄影\s*[：:]|供图\s*[：:]|图\s*\/\s*文\s*[：:]|图源\s*[：:]|图片来源\s*[：:]|▲\s*|▼\s*|[（(]?\s*(?:左图?|右图?|上图?|下图?|中图?)\s*[：:])/u,
  /[（(]\s*(?:摄影|供图|图源|图片来源|受访者供图|资料图)\s*[：:][^）)]*[）)]\s*$/u,
  /^(?:Figure\s+\d+|Fig\.\s*\d+|Photo(?:\s+by)?|Image|Caption)\s*[：:.]/i,
];
const ESSAY_NOTE_PREFIX_RE =
  /^(?:调研人员|采写|采访|撰文|整理|编辑|摄影|责编|统筹|助教|指导老师|作者|口述|受访|出品|刊发|注)\s*[：:]/u;
const PARENTHETICAL_NOTE_RE = /^[（(][^（）()]+[）)]$/u;

function escapeHtml(text) {
  return String(text || "").replace(/[&<>"']/g, (ch) => HTML_ESCAPE_MAP[ch]);
}

function stripHtmlToText(html) {
  return String(html || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function readTagEnd(html, startIndex) {
  let quote = null;
  for (let i = startIndex + 1; i < html.length; i++) {
    const ch = html[i];
    if (quote) {
      if (ch === quote) quote = null;
      continue;
    }
    if (ch === '"' || ch === "'") {
      quote = ch;
    } else if (ch === ">") {
      return i;
    }
  }
  return -1;
}

function findClosingTag(html, tagName, searchFrom) {
  const lowerTag = tagName.toLowerCase();
  const tagRe = new RegExp(`<(\\/)?${lowerTag}(?=[\\s>/])`, "gi");
  tagRe.lastIndex = searchFrom;
  let depth = 1;
  let match;

  while ((match = tagRe.exec(html)) !== null) {
    const isClosing = Boolean(match[1]);
    const tagEnd = readTagEnd(html, match.index);
    if (tagEnd === -1) return null;

    if (!isClosing) {
      const isSelfClosing = html[tagEnd - 1] === "/";
      if (!isSelfClosing) depth++;
    } else {
      depth--;
      if (depth === 0) {
        return { closeStart: match.index, closeEnd: tagEnd };
      }
    }
    tagRe.lastIndex = tagEnd + 1;
  }
  return null;
}

function tokenizeTopLevelHtml(html) {
  const tokens = [];
  let pos = 0;

  while (pos < html.length) {
    if (html[pos] !== "<") {
      const nextLt = html.indexOf("<", pos);
      const end = nextLt === -1 ? html.length : nextLt;
      tokens.push({ type: "raw", raw: html.slice(pos, end) });
      pos = end;
      continue;
    }

    if (html.startsWith("<!--", pos)) {
      const commentEnd = html.indexOf("-->", pos + 4);
      const end = commentEnd === -1 ? html.length : commentEnd + 3;
      tokens.push({ type: "raw", raw: html.slice(pos, end) });
      pos = end;
      continue;
    }

    const openMatch = /^<([a-zA-Z][a-zA-Z0-9-]*)(?=[\s>/])/.exec(html.slice(pos));
    const tagEnd = readTagEnd(html, pos);
    if (!openMatch || tagEnd === -1) {
      const fallbackEnd = html.indexOf("<", pos + 1);
      const end = fallbackEnd === -1 ? html.length : fallbackEnd;
      tokens.push({ type: "raw", raw: html.slice(pos, end) });
      pos = end;
      continue;
    }

    const tagName = openMatch[1].toLowerCase();
    const isSelfClosing = html[tagEnd - 1] === "/" || VOID_HTML_TAGS.has(tagName);
    if (isSelfClosing) {
      tokens.push({ type: "raw", raw: html.slice(pos, tagEnd + 1) });
      pos = tagEnd + 1;
      continue;
    }

    const closing = findClosingTag(html, tagName, tagEnd + 1);
    if (!closing) {
      tokens.push({ type: "raw", raw: html.slice(pos, tagEnd + 1) });
      pos = tagEnd + 1;
      continue;
    }

    tokens.push({
      type: "element",
      tag: tagName,
      innerHtml: html.slice(tagEnd + 1, closing.closeStart),
      raw: html.slice(pos, closing.closeEnd + 1),
    });
    pos = closing.closeEnd + 1;
  }

  return tokens;
}

function consumeLeadingImageUnit(html, startPos) {
  let cursor = startPos;
  while (cursor < html.length) {
    const ws = /^\s+/.exec(html.slice(cursor));
    if (ws) {
      cursor += ws[0].length;
      continue;
    }
    const br = /^<br\s*\/?>/i.exec(html.slice(cursor));
    if (br) {
      cursor += br[0].length;
      continue;
    }
    break;
  }

  if (cursor >= html.length || html[cursor] !== "<") return null;

  if (/^<img(?=[\s>/])/i.test(html.slice(cursor))) {
    const end = readTagEnd(html, cursor);
    if (end === -1) return null;
    return { unitHtml: html.slice(cursor, end + 1), nextPos: end + 1 };
  }

  if (/^<a(?=[\s>])/i.test(html.slice(cursor))) {
    const openEnd = readTagEnd(html, cursor);
    if (openEnd === -1) return null;
    const closing = findClosingTag(html, "a", openEnd + 1);
    if (!closing) return null;
    const anchorInner = html.slice(openEnd + 1, closing.closeStart).trim();
    if (/^<img(?=[\s>/])/i.test(anchorInner)) {
      const imgEnd = readTagEnd(anchorInner, 0);
      if (imgEnd !== -1 && imgEnd === anchorInner.length - 1) {
        return {
          unitHtml: html.slice(cursor, closing.closeEnd + 1),
          nextPos: closing.closeEnd + 1,
        };
      }
    }
  }

  return null;
}

function splitImageParagraph(innerHtml) {
  const images = [];
  let cursor = 0;

  while (cursor < innerHtml.length) {
    const found = consumeLeadingImageUnit(innerHtml, cursor);
    if (!found) break;
    images.push(found.unitHtml);
    cursor = found.nextPos;
  }

  if (images.length === 0) return null;

  const rest = innerHtml
    .slice(cursor)
    .replace(/^(?:\s|<br\s*\/?>)+/gi, "")
    .trim();

  return { images, trailingHtml: rest };
}

function unwrapOuterEm(html) {
  const trimmed = String(html || "").trim();
  if (!/^<em(?:\s[^>]*)?>/i.test(trimmed) || !/<\/em>\s*$/i.test(trimmed)) {
    return { unwrapped: false, html: trimmed };
  }

  const openEnd = readTagEnd(trimmed, 0);
  if (openEnd === -1) return { unwrapped: false, html: trimmed };

  const closing = findClosingTag(trimmed, "em", openEnd + 1);
  if (!closing || closing.closeEnd !== trimmed.length - 1) {
    return { unwrapped: false, html: trimmed };
  }

  return {
    unwrapped: true,
    html: trimmed.slice(openEnd + 1, closing.closeStart).trim(),
  };
}

function hasExplicitCaptionSyntax(innerHtml) {
  const text = stripHtmlToText(innerHtml);
  if (!text || text.length > 180) return false;
  return EXPLICIT_CAPTION_PATTERNS.some((re) => re.test(text));
}

function isEssayNoteParagraph(innerHtml) {
  const text = stripHtmlToText(innerHtml);
  if (!text || text.length > 100) return false;
  if (ESSAY_NOTE_PREFIX_RE.test(text)) return true;
  return text.length <= 60 && PARENTHETICAL_NOTE_RE.test(text);
}

function buildFigureHtml(images, captionHtml) {
  const count = images.length;
  const layoutClass =
    count === 1
      ? "essay-figure-single"
      : count === 2
        ? "essay-figure-pair"
        : "essay-figure-stack";
  const noCaptionClass = captionHtml ? "" : " essay-figure-no-caption";
  const mediaHtml = `<div class="essay-figure-media">${images.join("")}</div>`;
  const figcaptionHtml = captionHtml
    ? `<figcaption class="essay-caption">${captionHtml}</figcaption>`
    : "";
  return `<figure class="essay-figure ${layoutClass}${noCaptionClass}">${mediaHtml}${figcaptionHtml}</figure>`;
}

function normalizeRawFigure(innerHtml) {
  const subTokens = tokenizeTopLevelHtml(innerHtml);
  const images = [];
  let captionHtml = "";
  const extraParts = [];

  for (const sub of subTokens) {
    if (sub.type === "raw") {
      if (/^<img(?=[\s>/])/i.test(sub.raw.trim())) {
        images.push(sub.raw.trim());
      } else if (sub.raw.trim()) {
        extraParts.push(sub.raw);
      }
      continue;
    }
    if (sub.tag === "figcaption" && !captionHtml) {
      const em = unwrapOuterEm(sub.innerHtml);
      captionHtml = em.unwrapped ? em.html : sub.innerHtml.trim();
      continue;
    }
    if (sub.tag === "p") {
      const split = splitImageParagraph(sub.innerHtml);
      if (split && !split.trailingHtml) {
        images.push(...split.images);
        continue;
      }
    }
    extraParts.push(sub.raw);
  }

  if (images.length > 0 && extraParts.length === 0) {
    return buildFigureHtml(images, captionHtml);
  }
  if (images.length === 0 && captionHtml && extraParts.length === 0) {
    return `<figure class="essay-figure essay-figure-caption-only"><figcaption class="essay-caption essay-caption-standalone">${captionHtml}</figcaption></figure>`;
  }
  return `<figure class="essay-figure">${innerHtml}</figure>`;
}

function isWhitespaceToken(token) {
  return token && token.type === "raw" && /^\s*$/.test(token.raw);
}

function enhanceEssayHtml(html) {
  if (!html) return "";

  const rawTokens = tokenizeTopLevelHtml(html);
  const tokens = [];

  for (const token of rawTokens) {
    if (token.type === "element" && token.tag === "p") {
      const split = splitImageParagraph(token.innerHtml);
      if (split) {
        tokens.push({ type: "image-group", images: split.images });
        if (split.trailingHtml) {
          tokens.push({
            type: "element",
            tag: "p",
            innerHtml: split.trailingHtml,
            raw: `<p>${split.trailingHtml}</p>`,
          });
        }
        continue;
      }
    }
    tokens.push(token);
  }

  const output = [];
  let atEssayStart = true;

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];

    if (isWhitespaceToken(token)) {
      output.push(token.raw);
      continue;
    }

    if (token.type === "image-group") {
      const images = [...token.images];
      let j = i + 1;

      while (j < tokens.length) {
        if (isWhitespaceToken(tokens[j])) {
          j++;
          continue;
        }
        if (tokens[j].type === "image-group") {
          images.push(...tokens[j].images);
          i = j;
          j++;
          continue;
        }
        break;
      }

      let lookahead = i + 1;
      while (lookahead < tokens.length && isWhitespaceToken(tokens[lookahead])) {
        lookahead++;
      }

      let captionHtml = "";
      const next = tokens[lookahead];
      if (next && next.type === "element") {
        if (next.tag === "figcaption") {
          const em = unwrapOuterEm(next.innerHtml);
          captionHtml = em.unwrapped ? em.html : next.innerHtml.trim();
          i = lookahead;
        } else if (next.tag === "p") {
          const em = unwrapOuterEm(next.innerHtml);
          if (em.unwrapped && em.html) {
            captionHtml = em.html;
            i = lookahead;
          } else if (hasExplicitCaptionSyntax(next.innerHtml)) {
            captionHtml = next.innerHtml.trim();
            i = lookahead;
          }
        }
      }

      output.push(buildFigureHtml(images, captionHtml));
      atEssayStart = false;
      continue;
    }

    if (token.type === "element" && token.tag === "figure") {
      output.push(normalizeRawFigure(token.innerHtml));
      atEssayStart = false;
      continue;
    }

    if (token.type === "element" && token.tag === "figcaption") {
      const em = unwrapOuterEm(token.innerHtml);
      const captionInner = em.unwrapped ? em.html : token.innerHtml.trim();
      output.push(
        `<figure class="essay-figure essay-figure-caption-only"><figcaption class="essay-caption essay-caption-standalone">${captionInner}</figcaption></figure>`
      );
      atEssayStart = false;
      continue;
    }

    if (token.type === "element" && token.tag === "p") {
      if (atEssayStart && isEssayNoteParagraph(token.innerHtml)) {
        output.push(`<p class="essay-note">${token.innerHtml}</p>`);
        continue;
      }
      output.push(token.raw);
      atEssayStart = false;
      continue;
    }

    output.push(token.raw);
    atEssayStart = false;
  }

  return output.join("");
}

function unescapeCmsEmphasisOutsideCode(markdown) {
  const str = String(markdown || "");
  if (!str.includes("\\*")) return str;

  // Preserve fenced code blocks and inline code spans while normalizing Sveltia CMS \* escapes
  const segments = str.split(/(```[\s\S]*?```|~~~[\s\S]*?~~~|`[^`\n]+`)/g);
  return segments
    .map((seg, idx) => {
      if (idx % 2 === 1) return seg;
      return seg.replace(/(?:\\\*){2}([^\n]+?)(?:\\\*){2}/g, "**$1**");
    })
    .join("");
}

const cjkStrongExtension = {
  name: "strong",
  level: "inline",
  start(src) {
    return src.indexOf("**");
  },
  tokenizer(src) {
    // Allow bold spans directly next to Chinese quotation marks/punctuation where strict CommonMark flanking fails
    const match = /^\*\*([^\s*](?:[^\n]*?[^\s*])?)\*\*/.exec(src);
    if (!match) return undefined;
    return {
      type: "strong",
      raw: match[0],
      text: match[1],
      tokens: this.lexer.inlineTokens(match[1]),
    };
  },
};

const markdownParser = new Marked({
  extensions: [cjkStrongExtension],
  renderer: {
    image(token) {
      const normalizedHref = typeof token?.href === "string"
        ? token.href.replace(/[\u0000-\u0020]+/g, "")
        : "";
      if (UNSAFE_IMAGE_PROTOCOL_RE.test(normalizedHref)) {
        return escapeHtml(token.text);
      }
      const html = defaultRenderer.image.call(this, token);
      if (html.startsWith("<img ")) {
        const image = token.localImage;
        const size = image ? `width="${image.width}" height="${image.height}" ` : "";
        return `<img loading="lazy" decoding="async" ${size}${html.slice(5)}`;
      }
      return html;
    },
  },
});

const readLocalImage = cache(async (href) => {
  if (!href.startsWith(imagePathPrefix)) return null;

  try {
    const filename = decodeURIComponent(href.slice(imagePathPrefix.length).split(/[?#]/, 1)[0]);
    if (!filename || /[/\\:]/.test(filename) || filename === "." || filename === "..") return null;

    const { autoOrient } = await sharp(path.join(imagesDirectory, filename)).metadata();
    if (!autoOrient?.width || !autoOrient?.height) return null;

    return {
      url: `${imagePathPrefix}${encodeURIComponent(filename)}`,
      width: autoOrient.width,
      height: autoOrient.height,
    };
  } catch {
    return null;
  }
});

const renderEssay = cache(async (slug) => {
  const essay = await getEssayData(slug);
  if (!essay) return null;

  const { content, ...essayMeta } = essay;
  const images = [];
  const normalizedContent = unescapeCmsEmphasisOutsideCode(content || "");
  const html = await markdownParser.parse(normalizedContent, {
    async: true,
    walkTokens(token) {
      if (token.type !== "image") return;
      // Keep document order when selecting the first available share image.
      const image = readLocalImage(token.href);
      images.push(image);
      return image.then((metadata) => {
        token.localImage = metadata;
      });
    },
  });

  return {
    essay: essayMeta,
    contentHtml: enhanceEssayHtml(html),
    cover: (await Promise.all(images)).find(Boolean),
  };
});

export async function generateStaticParams() {
  const essays = await getEssays();
  return essays.map((essay) => ({
    slug: essay.slug,
  }));
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const rendered = await renderEssay(slug);
  if (!rendered) {
    return {};
  }

  const { essay, cover } = rendered;
  const url = `/wuxian/essays/${encodeURIComponent(essay.slug)}`;
  const pageTitle = `${essay.title} | 吴现 · 无限`;
  const description = essay.excerpt || "枝生无限月，花满自然秋。";

  return {
    title: pageTitle,
    description,
    alternates: { canonical: url },
    other: { "giscus:backlink": new URL(url, "https://fengyue-yj.github.io").href },
    openGraph: {
      title: pageTitle,
      description,
      type: "article",
      url,
      ...(cover && { images: [cover] }),
    },
  };
}

export default async function Essay({ params }) {
  const { slug } = await params;
  const rendered = await renderEssay(slug);
  if (!rendered) {
    notFound();
  }

  const { essay, contentHtml } = rendered;
  return (
    <EssayDetailClient essay={essay}>
      <main className="essay-content" lang="zh-CN" dangerouslySetInnerHTML={{ __html: contentHtml }} />
    </EssayDetailClient>
  );
}
