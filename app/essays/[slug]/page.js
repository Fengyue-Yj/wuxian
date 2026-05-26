import { getEssays, getEssayData } from "@/lib/essays";
import { marked } from "marked";
import EssayDetailClient from "./EssayDetailClient";

export async function generateStaticParams() {
  const essays = await getEssays();
  return essays.map((essay) => ({
    slug: essay.slug,
  }));
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const essay = await getEssayData(slug);
  return {
    title: `${essay.title} | 吴现 · 无限`,
    description: essay.excerpt,
  };
}

export default async function Essay({ params }) {
  const { slug } = await params;
  const essay = await getEssayData(slug);
  const contentHtml = marked.parse(essay.content);

  return <EssayDetailClient essay={essay} contentHtml={contentHtml} />;
}
