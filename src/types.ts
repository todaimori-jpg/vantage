export type View = 'command' | 'jobs' | 'homes' | 'search' | 'settings';

export const JOB_STAGES = ['target', 'applied', 'interview', 'offer', 'closed'] as const;
export type JobStage = (typeof JOB_STAGES)[number];

export const JOB_STAGE_META: Record<JobStage, { label: string; color: string }> = {
  target: { label: 'Targets', color: '#8b9bab' },
  applied: { label: 'Applied', color: '#6cc4ff' },
  interview: { label: 'Interviewing', color: '#ffb454' },
  offer: { label: 'Offer', color: '#63f2b4' },
  closed: { label: 'Closed', color: '#5c6b78' },
};

export const HOME_STAGES = ['shortlist', 'contacted', 'touring', 'applied', 'leased', 'passed'] as const;
export type HomeStage = (typeof HOME_STAGES)[number];

export const HOME_STAGE_META: Record<HomeStage, { label: string; color: string }> = {
  shortlist: { label: 'Shortlist', color: '#8b9bab' },
  contacted: { label: 'Contacted', color: '#6cc4ff' },
  touring: { label: 'Touring', color: '#ffb454' },
  applied: { label: 'Applied', color: '#b69cff' },
  leased: { label: 'Leased', color: '#63f2b4' },
  passed: { label: 'Passed', color: '#5c6b78' },
};

export type WorkMode = 'onsite' | 'hybrid' | 'remote';
export type Laundry = 'in-unit' | 'in-building' | 'none';

export interface Job {
  id: string;
  title: string;
  company: string;
  location: string;
  mode: WorkMode;
  salaryMin?: number;
  salaryMax?: number;
  url?: string;
  source?: string;
  stage: JobStage;
  priority: number;
  appliedOn?: string;
  nextAction?: string;
  nextActionOn?: string;
  contact?: string;
  notes?: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Apartment {
  id: string;
  address: string;
  unit?: string;
  neighborhood?: string;
  stage: HomeStage;
  rent?: number;
  beds?: number;
  baths?: number;
  sqft?: number;
  availableFrom?: string;
  leaseMonths?: number;
  deposit?: number;
  brokerFee?: number;
  lastMonth?: boolean;
  pets?: string;
  laundry?: Laundry;
  commuteMin?: number;
  rating?: number;
  url?: string;
  source?: string;
  contact?: string;
  tourAt?: string;
  pros?: string;
  cons?: string;
  notes?: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Task {
  id: string;
  title: string;
  due?: string;
  done: boolean;
  createdAt: string;
}

export interface HomeFilters {
  area: string;
  minRent: string;
  maxRent: string;
  beds: string;
  baths: string;
  pets: boolean;
}

export interface JobFilters {
  q: string;
  location: string;
  remote: boolean;
}

export type SavedSearch =
  | { id: string; kind: 'homes'; name: string; filters: HomeFilters; createdAt: string }
  | { id: string; kind: 'jobs'; name: string; filters: JobFilters; createdAt: string };

export interface Settings {
  name: string;
  roleKeywords: string;
  jobLocation: string;
  remoteOnly: boolean;
  city: string;
  state: string;
  neighborhoods: string;
  rentBudget: number;
  maxCommute: number;
  craigslistSite: string;
  adzunaAppId: string;
  adzunaAppKey: string;
  rentcastKey: string;
}

export interface AppState {
  version: number;
  settings: Settings;
  jobs: Job[];
  apartments: Apartment[];
  tasks: Task[];
  searches: SavedSearch[];
}
