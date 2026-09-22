// Helper to fetch site directory safely from /content/index.json
async function getSiteDirectory() {
  const response = await fetch('/content/index.json');
  if (!response.ok) {
    throw new Error(`Failed to load index.json: ${response.status}`);
  }
  return await response.json();
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
      let html = '<h2>Site Directory</h2><ul>';
      pages.forEach((p) => {
        html += `<li><a href="${p.route}" data-link><strong>${p.title}</strong></a> <code>(${p.route})</code></li>`;
      });
      html += '</ul>';
      app.innerHTML = html;
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
        let listHtml = '<ul>';
        pages.forEach((p) => {
          listHtml += `<li><a href="${p.route}" data-link>${p.title}</a></li>`;
        });
        listHtml += '</ul>';

        app.innerHTML = app.innerHTML.replace('<!-- SITE_DIRECTORY -->', listHtml);
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