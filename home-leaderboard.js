// Reuse the published standings snapshot without changing the home page's scene.
let standings;

async function getStandings() {
  if (!standings) {
    standings = fetch('/mock-data.json', { cache: 'no-store', credentials: 'omit' })
      .then((response) => {
        if (!response.ok) throw new Error('Standings unavailable');
        return response.json();
      });
  }
  return standings;
}

const TEAM_PALETTE = ['#6D28D9', '#E11D48', '#2563EB', '#10B981', '#F59E0B'];
const TEAM_COLOR_RULES = [
  ['cosmix', '#6D28D9'],
  ['cognix', '#E11D48'],
  ['clarix', '#2563EB'],
  ['glifix', '#10B981'],
  ['zenix', '#F59E0B'],
];

function resolveTeamColor(team, stableIndex) {
  if (team?.color) return team.color;
  const name = String(team?.organisation_name || '').toLowerCase();
  for (const [needle, color] of TEAM_COLOR_RULES) {
    if (name.includes(needle)) return color;
  }
  return TEAM_PALETTE[stableIndex % TEAM_PALETTE.length];
}

async function install(section) {
  if (section.classList.contains('home-leaderboard')) return;
  section.classList.add('home-leaderboard');

  section.querySelector('.register__head')?.remove();

  const mega = section.querySelector('.mega');
  mega?.removeAttribute('href');
  mega?.removeAttribute('target');
  mega?.removeAttribute('rel');
  mega?.removeAttribute('data-cursor');
  mega?.setAttribute('role', 'presentation');
  mega?.setAttribute('aria-hidden', 'true');
  mega?.setAttribute('tabindex', '-1');
  mega?.querySelectorAll('.mega__label').forEach((label) => label.replaceChildren('Leaderboard'));

  const list = document.createElement('ol');
  list.className = 'home-leaderboard__list';
  list.setAttribute('aria-label', 'Team points');
  section.querySelector('.register__action')?.append(list);

  const views = [];
  function node(tag, cls, text) {
    const el = document.createElement(tag);
    if (cls) el.className = cls;
    if (text != null) el.textContent = text;
    return el;
  }
  function addView(kind, host, content) {
    const tools = node('div', 'public-section__tools');
    const input = node('input');
    input.type = 'search';
    input.placeholder = kind === 'standings' ? 'Search teams' : `Search ${kind}`;
    input.setAttribute('aria-label', input.placeholder);
    const button = node('button', '', 'Refresh');
    button.type = 'button';
    tools.append(input, button);
    host.insertBefore(tools, content);
    const status = node('p', 'public-section__status', 'Loading published updates…');
    status.setAttribute('role', 'status');
    host.insertBefore(status, content);
    views.push({ kind, input, button, content, status, limit: 5 });
    input.addEventListener('input', () => { const view = views.find(v => v.input === input); view.limit = 5; render(view); });
    button.addEventListener('click', () => refresh(true));
  }
  addView('standings', list.parentElement, list);
  const block = node('section', 'public-section');
  block.id = 'public-results';
  block.tabIndex = -1;
  block.setAttribute('aria-label', 'Festival sections');
  const navList = node('div', 'public-section__nav-list');
  if (mega) {
    for (const labelText of ['Results', 'Schedule', 'Standings', 'Gallery']) {
      const btn = node('button', 'mega public-section__banner public-section__nav-btn');
      btn.type = 'button';
      for (const child of mega.children) {
        if (!child.classList.contains('mega__arrow')) btn.append(child.cloneNode(true));
      }
      btn.querySelectorAll('.mega__label').forEach((label) => { label.textContent = labelText; });
      btn.querySelectorAll('.mega__orbit').forEach((orbit) => {
        orbit.removeAttribute('style');
      });
      btn.addEventListener('click', (event) => {
        event.preventDefault();
      });
      navList.append(btn);
    }
  }
  block.append(navList);
  section.append(block);
  const resultsSection = section.querySelector('#public-results');
  if (resultsSection && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    let revealFrame = 0;
    const updateReveal = () => {
      revealFrame = 0;
      if (!resultsSection.isConnected) {
        window.removeEventListener('scroll', scheduleReveal);
        window.removeEventListener('resize', scheduleReveal);
        return;
      }
      const viewport = window.innerHeight;
      const top = resultsSection.getBoundingClientRect().top;
      const progress = Math.max(0, Math.min(1, (viewport - top) / (viewport * 1.2)));
      const eased = progress * progress * (3 - 2 * progress);
      resultsSection.style.setProperty('--result-opacity', eased.toFixed(3));
      resultsSection.style.setProperty('--result-fade', `${45 * (1 - eased)}vh`);
    };
    const scheduleReveal = () => {
      if (!revealFrame) revealFrame = requestAnimationFrame(updateReveal);
    };
    window.addEventListener('scroll', scheduleReveal, { passive: true });
    window.addEventListener('resize', scheduleReveal, { passive: true });
    scheduleReveal();
  }
  let snapshot;
  let pending = false;
  const cardStore = new Map();
  const teamColorIndex = new Map();

  function getOrCreateCard(team) {
    const key = String(team.organisation_id || team.organisation_name || '');
    if (!teamColorIndex.has(key)) teamColorIndex.set(key, teamColorIndex.size);
    const color = resolveTeamColor(team, teamColorIndex.get(key));
    let entry = cardStore.get(key);
    if (!entry) {
      const item = document.createElement('li');
      item.className = 'home-leaderboard__card';
      const left = document.createElement('div');
      left.className = 'home-leaderboard__left';
      const rank = document.createElement('span');
      rank.className = 'home-leaderboard__rank';
      const name = document.createElement('span');
      name.className = 'home-leaderboard__name';
      left.append(rank, name);
      const points = document.createElement('strong');
      points.className = 'home-leaderboard__points';
      item.append(left, points);
      entry = { item, rank, name, points, lastPoints: null };
      cardStore.set(key, entry);
    }
    entry.item.style.setProperty('--team-c', color);
    entry.name.textContent = team.organisation_name;
    return entry;
  }

  function render(onlyView, animateFlip = false) {
    for (const view of onlyView ? [onlyView] : views) {
      const { kind, content, input, status } = view;
      const allowed = snapshot?.features?.public_page === true && (kind === 'schedule'
        ? snapshot.features.sections?.schedule === true
        : snapshot.features.sections?.results === true && (kind === 'standings'
          ? snapshot.features.public_leaderboard === true : snapshot.settings?.is_public_visible === true));
      if (!allowed) {
        content.replaceChildren();
        status.textContent = 'This public section is currently unavailable.';
        continue;
      }
      const term = input.value.trim().toLocaleLowerCase();
      const sorted = [...(snapshot.leaderboard || [])]
        .sort((a, b) => Number(b.total_points || 0) - Number(a.total_points || 0));
      const filtered = sorted
        .filter((r) => String(r.organisation_name || '').toLocaleLowerCase().includes(term))
        .slice(0, view.limit);

      const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
      const prevPositions = new Map();
      if (animateFlip && !reducedMotion) {
        for (const child of content.children) {
          if (child.classList.contains('home-leaderboard__card')) {
            prevPositions.set(child, child.getBoundingClientRect().top);
          }
        }
      }

      const nodes = [];
      filtered.forEach((team, idx) => {
        const entry = getOrCreateCard(team);
        const pts = Number(team.total_points || 0);
        entry.rank.textContent = `#${idx + 1}`;
        entry.points.textContent = `${pts} pts`;
        if (entry.lastPoints !== null && entry.lastPoints !== pts) {
          entry.item.classList.remove('is-updated');
          void entry.item.offsetWidth;
          entry.item.classList.add('is-updated');
          window.clearTimeout(entry.popTimer);
          entry.popTimer = window.setTimeout(() => entry.item.classList.remove('is-updated'), 650);
        }
        entry.lastPoints = pts;
        nodes.push(entry.item);
      });

      content.replaceChildren(...nodes);
      if (sorted.length > view.limit && !term) {
        const more = node('button', 'public-section__more', 'Show more');
        more.type = 'button';
        more.addEventListener('click', () => { view.limit += 5; render(view); });
        content.append(more);
      }

      if (animateFlip && !reducedMotion && prevPositions.size) {
        for (const item of nodes) {
          const oldTop = prevPositions.get(item);
          if (oldTop == null) continue;
          const deltaY = oldTop - item.getBoundingClientRect().top;
          if (Math.abs(deltaY) < 1) continue;
          item.classList.toggle('is-rising', deltaY > 0);
          item.style.transition = 'none';
          item.style.transform = `translate3d(0, ${deltaY}px, 0)`;
        }
        content.getBoundingClientRect();
        requestAnimationFrame(() => {
          for (const item of nodes) {
            if (!item.style.transform) continue;
            item.style.transition = 'transform 0.65s cubic-bezier(0.22, 1, 0.36, 1)';
            item.style.transform = 'translate3d(0, 0, 0)';
            const cleanup = () => {
              item.style.transition = '';
              item.style.transform = '';
              item.classList.remove('is-rising');
              item.removeEventListener('transitionend', cleanup);
            };
            item.addEventListener('transitionend', cleanup);
          }
        });
      }

      status.textContent = filtered.length
        ? `Showing ${filtered.length} of ${sorted.length}`
        : term ? 'No matches found.' : 'Nothing published yet.';
    }
  }

  async function refresh(force = false) {
    if (pending || !section.isConnected) return;
    pending = true;
    views.forEach(v => { v.button.disabled = true; v.status.textContent = 'Loading published updates…'; });
    if (force) standings = undefined;
    try { snapshot = await getStandings(); if (section.isConnected) render(undefined, true); }
    catch { standings = undefined; views.forEach(v => { v.status.textContent = 'Updates unavailable. Use Refresh to try again.'; }); }
    finally { pending = false; views.forEach(v => { v.button.disabled = false; }); }
  }
  const onVisible = () => {
    if (!section.isConnected) { document.removeEventListener('visibilitychange', onVisible); return; }
    if (!document.hidden) refresh(true);
  };
  document.addEventListener('visibilitychange', onVisible);
  await refresh();

}

const observer = new MutationObserver(() => {
  const section = document.querySelector('section#register');
  if (section) install(section);
});
observer.observe(document.body, { childList: true, subtree: true });
const initialSection = document.querySelector('section#register');
if (initialSection) install(initialSection);
