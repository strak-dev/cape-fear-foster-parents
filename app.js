// Helper to fetch site directory safely from /content/index.json
async function getSiteDirectory() {
  const response = await fetch('/content/index.json');
  if (!response.ok) {
    throw new Error(`Failed to load index.json: ${response.status}`);
  }
  return await response.json();
}

/**
 * Transforms a flat array of pages [{route: "/stuff/things", title: "..."}, ...]
 * into a nested directory tree HTML string with nested <ul> elements.
 */
function buildDirectoryTreeHtml(pages, isRoot = true) {
  // 1. Build a nested object tree structure from routes
  const tree = {};

  pages.forEach((page) => {
    // Trim leading/trailing slashes and split path into segments
    const segments = page.route.replace(/^\/+|\/+$/g, '').split('/');
    let current = tree;

    segments.forEach((segment, index) => {
      if (!current[segment]) {
        current[segment] = { _children: {} };
      }
      
      // If we are at the last segment, attach the page object
      if (index === segments.length - 1) {
        current[segment]._page = page;
      }
      
      current = current[segment]._children;
    });
  });

  // 2. Recursively generate HTML list nodes
  function renderNode(node) {
    let html = '<ul>';
    
    for (const key in node) {
      const item = node[key];
      const page = item._page;
      const hasChildren = Object.keys(item._children).length > 0;

      html += '<li>';
      if (page) {
        html += `<a href="${page.route}" data-link><strong>${page.title}</strong></a> <code>(${page.route})</code>`;
      } else {
        // Display folder category header if there is no index page for this folder
        html += `<strong>${key}/</strong>`;
      }

      if (hasChildren) {
        html += renderNode(item._children);
      }
      
      html += '</li>';
    }
    
    html += '</ul>';
    return html;
  }

  return renderNode(tree);
}

async function loadPage() {
  const app = document.getElementById('app');
  let path = window.location.pathname;

  if (path === '/' || path === '') {
    path = '/home';
  }

  // Guard: update breadcrumbs safely if function exists
  if (typeof updateBreadcrumbs === 'function') {
    updateBreadcrumbs();
  }

  // Route: Handle dedicated /directory or /sitemap page
  if (path === '/directory' || path === '/sitemap') {
    try {
      const pages = await getSiteDirectory();
      const treeHtml = buildDirectoryTreeHtml(pages);
      app.innerHTML = `<h2>Site Directory</h2>${treeHtml}`;
    } catch (err) {
      console.error(err);
      app.innerHTML = '<h2>Directory</h2><p>Unable to load site index.</p>';
    }
    return;
  }

  // Standard markdown page fetch
  const mdUrl = `/content${path}.md`;

  try {
    const response = await fetch(mdUrl);

    if (!response.ok) {
      app.innerHTML = response.status === 404 
        ? '<h1>404 - Page Not Found</h1>' 
        : '<h1>Error loading content</h1>';
      return;
    }

    let markdownText = await response.text();

    // Render markdown to HTML
    app.innerHTML = marked.parse(markdownText);

    // Guard: fix relative links safely if function exists
    if (typeof fixRelativeLinks === 'function') {
      fixRelativeLinks(app, path);
    }

    // Placeholder: Replace <!-- SITE_DIRECTORY --> if present in the .md file
    if (markdownText.includes('<!-- SITE_DIRECTORY -->')) {
      try {
        const pages = await getSiteDirectory();
        const treeHtml = buildDirectoryTreeHtml(pages);
        app.innerHTML = app.innerHTML.replace('<!-- SITE_DIRECTORY -->', treeHtml);
      } catch (e) {
        console.error(e);
        app.innerHTML = app.innerHTML.replace('<!-- SITE_DIRECTORY -->', '');
      }
    }
  } catch (err) {
    console.error(err);
    app.innerHTML = '<h1>Network Error</h1>';
  }
}

// 1. Handle browser Back/Forward buttons
window.addEventListener('popstate', loadPage);

// 2. Intercept <a> tag clicks for instant SPA navigation
document.addEventListener('click', (e) => {
  const link = e.target.closest('a[data-link]');
  if (link) {
    e.preventDefault();
    const href = link.getAttribute('href');
    window.history.pushState(null, '', href);
    loadPage();
  }
});

// 3. Load content on initial page visit
document.addEventListener('DOMContentLoaded', loadPage);