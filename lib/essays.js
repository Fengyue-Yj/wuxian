import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

const essaysDirectory = path.join(process.cwd(), 'content/essays');
const ISO_DATE_PREFIX_RE =
  /^(\d{4}-\d{2}-\d{2})(?:[T\s](\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?)(Z|[+-]\d{2}:?\d{2})?)?$/i;

/**
 * Parse frontmatter `date` (js-yaml Date, ISO string without seconds, or invalid/missing)
 * into a timezone-safe `YYYY-MM-DD` string and a numeric UTC epoch timestamp for sorting.
 */
function parseEssayDate(rawDate) {
  if (rawDate == null || rawDate === '') {
    return { date: '', sortTimestamp: null };
  }

  if (rawDate instanceof Date) {
    const ts = rawDate.getTime();
    if (Number.isNaN(ts)) {
      return { date: '', sortTimestamp: null };
    }
    return {
      date: rawDate.toISOString().slice(0, 10),
      sortTimestamp: ts,
    };
  }

  if (typeof rawDate === 'string') {
    const trimmed = rawDate.trim();
    if (!trimmed) {
      return { date: '', sortTimestamp: null };
    }

    const match = trimmed.match(ISO_DATE_PREFIX_RE);
    if (match) {
      const [, datePart, timePart, tzPart] = match;
      const [year, month, day] = datePart.split('-').map(Number);
      const utcCheck = new Date(Date.UTC(year, month - 1, day));
      const isValidCalendarDate =
        utcCheck.getUTCFullYear() === year &&
        utcCheck.getUTCMonth() + 1 === month &&
        utcCheck.getUTCDate() === day;

      if (!isValidCalendarDate) {
        return { date: '', sortTimestamp: null };
      }

      if (timePart) {
        // Treat naive timestamps (no explicit offset) as UTC to stay consistent with js-yaml Date parsing.
        const normalizedTz = tzPart
          ? tzPart.replace(/^([+-]\d{2})(\d{2})$/, '$1:$2')
          : 'Z';
        const ts = Date.parse(`${datePart}T${timePart}${normalizedTz}`);
        if (!Number.isNaN(ts)) {
          return { date: datePart, sortTimestamp: ts };
        }
        return { date: '', sortTimestamp: null };
      }

      return {
        date: datePart,
        sortTimestamp: Date.UTC(year, month - 1, day),
      };
    }

    const fallbackTs = Date.parse(trimmed);
    if (!Number.isNaN(fallbackTs)) {
      return {
        date: new Date(fallbackTs).toISOString().slice(0, 10),
        sortTimestamp: fallbackTs,
      };
    }
  }

  return { date: '', sortTimestamp: null };
}

export async function getEssays() {
  if (!fs.existsSync(essaysDirectory)) {
    return [];
  }

  const fileNames = fs.readdirSync(essaysDirectory);
  const allEssaysData = fileNames
    .filter((fileName) => fileName.endsWith('.md'))
    .map((fileName) => {
      const slug = fileName.replace(/\.md$/, '');
      const fullPath = path.join(essaysDirectory, fileName);
      const fileContents = fs.readFileSync(fullPath, 'utf8');
      const matterResult = matter(fileContents);
      const { date, sortTimestamp } = parseEssayDate(matterResult.data.date);

      return {
        slug,
        title: typeof matterResult.data.title === 'string' && matterResult.data.title
          ? matterResult.data.title
          : slug,
        date,
        excerpt: typeof matterResult.data.excerpt === 'string'
          ? matterResult.data.excerpt
          : '',
        sortTimestamp,
      };
    });

  return allEssaysData
    .sort((a, b) => {
      if (a.sortTimestamp === null && b.sortTimestamp === null) {
        return a.slug.localeCompare(b.slug);
      }
      if (a.sortTimestamp === null) return 1;
      if (b.sortTimestamp === null) return -1;
      if (b.sortTimestamp !== a.sortTimestamp) {
        return b.sortTimestamp - a.sortTimestamp;
      }
      return a.slug.localeCompare(b.slug);
    })
    .map(({ slug, title, date, excerpt }) => ({
      slug,
      title,
      date,
      excerpt,
    }));
}

export async function getEssayData(slug) {
  let decodedSlug = slug;
  try {
    decodedSlug = decodeURIComponent(slug);
  } catch {
    return null;
  }

  const resolvedDir = path.resolve(essaysDirectory);
  const fullPath = path.resolve(essaysDirectory, `${decodedSlug}.md`);
  if (!fullPath.startsWith(resolvedDir + path.sep) || !fs.existsSync(fullPath)) {
    return null;
  }

  const fileContents = fs.readFileSync(fullPath, 'utf8');
  const matterResult = matter(fileContents);
  const { date } = parseEssayDate(matterResult.data.date);

  return {
    slug: decodedSlug,
    title: typeof matterResult.data.title === 'string' && matterResult.data.title
      ? matterResult.data.title
      : decodedSlug,
    date,
    author: typeof matterResult.data.author === 'string' ? matterResult.data.author : '',
    excerpt: typeof matterResult.data.excerpt === 'string' ? matterResult.data.excerpt : '',
    content: matterResult.content,
  };
}
