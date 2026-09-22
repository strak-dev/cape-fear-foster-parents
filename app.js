// Helper to format URL segments (e.g., "financial-support" -> "Financial Support")
function formatSegment(segment) {
  return segment.replace(/-/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
}

// Update the breadcrumbs on the right side of the nav
function updateBreadcrumbs() {
  const container = document.getElementById('breadcrumbs');
  const path = window.location.pathname;

  // Split path into segments, ignoring empty slashes
  const segments = path.split('/').filter(Boolean);

  // Home route
  if (segments.length === 0 || path === '/home') {
    container.innerHTML = '<li aria-current="page">Home</li>';
    return;
  }

  let html = '<li><a href="/" data-link>Home</a></li>';
  let accumulatedPath = '';

  segments.forEach((segment, index) => {
    accumulatedPath += `/${segment}`;
    const label = formatSegment(segment);
    const isLast = index === segments.length - 1;

    if (isLast) {
      html += `<li aria-current="page"><strong>${label}</strong></li>`;
    } else {
      html += `<li><a href="${accumulatedPath}" data-link>${label}</a></li>`;
    }
  });

  container.innerHTML = html;
}

async function loadPage() {
  const app = document.getElementById('app');
  let path = window.location.pathname;

  // Default root path to /home
  if (path === '/' || path === '') {
    path = '/home';
  }

  // Update breadcrumb navigation for current path
  updateBreadcrumbs();

  // Construct path to static markdown file
  const mdUrl = `/content${path}.md`;

  try {
    const response = await fetch(mdUrl);

    if (!response.ok) {
      if (response.status === 404) {
        app.innerHTML = '<h1>404 - Page Not Found</h1>';
      } else {
        app.innerHTML = '<h1>Error loading content</h1>';
      }
      return;
    }

    const markdownText = await response.text();

    // Convert Markdown to HTML using Marked
    app.innerHTML = marked.parse(markdownText);
  } catch (err) {
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
