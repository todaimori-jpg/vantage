import type { Apartment, AppState, HomeFilters, HomeStage, Job, JobFilters, JobStage, SavedSearch, Settings, Task, WorkMode, Laundry } from '../types';
import { HOME_STAGES, JOB_STAGES } from '../types';
import { DEFAULT_SETTINGS, defaultState } from '../data/defaults';

const KEY = 'vantage.state.v1';

function str(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function num(value: unknown): number | undefined {
  const n = typeof value === 'string' ? Number(value) : value;
  return typeof n === 'number' && Number.isFinite(n) ? n : undefined;
}

function bool(value: unknown, fallback = false): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

function list(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
}

function normalizeTags(value: unknown): string[] {
  return list(value).filter((tag): tag is string => typeof tag === 'string' && tag.trim().length > 0).slice(0, 12);
}

function normalizeJob(raw: unknown): Job | null {
  const r = record(raw);
  if (typeof r.id !== 'string' || !r.id) return null;
  const stage = JOB_STAGES.includes(r.stage as JobStage) ? (r.stage as JobStage) : 'target';
  const mode: WorkMode = r.mode === 'remote' || r.mode === 'hybrid' ? r.mode : 'onsite';
  return {
    id: r.id,
    title: str(r.title),
    company: str(r.company),
    location: str(r.location),
    mode,
    salaryMin: num(r.salaryMin),
    salaryMax: num(r.salaryMax),
    url: str(r.url) || undefined,
    source: str(r.source) || undefined,
    stage,
    priority: Math.min(5, Math.max(1, num(r.priority) ?? 3)),
    appliedOn: str(r.appliedOn) || undefined,
    nextAction: str(r.nextAction) || undefined,
    nextActionOn: str(r.nextActionOn) || undefined,
    contact: str(r.contact) || undefined,
    notes: str(r.notes) || undefined,
    tags: normalizeTags(r.tags),
    createdAt: str(r.createdAt) || new Date().toISOString(),
    updatedAt: str(r.updatedAt) || new Date().toISOString(),
  };
}

function normalizeApartment(raw: unknown): Apartment | null {
  const r = record(raw);
  if (typeof r.id !== 'string' || !r.id) return null;
  const stage = HOME_STAGES.includes(r.stage as HomeStage) ? (r.stage as HomeStage) : 'shortlist';
  const laundry: Laundry | undefined = r.laundry === 'in-unit' || r.laundry === 'in-building' || r.laundry === 'none' ? r.laundry : undefined;
  return {
    id: r.id,
    address: str(r.address),
    unit: str(r.unit) || undefined,
    neighborhood: str(r.neighborhood) || undefined,
    stage,
    rent: num(r.rent),
    beds: num(r.beds),
    baths: num(r.baths),
    sqft: num(r.sqft),
    availableFrom: str(r.availableFrom) || undefined,
    leaseMonths: num(r.leaseMonths),
    deposit: num(r.deposit),
    brokerFee: num(r.brokerFee),
    lastMonth: bool(r.lastMonth),
    pets: str(r.pets) || undefined,
    laundry,
    commuteMin: num(r.commuteMin),
    rating: num(r.rating),
    url: str(r.url) || undefined,
    source: str(r.source) || undefined,
    contact: str(r.contact) || undefined,
    tourAt: str(r.tourAt) || undefined,
    pros: str(r.pros) || undefined,
    cons: str(r.cons) || undefined,
    notes: str(r.notes) || undefined,
    tags: normalizeTags(r.tags),
    createdAt: str(r.createdAt) || new Date().toISOString(),
    updatedAt: str(r.updatedAt) || new Date().toISOString(),
  };
}

function normalizeTask(raw: unknown): Task | null {
  const r = record(raw);
  if (typeof r.id !== 'string' || typeof r.title !== 'string') return null;
  return {
    id: r.id,
    title: r.title,
    due: str(r.due) || undefined,
    done: bool(r.done),
    createdAt: str(r.createdAt) || new Date().toISOString(),
  };
}

function normalizeHomeFilters(raw: unknown): HomeFilters {
  const r = record(raw);
  return {
    area: str(r.area),
    minRent: str(r.minRent),
    maxRent: str(r.maxRent),
    beds: str(r.beds),
    baths: str(r.baths),
    pets: bool(r.pets),
  };
}

function normalizeJobFilters(raw: unknown): JobFilters {
  const r = record(raw);
  return { q: str(r.q), location: str(r.location), remote: bool(r.remote) };
}

function normalizeSearch(raw: unknown): SavedSearch | null {
  const r = record(raw);
  if (typeof r.id !== 'string' || typeof r.name !== 'string') return null;
  if (r.kind === 'homes') {
    return { id: r.id, kind: 'homes', name: r.name, filters: normalizeHomeFilters(r.filters), createdAt: str(r.createdAt) || new Date().toISOString() };
  }
  if (r.kind === 'jobs') {
    return { id: r.id, kind: 'jobs', name: r.name, filters: normalizeJobFilters(r.filters), createdAt: str(r.createdAt) || new Date().toISOString() };
  }
  return null;
}

function normalizeSettings(raw: unknown): Settings {
  const r = record(raw);
  return {
    ...DEFAULT_SETTINGS,
    name: str(r.name, DEFAULT_SETTINGS.name),
    roleKeywords: str(r.roleKeywords, DEFAULT_SETTINGS.roleKeywords),
    jobLocation: str(r.jobLocation, DEFAULT_SETTINGS.jobLocation),
    remoteOnly: bool(r.remoteOnly, DEFAULT_SETTINGS.remoteOnly),
    city: str(r.city, DEFAULT_SETTINGS.city),
    state: str(r.state, DEFAULT_SETTINGS.state),
    neighborhoods: str(r.neighborhoods, DEFAULT_SETTINGS.neighborhoods),
    rentBudget: num(r.rentBudget) ?? DEFAULT_SETTINGS.rentBudget,
    maxCommute: num(r.maxCommute) ?? DEFAULT_SETTINGS.maxCommute,
    craigslistSite: str(r.craigslistSite, DEFAULT_SETTINGS.craigslistSite),
    adzunaAppId: str(r.adzunaAppId, ''),
    adzunaAppKey: str(r.adzunaAppKey, ''),
    rentcastKey: str(r.rentcastKey, ''),
  };
}

export function normalizeState(raw: unknown): AppState {
  const base = defaultState();
  const r = record(raw);
  if (Object.keys(r).length === 0) return base;
  return {
    version: 1,
    settings: normalizeSettings(r.settings),
    jobs: list(r.jobs).map(normalizeJob).filter((j): j is Job => j !== null),
    apartments: list(r.apartments).map(normalizeApartment).filter((a): a is Apartment => a !== null),
    tasks: list(r.tasks).map(normalizeTask).filter((t): t is Task => t !== null),
    searches: list(r.searches).map(normalizeSearch).filter((s): s is SavedSearch => s !== null),
  };
}

export function loadState(): AppState {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaultState();
    return normalizeState(JSON.parse(raw));
  } catch {
    return defaultState();
  }
}

export function saveState(state: AppState): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // Storage full or blocked — the in-memory session keeps working.
  }
}

export function parseStateFile(raw: string): AppState {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error('That file is not valid JSON.');
  }
  const rec = record(parsed);
  if (!('jobs' in rec) && !('apartments' in rec) && !('settings' in rec)) {
    throw new Error('This does not look like a Vantage export.');
  }
  return normalizeState(parsed);
}

export function stateSize(state: AppState): number {
  try {
    return new Blob([JSON.stringify(state)]).size;
  } catch {
    return 0;
  }
}
