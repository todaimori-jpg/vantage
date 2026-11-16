export interface LiveJob {
  id: string;
  title: string;
  company: string;
  location: string;
  salaryMin?: number;
  salaryMax?: number;
  url: string;
  created?: string;
  description?: string;
}

export interface LiveHome {
  id: string;
  address: string;
  city?: string;
  state?: string;
  rent?: number;
  beds?: number;
  baths?: number;
  sqft?: number;
  propertyType?: string;
  listedDate?: string;
}

interface RequestMeta {
  provider: string;
  dashboard: string;
  secret?: string;
}

function errorDetail(body: string, secret?: string): string {
  let detail = '';
  try {
    const parsed = record(JSON.parse(body));
    detail = text(parsed.message) || text(parsed.error);
  } catch {
    detail = body;
  }
  detail = detail.replace(/\s+/g, ' ').trim();
  if (secret) detail = detail.split(secret).join('***');
  return detail.slice(0, 200);
}

function cleanKey(value: string): string {
  return value.replace(/^\s*bearer\s+/i, '').replace(/\s+/g, '');
}

async function request(url: string, init?: RequestInit, meta: RequestMeta = { provider: 'The API', dashboard: '' }): Promise<unknown> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), 20_000);
  try {
    const response = await fetch(url, { ...init, signal: controller.signal });
    if (!response.ok) {
      const body = await response.text().catch(() => '');
      const detail = errorDetail(body, meta.secret);
      const tail = detail ? ` ${meta.provider} says: “${detail}”` : '';
      if (response.status === 401) {
        throw new Error(
          `${meta.provider} rejected the API key (401). Re-copy it from ${meta.dashboard} with no spaces or line breaks, and confirm the key was not revoked.${tail}`,
        );
      }
      if (response.status === 403) {
        throw new Error(
          `${meta.provider} refused the request (403). Check the key’s IP/endpoint restrictions and confirm an API plan is active with no billing problems.${tail}`,
        );
      }
      if (response.status === 429) throw new Error(`${meta.provider} rate limit hit (429). Wait a moment or lower your query volume.${tail}`);
      throw new Error(`${meta.provider} request failed (${response.status}).${tail}`);
    }
    return (await response.json()) as unknown;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') throw new Error('The request timed out after 20 seconds.');
    if (error instanceof TypeError) {
      throw new Error('Network or CORS error. The API may not allow direct browser calls — use the deep links instead.');
    }
    throw error;
  } finally {
    window.clearTimeout(timer);
  }
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
}

function text(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function number(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

export async function fetchAdzunaJobs(opts: {
  appId: string;
  appKey: string;
  what: string;
  where: string;
  remoteOnly: boolean;
}): Promise<LiveJob[]> {
  const appId = cleanKey(opts.appId);
  const appKey = cleanKey(opts.appKey);
  const params = new URLSearchParams({
    app_id: appId,
    app_key: appKey,
    results_per_page: '24',
    what: opts.what.trim() || 'product manager',
  });
  if (opts.where.trim()) params.set('where', opts.where.trim());
  if (opts.remoteOnly) params.set('what_and', 'remote');
  const url = `https://api.adzuna.com/v1/api/jobs/us/search/1?${params.toString()}`;
  const data = record(
    await request(url, undefined, {
      provider: 'Adzuna',
      dashboard: 'https://developer.adzuna.com/',
      secret: appKey,
    }),
  );
  const results = Array.isArray(data.results) ? data.results : [];
  return results
    .map((raw): LiveJob | null => {
      const r = record(raw);
      const id = text(r.id) || text(r.redirect_url);
      if (!id) return null;
      return {
        id,
        title: text(r.title),
        company: text(record(r.company).display_name),
        location: text(record(r.location).display_name),
        salaryMin: number(r.salary_min),
        salaryMax: number(r.salary_max),
        url: text(r.redirect_url),
        created: text(r.created),
        description: text(r.description),
      };
    })
    .filter((job): job is LiveJob => job !== null);
}

export async function fetchRentcast(opts: {
  key: string;
  city: string;
  state: string;
  minRent?: string;
  maxRent?: string;
  beds?: string;
}): Promise<LiveHome[]> {
  const params = new URLSearchParams({ city: opts.city, state: opts.state, status: 'Active', limit: '24' });
  if (opts.beds) params.set('bedrooms', opts.beds);
  if (opts.minRent) params.set('minPrice', opts.minRent);
  if (opts.maxRent) params.set('maxPrice', opts.maxRent);
  const key = cleanKey(opts.key);
  const data = await request(
    `https://api.rentcast.io/v1/listings/rental/long-term?${params.toString()}`,
    { headers: { 'X-Api-Key': key } },
    { provider: 'Rentcast', dashboard: 'https://app.rentcast.io/app/api', secret: key },
  );
  const rows = Array.isArray(data) ? data : [];
  return rows
    .map((raw): LiveHome | null => {
      const r = record(raw);
      const id = text(r.id) || text(r.formattedAddress);
      if (!id) return null;
      return {
        id,
        address: text(r.formattedAddress) || text(r.addressLine1),
        city: text(r.city) || undefined,
        state: text(r.state) || undefined,
        rent: number(r.price),
        beds: number(r.bedrooms),
        baths: number(r.bathrooms),
        sqft: number(r.squareFootage),
        propertyType: text(r.propertyType) || undefined,
        listedDate: text(r.listedDate) || undefined,
      };
    })
    .filter((home): home is LiveHome => home !== null);
}

export async function testAdzuna(appId: string, appKey: string): Promise<string> {
  const jobs = await fetchAdzunaJobs({ appId, appKey, what: 'manager', where: '', remoteOnly: false });
  return `Connected — pulled ${jobs.length} sample results.`;
}

export async function testRentcast(key: string, city: string, state: string): Promise<string> {
  const homes = await fetchRentcast({ key, city, state });
  return `Connected — pulled ${homes.length} sample listings.`;
}
