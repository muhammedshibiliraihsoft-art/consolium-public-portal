const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const root = __dirname;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MAX_BROWSER_AGE_MS = 60_000;

const mime = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.woff2': 'font/woff2',
  '.otf': 'font/otf',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
};

const pageRoutes = new Map([
  ['/', '/consoulium.html'],
  ['/index.html', '/consoulium.html'],
  ['/consoulium', '/consoulium.html'],
  ['/explore', '/explore.html'],
  ['/results', '/festival-results.html'],
  ['/standings', '/festival-standings.html'],
  ['/schedule', '/festival-schedule.html'],
  ['/gallery', '/festival-gallery.html'],
  ['/news', '/festival-news.html'],
  ['/media', '/festival-media.html'],
  ['/brochure', '/festival-brochure.html'],
]);

const portalRoutes = new Set(['/contributors', '/speakers', '/team', '/partners', '/second-thought', '/cloud-shell']);

function sendJson(res, status, payload) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'private, no-store, max-age=0',
    'X-Content-Type-Options': 'nosniff',
  }).end(JSON.stringify(payload));
}

function getSupabaseCredentials() {
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const key = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key || !/^https?:\/\//.test(url)) return null;
  return { url: url.replace(/\/$/, ''), key };
}

async function supabaseCall(creds, restPath, body) {
  const response = await fetch(`${creds.url}/rest/v1/${restPath}`, {
    method: body ? 'POST' : 'GET',
    signal: AbortSignal.timeout(8000),
    headers: {
      apikey: creds.key,
      Accept: 'application/json',
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  if (!response.ok) throw new Error(`Supabase returned ${response.status}`);
  return response.json();
}

function normalizeFlags(raw) {
  if (!raw || raw.public_page !== true) {
    return {
      public_page: false,
      public_leaderboard: false,
      sections: { schedule: false, results: false, participant_results: false, media: false },
    };
  }
  return {
    public_page: true,
    public_leaderboard: raw.public_leaderboard === true,
    sections: {
      schedule: raw.sections?.schedule === true,
      results: raw.sections?.results === true,
      participant_results: raw.sections?.participant_results === true,
      media: raw.sections?.media === true,
    },
  };
}

function normalizeSettings(raw) {
  if (!raw || typeof raw !== 'object') return null;
  return {
    festival_id: typeof raw.festival_id === 'string' ? raw.festival_id : null,
    festival_level: typeof raw.festival_level === 'string' ? raw.festival_level : null,
    is_public_visible: raw.is_public_visible === true,
    show_individual_rankings: raw.show_individual_rankings === true,
    team_point_status: typeof raw.team_point_status === 'string' ? raw.team_point_status : null,
    public_festival_name: typeof raw.public_festival_name === 'string' ? raw.public_festival_name : null,
  };
}

function mapLeaderboardRow(row) {
  return {
    organisation_id: row.organisation_id ?? null,
    organisation_name: String(row.organisation_name ?? 'Unit'),
    organisation_type: row.organisation_type ?? null,
    parent_id: row.parent_id ?? null,
    category_code: typeof row.category_code === 'string' ? row.category_code : undefined,
    total_points: Number(row.total_points ?? 0),
    first_place_count: Number(row.first_place_count ?? 0),
    second_place_count: Number(row.second_place_count ?? 0),
    third_place_count: Number(row.third_place_count ?? 0),
    result_count: Number(row.result_count ?? 0),
    latest_published_at: row.latest_published_at ?? null,
    grace_marks_awarded: Number(row.grace_marks_awarded ?? 0),
  };
}

async function handlePublicVersion(urlObj, res) {
  const rawTenantId = urlObj.searchParams.get('tenant_id');
  if (!rawTenantId || !UUID.test(rawTenantId)) return sendJson(res, 400, { error: 'Valid tenant_id is required' });
  const tenantId = rawTenantId.toLowerCase();
  const creds = getSupabaseCredentials();
  if (!creds) return sendJson(res, 503, { error: 'Public data is temporarily unavailable' });
  try {
    const rawRev = await supabaseCall(creds, 'rpc/get_public_snapshot_revision', { p_tenant_id: tenantId });
    const revision = rawRev === null ? null : String(rawRev);
    if (revision !== null && !/^(0|[1-9][0-9]*)$/.test(revision)) throw new Error('Invalid revision');
    return sendJson(res, 200, { tenant_id: tenantId, revision, checked_at: new Date().toISOString() });
  } catch {
    return sendJson(res, 503, { error: 'Public data is temporarily unavailable' });
  }
}

async function handlePublicSnapshot(urlObj, res) {
  const rawTenantId = urlObj.searchParams.get('tenant_id');
  if (!rawTenantId || !UUID.test(rawTenantId)) return sendJson(res, 400, { error: 'Valid tenant_id is required' });
  const tenantId = rawTenantId.toLowerCase();
  const rawFestivalId = urlObj.searchParams.get('festival_id');
  if (rawFestivalId && !UUID.test(rawFestivalId)) return sendJson(res, 400, { error: 'Valid festival_id is required' }, 400);
  const requestedFestivalId = rawFestivalId ? rawFestivalId.toLowerCase() : null;
  const rawSearch = (urlObj.searchParams.get('search') || '').trim();
  const search = rawSearch ? rawSearch.slice(0, 120) : null;
  const rawCat = (urlObj.searchParams.get('category_code') || '').trim();
  const categoryCode = rawCat ? rawCat.slice(0, 60) : null;
  const includeCategoryTotals = ['1', 'true'].includes((urlObj.searchParams.get('include_category_totals') || '').toLowerCase());

  const creds = getSupabaseCredentials();
  if (!creds) return sendJson(res, 503, { error: 'Public data is temporarily unavailable' });

  try {
    const [rawRev, rawFeatures, rawSettings] = await Promise.all([
      supabaseCall(creds, 'rpc/get_public_snapshot_revision', { p_tenant_id: tenantId }),
      supabaseCall(creds, 'rpc/get_public_tenant_feature_settings', { p_tenant_id: tenantId }),
      supabaseCall(creds, 'rpc/get_public_leaderboard_settings', { p_tenant_id: tenantId, p_festival_id: requestedFestivalId }),
    ]);
    const revision = rawRev === null ? null : String(rawRev);
    const features = normalizeFlags(rawFeatures);
    const settingRow = Array.isArray(rawSettings) ? rawSettings[0] ?? null : null;
    const settings = normalizeSettings(settingRow);
    const visibleSettings = settings?.is_public_visible === true ? settings : null;

    if (!features.public_page) {
      const generatedAt = new Date().toISOString();
      return sendJson(res, 200, {
        tenant_id: tenantId, festival_id: null, generated_at: generatedAt, revision,
        expires_at: new Date(Date.parse(generatedAt) + MAX_BROWSER_AGE_MS).toISOString(),
        features, settings: null, leaderboard: [], results: [], individual_rankings: [], team_category_totals: [], schedules: [],
      });
    }

    const festivalId = requestedFestivalId
      ?? visibleSettings?.festival_id
      ?? await supabaseCall(creds, 'rpc/get_public_active_festival_id', { p_tenant_id: tenantId });
    if (typeof festivalId !== 'string' || !UUID.test(festivalId)) {
      const generatedAt = new Date().toISOString();
      return sendJson(res, 200, {
        tenant_id: tenantId, festival_id: null, generated_at: generatedAt, revision,
        expires_at: new Date(Date.parse(generatedAt) + MAX_BROWSER_AGE_MS).toISOString(),
        features, settings: visibleSettings, leaderboard: [], results: [], individual_rankings: [], team_category_totals: [], schedules: [],
      });
    }

    const generatedAt = new Date().toISOString();
    const showResults = features.public_page && features.sections.results && visibleSettings?.is_public_visible === true;
    const showLeaderboard = showResults && features.public_leaderboard;
    const showIndividual = showResults && visibleSettings?.show_individual_rankings === true;
    const showRoster = features.public_page && features.public_leaderboard && features.sections.results;

    const [leaderboard, results, individualRankings, schedules, teamRoster, categoryTotals] = await Promise.all([
      showLeaderboard ? supabaseCall(creds, 'rpc/get_public_leaderboard_scoped', { p_tenant_id: tenantId, p_festival_id: festivalId }) : [],
      showResults ? supabaseCall(creds, 'rpc/get_public_podium_results_scoped', { p_tenant_id: tenantId, p_festival_id: festivalId, p_search: search }) : [],
      showIndividual ? supabaseCall(creds, 'rpc/get_public_individual_rankings_scoped', { p_tenant_id: tenantId, p_festival_id: festivalId, p_category_code: categoryCode, p_search: search }) : [],
      features.sections.schedule ? supabaseCall(creds, 'rpc/get_public_schedules_scoped', { p_tenant_id: tenantId, p_festival_id: festivalId }) : [],
      showRoster ? supabaseCall(creds, 'rpc/get_public_team_roster_scoped', { p_tenant_id: tenantId, p_festival_id: festivalId }) : [],
      showLeaderboard && includeCategoryTotals ? supabaseCall(creds, 'rpc/get_public_team_category_totals_scoped', { p_tenant_id: tenantId, p_festival_id: festivalId, p_category_code: categoryCode }) : [],
    ]);

    const itemIds = [...new Set(results.map((r) => r.item_id).filter((id) => typeof id === 'string' && UUID.test(id)))];
    const codes = {};
    for (let offset = 0; offset < itemIds.length; offset += 100) {
      const chunk = itemIds.slice(offset, offset + 100);
      const q = new URLSearchParams({ select: 'id,item_code', id: `in.(${chunk.join(',')})`, tenant_id: `eq.${tenantId}`, festival_id: `eq.${festivalId}` });
      const items = await supabaseCall(creds, `items?${q}`).catch(() => []);
      for (const item of items) codes[item.id] = item.item_code || '';
    }

    const rosterIds = new Set(teamRoster.map((r) => r.organisation_id));
    const publishedById = new Map(leaderboard.map((r) => [r.organisation_id, r]));
    const standings = [
      ...teamRoster.map((team) => ({
        ...team, total_points: 0, first_place_count: 0, second_place_count: 0, third_place_count: 0,
        result_count: 0, grace_marks_awarded: 0, ...publishedById.get(team.organisation_id),
      })),
      ...leaderboard.filter((r) => !rosterIds.has(r.organisation_id)),
    ];

    return sendJson(res, 200, {
      tenant_id: tenantId,
      revision,
      festival_id: festivalId,
      generated_at: generatedAt,
      expires_at: new Date(Date.parse(generatedAt) + MAX_BROWSER_AGE_MS).toISOString(),
      features,
      settings: visibleSettings,
      leaderboard: standings.map(mapLeaderboardRow),
      results: results
        .filter((r) => [1, 2, 3].includes(Number(r.rank)))
        .map((row) => ({
          result_id: row.result_id ?? null,
          item_id: row.item_id ?? null,
          item_code: (row.item_id && codes[row.item_id]) || '',
          item_name: String(row.item_name ?? ''),
          item_name_ml: String(row.item_name_ml ?? ''),
          is_group: row.is_group === true,
          item_category_codes: Array.isArray(row.item_category_codes) ? row.item_category_codes : [],
          organisation_name: String(row.organisation_name ?? 'Unassigned'),
          participant_name: String(row.participant_name ?? ''),
          rank: Number(row.rank),
        })),
      individual_rankings: individualRankings.map((row) => ({
        rank: Number(row.rank ?? 0),
        participant_name: String(row.participant_name ?? ''),
        organisation_name: String(row.organisation_name ?? ''),
        category_code: typeof row.category_code === 'string' ? row.category_code : null,
        profile_slug: typeof row.profile_slug === 'string' ? row.profile_slug : null,
        result_count: Number(row.result_count ?? 0),
        first_places: Number(row.first_places ?? 0),
        second_places: Number(row.second_places ?? 0),
        third_places: Number(row.third_places ?? 0),
        available_category_codes: Array.isArray(row.available_category_codes) ? row.available_category_codes : [],
      })),
      team_category_totals: categoryTotals.map(mapLeaderboardRow),
      schedules: schedules.map((row) => ({
        schedule_id: row.schedule_id,
        id: row.schedule_id,
        start_time: row.start_time ?? null,
        end_time: row.end_time ?? null,
        status: row.status ?? null,
        venues: row.venue_id ? { id: row.venue_id, name: row.venue_name, location: row.venue_location } : null,
        items: {
          id: row.item_id,
          item_code: row.item_code,
          item_name_en: row.item_name,
          item_name_ml: row.item_name_ml,
          item_type: row.item_type,
          category_codes: row.item_category_codes || [],
        },
      })),
    });
  } catch {
    return sendJson(res, 503, { error: 'Public data is temporarily unavailable' });
  }
}

http.createServer((req, res) => {
  let urlObj;
  try { urlObj = new URL(req.url, 'http://localhost'); } catch { res.writeHead(400).end(); return; }
  let pathname;
  try { pathname = decodeURIComponent(urlObj.pathname); } catch { res.writeHead(400).end(); return; }

  if (pathname === '/api/public-version') return handlePublicVersion(urlObj, res);
  if (pathname === '/api/public-snapshot') return handlePublicSnapshot(urlObj, res);

  if (pageRoutes.has(pathname)) pathname = pageRoutes.get(pathname);
  else if (portalRoutes.has(pathname)) pathname = '/explore.html';
  const file = path.resolve(root, '.' + pathname);
  if (!file.startsWith(root + path.sep) || pathname.startsWith('/.')) { res.writeHead(403).end(); return; }
  const ext = path.extname(file);
  const immutableAsset = new Set(['.woff2', '.otf', '.png', '.jpg', '.jpeg', '.webp', '.svg', '.ico']).has(ext);
  fs.readFile(file, (error, body) => {
    if (error) { res.writeHead(404).end('Not found'); return; }
    res.writeHead(200, {
      'Content-Type': mime[ext] || 'application/octet-stream',
      'Cache-Control': immutableAsset ? 'public, max-age=3600' : 'no-store',
    }).end(body);
  });
}).listen(Number(process.env.PORT) || 8080, '127.0.0.1', () => console.log('Demo: http://localhost:' + (process.env.PORT || 8080) + '/consoulium'));
