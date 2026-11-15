import { notFound } from "next/navigation";
import { Marked, Renderer } from "marked";
import { getEssays, getEssayData } from "@/lib/essays";
import EssayDetailClient from "./EssayDetailClient";

const defaultRenderer = new Renderer();
const UNSAFE_IMAGE_PROTOCOL_RE = /^(javascript|vbscript):/i;
const HTML_ESCAPE_MAP = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

function escapeHtml(text) {
  return String(text || "").replace(/[&<>"']/g, (ch) => HTML_ESCAPE_MAP[ch]);
}

const markdownParser = new Marked({
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
        return `<img loading="lazy" decoding="async" ${html.slice(5)}`;
      }
      return html;
    },
  },
});

export async function generateStaticParams() {
  const essays = await getEssays();
  return essays.map((essay) => ({
    slug: essay.slug,
  }));
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const essay = await getEssayData(slug);
  if (!essay) {
    return {};
  }

  const pageTitle = `${essay.title} | 吴现 · 无限`;
  const description = essay.excerpt || "枝生无限月，花满自然秋。";

  return {
    title: pageTitle,
    description,
    openGraph: {
      title: pageTitle,
      description,
      type: "article",
    },
  };
}

export default async function Essay({ params }) {
  const { slug } = await params;
  const essay = await getEssayData(slug);
  if (!essay) {
    notFound();
  }

  const { content, ...essayMeta } = essay;
  const contentHtml = markdownParser.parse(content || "");

  return <EssayDetailClient essay={essayMeta} contentHtml={contentHtml} />;
}
