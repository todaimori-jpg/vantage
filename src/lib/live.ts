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

async function request(url: string, init?: RequestInit): Promise<unknown> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), 20_000);
  try {
    const response = await fetch(url, { ...init, signal: controller.signal });
    if (!response.ok) {
      const body = await response.text().catch(() => '');
      if (response.status === 401 || response.status === 403) {
        throw new Error('The API rejected the credential (401/403). Check the key and its permissions.');
      }
      if (response.status === 429) throw new Error('Rate limit hit. Wait a bit or lower your query volume.');
      throw new Error(`Request failed (${response.status}). ${body.slice(0, 160)}`);
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
  const params = new URLSearchParams({
    app_id: opts.appId.trim(),
    app_key: opts.appKey.trim(),
    results_per_page: '24',
    what: opts.what.trim() || 'product manager',
  });
  if (opts.where.trim()) params.set('where', opts.where.trim());
  if (opts.remoteOnly) params.set('what_and', 'remote');
  const url = `https://api.adzuna.com/v1/api/jobs/us/search/1?${params.toString()}`;
  const data = record(await request(url));
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
  const data = await request(`https://api.rentcast.io/v1/listings/rental/long-term?${params.toString()}`, {
    headers: { 'X-Api-Key': opts.key.trim() },
  });
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
