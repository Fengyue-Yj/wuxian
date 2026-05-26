import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

const essaysDirectory = path.join(process.cwd(), 'content/essays');

export async function getEssays() {
  if (!fs.existsSync(essaysDirectory)) {
    return [];
  }
  
  const fileNames = fs.readdirSync(essaysDirectory);
  const allEssaysData = fileNames
    .filter(fileName => fileName.endsWith('.md'))
    .map((fileName) => {
      const slug = fileName.replace(/\.md$/, '');
      const fullPath = path.join(essaysDirectory, fileName);
      const fileContents = fs.readFileSync(fullPath, 'utf8');
      const matterResult = matter(fileContents);

      // Handle the date to string if it's a date object
      let date = matterResult.data.date;
      if (date instanceof Date) {
        date = date.toISOString().split('T')[0];
      } else if (typeof date === 'string') {
        date = date.split('T')[0];
      }

      return {
        slug,
        ...matterResult.data,
        date,
      };
    });
    
  return allEssaysData.sort((a, b) => {
    if (a.date < b.date) {
      return 1;
    } else {
      return -1;
    }
  });
}

export async function getEssayData(slug) {
  const decodedSlug = decodeURIComponent(slug);
  const fullPath = path.join(essaysDirectory, `${decodedSlug}.md`);
  const fileContents = fs.readFileSync(fullPath, 'utf8');
  const matterResult = matter(fileContents);

  let date = matterResult.data.date;
  if (date instanceof Date) {
    date = date.toISOString().split('T')[0];
  } else if (typeof date === 'string') {
    date = date.split('T')[0];
  }

  return {
    slug,
    content: matterResult.content,
    ...matterResult.data,
    date,
  };
}
