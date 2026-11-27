type Environment = {
  EXPO_PUBLIC_SUPABASE_URL?: string;
  EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY?: string;
  EXPO_PUBLIC_SUPABASE_ANON_KEY?: string;
};

type PagesContext = {
  request: Request;
  env: Environment;
};

type PublicFlags = {
  public_page: boolean;
  public_leaderboard: boolean;
  sections: { schedule: boolean; results: boolean; participant_results: boolean; media: boolean };
};

type PublicSettings = {
  festival_id: string | null;
  festival_level: string | null;
  is_public_visible: boolean;
  show_individual_rankings: boolean;
  team_point_status: string | null;
  public_festival_name: string | null;
};

type PublicContext = {
  features: PublicFlags;
  settings: PublicSettings | null;
  festivalId: string | null;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const EDGE_TTL_SECONDS = 5;
const MAX_BROWSER_AGE_MS = 60_000;
const pending = new Map<string, Promise<unknown>>();

function disabledFlags(): PublicFlags {
  return {
    public_page: false,
    public_leaderboard: false,
    sections: { schedule: false, results: false, participant_results: false, media: false },
  };
}

function normalizeFlags(raw: any): PublicFlags {
  if (!raw || raw.public_page !== true) return disabledFlags();
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

function normalizeSettings(raw: any): PublicSettings | null {
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

function json(body: unknown, status = 200, cacheStatus?: string): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'private, no-store, max-age=0',
      'X-Content-Type-Options': 'nosniff',
      ...(cacheStatus ? { 'X-Public-Snapshot-Cache': cacheStatus } : {}),
    },
  });
}

function credentials(env: Environment) {
  const url = env.EXPO_PUBLIC_SUPABASE_URL;
  const key = env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY || env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key || !/^https:\/\//.test(url)) throw new Error('Public data source is unavailable');
  return { url: url.replace(/\/$/, ''), key };
}

async function supabaseGet<T>(env: Environment, path: string, body?: Record<string, unknown>): Promise<T> {
  const { url, key } = credentials(env);
  const response = await fetch(`${url}/rest/v1/${path}`, {
    method: body ? 'POST' : 'GET',
    signal: AbortSignal.timeout(8_000),
    headers: {
      apikey: key,
      Accept: 'application/json',
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  if (!response.ok) throw new Error(`Public data source returned ${response.status}`);
  return response.json() as Promise<T>;
}

function cacheKey(
  requestUrl: URL,
  kind: 'context' | 'snapshot' | 'version',
  tenantId: string,
  festivalId?: string,
  revision?: string | null,
  categoryCode?: string | null,
  includeCategoryTotals?: boolean,
) {
  const url = new URL('/_public-cache/v2', requestUrl.origin);
  url.searchParams.set('kind', kind);
  url.searchParams.set('tenant_id', tenantId);
  if (festivalId) url.searchParams.set('festival_id', festivalId);
  if (revision !== undefined) url.searchParams.set('revision', revision ?? 'disabled');
  if (categoryCode) url.searchParams.set('category_code', categoryCode);
  if (includeCategoryTotals) url.searchParams.set('category_totals', '1');
  return new Request(url.toString());
}

async function loadVersion(env: Environment, tenantId: string): Promise<string | null> {
  const raw = await supabaseGet<number | string | null>(env, 'rpc/get_public_snapshot_revision', { p_tenant_id: tenantId });
  if (raw === null) return null;
  const revision = String(raw);
  if (!/^(0|[1-9][0-9]*)$/.test(revision)) throw new Error('Invalid public revision');
  return revision;
}

async function sharedVersion(requestUrl: URL, env: Environment, tenantId: string) {
  return shared(cacheKey(requestUrl, 'version', tenantId), () => loadVersion(env, tenantId));
}

async function shared<T>(key: Request, build: () => Promise<T>): Promise<{ value: T; cacheStatus: string }> {
  const cache = (globalThis as any).caches?.default as Cache | undefined;
  const cached = await cache?.match(key).catch(() => undefined);
  if (cached) return { value: await cached.json() as T, cacheStatus: 'HIT' };

  const flightKey = key.url;
  const existing = pending.get(flightKey);
  if (existing) return { value: await existing as T, cacheStatus: 'MISS' };

  const flight = (async () => {
    const value = await build();
    if (cache) {
      await cache.put(key, new Response(JSON.stringify(value), {
        headers: { 'Content-Type': 'application/json', 'Cache-Control': `public, max-age=${EDGE_TTL_SECONDS}` },
      })).catch(() => { console.warn('Public snapshot edge cache write failed'); });
    }
    return value;
  })();
  pending.set(flightKey, flight);
  try { return { value: await flight, cacheStatus: cache ? 'MISS' : 'BYPASS' }; }
  finally { pending.delete(flightKey); }
}

async function loadContext(env: Environment, tenantId: string, requestedFestivalId: string | null): Promise<PublicContext> {
  const [rawFeatures, rawSettings] = await Promise.all([
    supabaseGet<any>(env, 'rpc/get_public_tenant_feature_settings', { p_tenant_id: tenantId }),
    supabaseGet<any[]>(env, 'rpc/get_public_leaderboard_settings', { p_tenant_id: tenantId, p_festival_id: requestedFestivalId }),
  ]);
  const features = normalizeFlags(rawFeatures);
  const rawSetting = Array.isArray(rawSettings) ? rawSettings[0] ?? null : null;
  const settings = normalizeSettings(rawSetting);
  if (!features.public_page) return { features, settings: null, festivalId: null };

  const visibleSettings = settings?.is_public_visible === true ? settings : null;
  const festivalId = requestedFestivalId
    ?? visibleSettings?.festival_id
    ?? await supabaseGet<string | null>(env, 'rpc/get_public_active_festival_id', { p_tenant_id: tenantId });
  if (festivalId !== null && (typeof festivalId !== 'string' || !UUID.test(festivalId))) {
    throw new Error('Invalid public festival');
  }
  return { features, settings: visibleSettings, festivalId };
}

async function itemCodes(env: Environment, tenantId: string, festivalId: string, rows: any[]): Promise<Record<string, string>> {
  const ids = [...new Set(rows.map((row) => row.item_id).filter((id) => typeof id === 'string' && UUID.test(id)))];
  const codes: Record<string, string> = {};
  for (let offset = 0; offset < ids.length; offset += 100) {
    const chunk = ids.slice(offset, offset + 100);
    const params = new URLSearchParams({
      select: 'id,item_code',
      id: `in.(${chunk.join(',')})`,
      tenant_id: `eq.${tenantId}`,
      festival_id: `eq.${festivalId}`,
    });
    const items = await supabaseGet<any[]>(env, `items?${params}`).catch(() => []);
    for (const item of items) codes[item.id] = item.item_code || '';
  }
  return codes;
}

function mappedPodiumResults(rows: any[], codes: Record<string, string>) {
  return rows
    .filter((row) => {
      const r = Number(row.rank);
      return r === 1 || r === 2 || r === 3;
    })
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
      rank: Number(row.rank) as 1 | 2 | 3,
    }));
}

function mappedIndividualRankings(rows: any[]) {
  return rows.map((row) => ({
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
  }));
}

function mappedLeaderboardRow(row: any) {
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

function mappedSchedules(rows: any[]) {
  return rows.map((row) => ({
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
  }));
}

async function loadSnapshot(
  env: Environment,
  tenantId: string,
  festivalId: string,
  context: PublicContext,
  revision: string,
  search: string | null,
  categoryCode: string | null,
  includeCategoryTotals: boolean,
) {
  const generatedAt = new Date().toISOString();
  const { features, settings } = context;
  const showResults = features.public_page && features.sections.results && settings?.is_public_visible === true;
  const showLeaderboard = showResults && features.public_leaderboard;
  const showIndividualRankings = showResults && settings?.show_individual_rankings === true;
  const showTeamRoster = features.public_page && features.public_leaderboard && features.sections.results;

  const [leaderboard, results, individualRankings, schedules, teamRoster, categoryTotals] = await Promise.all([
    showLeaderboard
      ? supabaseGet<any[]>(env, 'rpc/get_public_leaderboard_scoped', { p_tenant_id: tenantId, p_festival_id: festivalId })
      : [],
    showResults
      ? supabaseGet<any[]>(env, 'rpc/get_public_podium_results_scoped', {
          p_tenant_id: tenantId,
          p_festival_id: festivalId,
          p_search: search,
        })
      : [],
    showIndividualRankings
      ? supabaseGet<any[]>(env, 'rpc/get_public_individual_rankings_scoped', {
          p_tenant_id: tenantId,
          p_festival_id: festivalId,
          p_category_code: categoryCode,
          p_search: search,
        })
      : [],
    features.sections.schedule
      ? supabaseGet<any[]>(env, 'rpc/get_public_schedules_scoped', { p_tenant_id: tenantId, p_festival_id: festivalId })
      : [],
    showTeamRoster
      ? supabaseGet<any[]>(env, 'rpc/get_public_team_roster_scoped', { p_tenant_id: tenantId, p_festival_id: festivalId })
      : [],
    showLeaderboard && includeCategoryTotals
      ? supabaseGet<any[]>(env, 'rpc/get_public_team_category_totals_scoped', {
          p_tenant_id: tenantId,
          p_festival_id: festivalId,
          p_category_code: categoryCode,
        })
      : [],
  ]);

  if (![leaderboard, results, individualRankings, schedules, teamRoster, categoryTotals].every(Array.isArray)) {
    throw new Error('Invalid public response');
  }

  const codes = showResults && results.length ? await itemCodes(env, tenantId, festivalId, results) : {};
  const rosterIds = new Set(teamRoster.map((row) => row.organisation_id));
  const publishedById = new Map(leaderboard.map((row) => [row.organisation_id, row]));
  const standings = [
    ...teamRoster.map((team) => ({
      ...team,
      total_points: 0,
      first_place_count: 0,
      second_place_count: 0,
      third_place_count: 0,
      result_count: 0,
      grace_marks_awarded: 0,
      ...publishedById.get(team.organisation_id),
    })),
    ...leaderboard.filter((row) => !rosterIds.has(row.organisation_id)),
  ];

  return {
    tenant_id: tenantId,
    revision,
    festival_id: festivalId,
    generated_at: generatedAt,
    expires_at: new Date(Date.parse(generatedAt) + MAX_BROWSER_AGE_MS).toISOString(),
    features,
    settings,
    leaderboard: standings.map(mappedLeaderboardRow),
    results: mappedPodiumResults(results, codes),
    individual_rankings: mappedIndividualRankings(individualRankings),
    team_category_totals: categoryTotals.map(mappedLeaderboardRow),
    schedules: mappedSchedules(schedules),
  };
}

export async function onRequestGet({ request, env }: PagesContext): Promise<Response> {
  const requestUrl = new URL(request.url);
  const rawTenantId = requestUrl.searchParams.get('tenant_id');
  if (!rawTenantId || !UUID.test(rawTenantId)) return json({ error: 'Valid tenant_id is required' }, 400);
  const tenantId = rawTenantId.toLowerCase();

  const rawFestivalId = requestUrl.searchParams.get('festival_id');
  if (rawFestivalId && !UUID.test(rawFestivalId)) return json({ error: 'Valid festival_id is required' }, 400);
  const requestedFestivalId = rawFestivalId ? rawFestivalId.toLowerCase() : null;

  const rawSearch = requestUrl.searchParams.get('search')?.trim() || '';
  const search = rawSearch ? rawSearch.slice(0, 120) : null;
  const rawCategory = requestUrl.searchParams.get('category_code')?.trim() || '';
  const categoryCode = rawCategory ? rawCategory.slice(0, 60) : null;
  const includeCategoryTotals = ['1', 'true'].includes(
    (requestUrl.searchParams.get('include_category_totals') || '').toLowerCase(),
  );

  try {
    const version = await sharedVersion(requestUrl, env, tenantId);
    const contextResult = await shared(
      cacheKey(requestUrl, 'context', tenantId, requestedFestivalId ?? undefined, version.value),
      () => loadContext(env, tenantId, requestedFestivalId),
    );
    const context = contextResult.value;
    const festivalId = context.festivalId;
    if (!context.features.public_page || typeof festivalId !== 'string') {
      const generatedAt = new Date().toISOString();
      return json({
        tenant_id: tenantId,
        festival_id: null,
        generated_at: generatedAt,
        revision: version.value,
        expires_at: new Date(Date.parse(generatedAt) + MAX_BROWSER_AGE_MS).toISOString(),
        features: context.features,
        settings: null,
        leaderboard: [],
        results: [],
        individual_rankings: [],
        team_category_totals: [],
        schedules: [],
      }, 200, contextResult.cacheStatus);
    }

    if (search) {
      const value = await loadSnapshot(
        env,
        tenantId,
        festivalId,
        context,
        version.value ?? 'disabled',
        search,
        categoryCode,
        includeCategoryTotals,
      );
      return json(value, 200, 'BYPASS');
    }

    const snapshot = await shared(
      cacheKey(requestUrl, 'snapshot', tenantId, festivalId, version.value, categoryCode, includeCategoryTotals),
      () => loadSnapshot(
        env,
        tenantId,
        festivalId,
        context,
        version.value ?? 'disabled',
        null,
        categoryCode,
        includeCategoryTotals,
      ),
    );
    return json(snapshot.value, 200, snapshot.cacheStatus);
  } catch (error) {
    console.error('Public snapshot read failed', error);
    return json({ error: 'Public data is temporarily unavailable' }, 503);
  }
}

export async function onRequestGetVersion({ request, env }: PagesContext): Promise<Response> {
  const requestUrl = new URL(request.url);
  const rawTenantId = requestUrl.searchParams.get('tenant_id');
  if (!rawTenantId || !UUID.test(rawTenantId)) return json({ error: 'Valid tenant_id is required' }, 400);
  const tenantId = rawTenantId.toLowerCase();
  try {
    const version = await sharedVersion(requestUrl, env, tenantId);
    return json({ tenant_id: tenantId, revision: version.value, checked_at: new Date().toISOString() }, 200, version.cacheStatus);
  } catch (error) {
    console.error('Public snapshot version read failed', error);
    return json({ error: 'Public data is temporarily unavailable' }, 503);
  }
}
