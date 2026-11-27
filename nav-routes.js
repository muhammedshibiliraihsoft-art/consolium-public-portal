(() => {
  const routes = new Map([
    ['/', '/consoulium'],
    ['#journey', '/explore#public-results'],
    ['/#journey', '/explore#public-results'],
    ['#race', '/explore#register'],
    ['/#race', '/explore#register'],
    ['#thought', '/explore#public-schedule'],
    ['/#thought', '/explore#public-schedule'],
    ['/results', '/explore#public-results'],
    ['/standings', '/explore#register'],
    ['/schedule', '/explore#public-schedule'],
  ]);
  routes.set('/festival-results.html', '/explore#public-results');
  routes.set('/festival-standings.html', '/explore#register');
  routes.set('/festival-schedule.html', '/explore#public-schedule');
  const requestedTenant = new URLSearchParams(location.search).get('tenant_id');
  const tenant = requestedTenant === 'f87172d1-ed27-4db4-842c-cc00d3d56de2'
    ? '45a0c1a0-bda0-4806-8477-f3fd3d6dfbbe' : requestedTenant;
  const update = () => {
    for (const link of document.querySelectorAll('.nav__links a[href], .menu__pages a[href], .footer__links a[href], a[href="/"]')) {
      if (['gallery', 'news', 'media', 'brochure'].includes(link.textContent.trim().toLowerCase())) {
        link.classList.add('public-link-pending');
        link.setAttribute('aria-disabled', 'true');
        link.removeAttribute('href');
        link.tabIndex = -1;
        continue;
      }
      const target = routes.get(link.getAttribute('href'));
      if (!target) continue;
      const url = new URL(target, location.origin);
      if (tenant) url.searchParams.set('tenant_id', tenant);
      link.href = url.pathname + url.search + url.hash;
    }
  };
  const observer = new MutationObserver(update);
  observer.observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['href'] });
  document.addEventListener('click', (event) => {
    const link = event.target.closest?.('a');
    if (!link || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    if (link.classList.contains('public-link-pending')) {
      event.preventDefault();
      event.stopImmediatePropagation();
      return;
    }
    if (!link.href) return;
    const url = new URL(link.href, location.origin);
    if (url.pathname !== '/explore' && url.pathname !== '/consoulium' && (!url.pathname.startsWith('/festival-') || !url.pathname.endsWith('.html'))) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    if (url.pathname === location.pathname && url.hash) {
      const target = document.getElementById(url.hash.slice(1));
      if (target) {
        history.pushState(null, '', url.pathname + url.search + url.hash);
        target.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
        target.setAttribute('tabindex', '-1');
        target.focus({ preventScroll: true });
        return;
      }
    }
    location.assign(url.pathname + url.search + url.hash);
  }, true);
  update();
})();
