const fs = require('fs');
const path = require('path');

// Path to your content directory
const contentDir = path.join(__dirname, 'content');
const outputFile = path.join(__dirname, 'content', 'index.json');

function scanDirectory(dir, basePath = '') {
  let results = [];
  const list = fs.readdirSync(dir);

  list.forEach((file) => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat && stat.isDirectory()) {
      // Recursively scan subfolders (e.g. /content/resources/)
      results = results.concat(scanDirectory(filePath, path.join(basePath, file)));
    } else if (file.endsWith('.md')) {
      // Ignore extension for route generation
      const slug = file.replace('.md', '');
      const relativePath = path.join(basePath, slug).replace(/\\/g, '/');
      
      const route = relativePath === 'home' ? '/' : `/${relativePath}`;
      const title = slug
        .replace(/-/g, ' ')
        .replace(/\b\w/g, (l) => l.toUpperCase());

      results.push({ title, route, path: relativePath });
    }
  });

  return results;
}

try {
  const pages = scanDirectory(contentDir);
  fs.writeFileSync(outputFile, JSON.stringify(pages, null, 2));
  console.log(`Successfully indexed ${pages.length} pages to public/content/index.json`);
} catch (err) {
  console.error('Failed to generate content index:', err);
}