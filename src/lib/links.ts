import type { HomeFilters, JobFilters, Settings } from '../types';
import { formatMoney } from './format';

export type LinkGroup = 'marketplace' | 'rooms' | 'local';

export const HOME_GROUPS: { id: LinkGroup; label: string; blurb: string }[] = [
  { id: 'marketplace', label: 'Listing marketplaces', blurb: 'Full-unit inventory across the metro' },
  { id: 'rooms', label: 'Rooms, housemates & co-living', blurb: 'Shared homes and people seeking roommates' },
  { id: 'local', label: 'City-specific & no-fee', blurb: 'Local specialists, direct posts, and takeovers' },
];

export interface ServiceLink {
  id: string;
  name: string;
  blurb: string;
  tag?: string;
  url: string;
  note?: string;
  group?: LinkGroup;
}

export function slug(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function toNumber(value: string): number | undefined {
  if (!value.trim()) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function setIf(params: URLSearchParams, key: string, value: string | number | undefined) {
  if (value !== undefined && value !== '') params.set(key, String(value));
}

function query(params: URLSearchParams): string {
  const value = params.toString();
  return value ? `?${value}` : '';
}

function marketLabel(settings: Settings): string {
  return [settings.city.trim(), settings.state.trim().toUpperCase()].filter(Boolean).join(', ');
}

function withArea(area: string, settings: Settings): string {
  return [area.trim(), marketLabel(settings)].filter(Boolean).join(', ');
}

export function buildHomeLinks(filters: HomeFilters, settings: Settings): ServiceLink[] {
  const min = toNumber(filters.minRent);
  const max = toNumber(filters.maxRent);
  const beds = toNumber(filters.beds);
  const baths = toNumber(filters.baths);
  const stateCode = settings.state.trim().toLowerCase();
  const cityOnly = slug(settings.city);
  const citySlug = `${cityOnly}-${stateCode}`;
  const areaSlug = filters.area.trim() ? slug(filters.area) : '';
  const craigslistHost = (settings.craigslistSite.trim() || 'www').replace(/\.craigslist\.org$/, '');
  const links: ServiceLink[] = [];

  const zillowFilters: Record<string, unknown> = {
    fr: { value: true },
    apa: { value: true },
    condo: { value: true },
    townhouse: { value: true },
  };
  const price: Record<string, number> = {};
  if (min) price.min = min;
  if (max) price.max = max;
  if (Object.keys(price).length) zillowFilters.price = price;
  if (beds) zillowFilters.beds = { min: beds };
  if (baths) zillowFilters.baths = { min: baths };
  if (filters.pets) zillowFilters.pet = { value: true };
  const searchQueryState = {
    pagination: {},
    usersSearchTerm: withArea(filters.area, settings),
    isMapVisible: false,
    filterState: zillowFilters,
    isListVisible: true,
  };
  links.push({
    id: 'zillow',
    name: 'Zillow',
    blurb: 'Largest US rental index, strong map search.',
    tag: 'Broadest',
    url: `https://www.zillow.com/homes/for_rent/?searchQueryState=${encodeURIComponent(JSON.stringify(searchQueryState))}`,
    group: 'marketplace',
  });

  if (settings.state.trim().toUpperCase() === 'NY') {
    const params = new URLSearchParams();
    if (min || max) params.set('price', `${min ?? ''}:${max ?? ''}`);
    if (beds) params.set('beds', String(beds));
    if (baths) params.set('baths', String(baths));
    links.push({
      id: 'streeteasy',
      name: 'StreetEasy',
      blurb: 'NYC-native listings, no-dupe inventory, honest fees.',
      tag: 'Best for NYC',
      url: `https://streeteasy.com/for-rent/${areaSlug || 'nyc'}${query(params)}`,
      group: 'local',
    });
  }

  let apartmentsPath = `https://www.apartments.com/${citySlug}/`;
  const pathParts: string[] = [];
  if (beds) pathParts.push(`${beds}-bedrooms`);
  if (min && max) pathParts.push(`${min}-to-${max}`);
  else if (max) pathParts.push(`under-${max}`);
  if (pathParts.length) apartmentsPath += `${pathParts.join('/')}/`;
  links.push({
    id: 'apartments',
    name: 'Apartments.com',
    blurb: 'Managed buildings and large complexes.',
    url: apartmentsPath,
    note: 'Price filters are best-effort; adjust the sliders on site.',
    group: 'marketplace',
  });

  const hotpadsParams = new URLSearchParams();
  if (beds) hotpadsParams.set('beds', String(beds));
  if (min || max) hotpadsParams.set('price', `${min ?? ''}-${max ?? ''}`);
  links.push({
    id: 'hotpads',
    name: 'HotPads',
    blurb: 'Map-first rental search across the metro.',
    url: `https://hotpads.com/${citySlug}/apartments-for-rent${query(hotpadsParams)}`,
    group: 'marketplace',
  });

  const truliaParams = new URLSearchParams();
  if (beds) truliaParams.set('beds', String(beds));
  setIf(truliaParams, 'min_price', min);
  setIf(truliaParams, 'max_price', max);
  links.push({
    id: 'trulia',
    name: 'Trulia',
    blurb: 'Neighborhood data layered on listings.',
    url: `https://www.trulia.com/for_rent/${settings.city.trim().replace(/\s+/g, '_')},${settings.state.trim().toUpperCase()}/${query(truliaParams)}`,
    group: 'marketplace',
  });

  const realtorParams = new URLSearchParams();
  setIf(realtorParams, 'price_min', min);
  setIf(realtorParams, 'price_max', max);
  setIf(realtorParams, 'beds_min', beds);
  links.push({
    id: 'realtor',
    name: 'Realtor.com',
    blurb: 'MLS-backed inventory plus rentals.',
    url: `https://www.realtor.com/apartments/${settings.city.trim().replace(/\s+/g, '_')}_${settings.state.trim().toUpperCase()}${query(realtorParams)}`,
    group: 'marketplace',
  });

  const craigslistParams = new URLSearchParams({ availabilityMode: '0' });
  setIf(craigslistParams, 'min_price', min);
  setIf(craigslistParams, 'max_price', max);
  setIf(craigslistParams, 'min_bedrooms', beds);
  if (filters.pets) {
    craigslistParams.set('pets_cat', '1');
    craigslistParams.set('pets_dog', '1');
  }
  links.push({
    id: 'craigslist',
    name: 'Craigslist apartments',
    blurb: 'No-fee owner listings and quick turnover.',
    tag: 'No-fee',
    url: `https://${craigslistHost}.craigslist.org/search/apa${query(craigslistParams)}`,
    group: 'local',
  });

  const zumperParams = new URLSearchParams();
  setIf(zumperParams, 'price_min', min);
  setIf(zumperParams, 'price_max', max);
  setIf(zumperParams, 'beds', beds);
  links.push({
    id: 'zumper',
    name: 'Zumper',
    blurb: 'Modern rental marketplace with direct booking.',
    url: `https://www.zumper.com/apartments-for-rent/${citySlug}${query(zumperParams)}`,
    group: 'marketplace',
  });

  const rentHopParams = new URLSearchParams();
  setIf(rentHopParams, 'min_price', min);
  setIf(rentHopParams, 'max_price', max);
  setIf(rentHopParams, 'min_beds', beds);
  setIf(rentHopParams, 'max_beds', beds);
  links.push({
    id: 'renthop',
    name: 'RentHop',
    blurb: 'Ranked listings with quality signals.',
    tag: settings.state.trim().toUpperCase() === 'NY' ? 'NYC' : undefined,
    url: `https://www.renthop.com/search/nyc${query(rentHopParams)}`,
    group: 'marketplace',
  });

  links.push({
    id: 'facebook',
    name: 'Facebook Marketplace',
    blurb: 'Sublets, roommate shares, and off-market units.',
    tag: 'Off-market',
    url: 'https://www.facebook.com/marketplace/category/propertyrentals',
    note: 'Set the radius to your target neighborhoods.',
    group: 'rooms',
  });

  links.push({
    id: 'apartmentlist',
    name: 'Apartment List',
    blurb: 'Mobile-first marketplace with strong neighborhood filters.',
    url: `https://www.apartmentlist.com/${stateCode}/${cityOnly}`,
    group: 'marketplace',
  });
  links.push({
    id: 'rentcom',
    name: 'Rent.com',
    blurb: 'Long-running marketplace with promo-heavy inventory.',
    url: `https://www.rent.com/${stateCode}/${cityOnly}-apartments`,
    group: 'marketplace',
  });
  links.push({
    id: 'rentcafe',
    name: 'RentCafe',
    blurb: 'Managed communities, straight from landlords.',
    url: `https://www.rentcafe.com/apartments-for-rent/us/${stateCode}/${cityOnly}/`,
    group: 'marketplace',
  });
  links.push({
    id: 'redfin',
    name: 'Redfin Rentals',
    blurb: 'Agent-backed listings with rental market data.',
    note: 'Set your city and filters on site.',
    url: 'https://www.redfin.com/rentals',
    group: 'marketplace',
  });
  links.push({
    id: 'compass',
    name: 'Compass',
    blurb: 'Agent-listed rentals, strongest on premium inventory.',
    url: `https://www.compass.com/for-rent/${citySlug}/`,
    group: 'marketplace',
  });

  const roomSearch = `${settings.city.trim()}, ${settings.state.trim().toUpperCase()}`;
  links.push({
    id: 'spareroom',
    name: 'SpareRoom',
    blurb: 'The largest roommate site. Rooms in existing shares, not whole units.',
    tag: 'Roommates',
    note: 'Set rent range and move-in date on site.',
    url: `https://www.spareroom.com/roommate/search.pl?search=${encodeURIComponent(roomSearch)}&flatshare_type=offered&action=search`,
    group: 'rooms',
  });
  links.push({
    id: 'roommatescom',
    name: 'Roommates.com',
    blurb: 'Profile matching for people seeking a room or a new roommate.',
    tag: 'Roommates',
    url: `https://www.roommates.com/roommate-finder/${citySlug}`,
    group: 'rooms',
  });
  links.push({
    id: 'diggz',
    name: 'Diggz',
    blurb: 'App-first roommate finder with video profiles and NYC depth.',
    tag: 'Roommates',
    note: 'Choose your city in the app.',
    url: 'https://diggz.co/',
    group: 'rooms',
  });

  const roomParams = new URLSearchParams({ availabilityMode: '0' });
  setIf(roomParams, 'min_price', min);
  setIf(roomParams, 'max_price', max);
  if (filters.pets) {
    roomParams.set('pets_cat', '1');
    roomParams.set('pets_dog', '1');
  }
  links.push({
    id: 'craigslist-rooms',
    name: 'Craigslist rooms',
    blurb: 'Rooms, shares, and sublets posted by current tenants.',
    note: 'Verify in person before paying.',
    url: `https://${craigslistHost}.craigslist.org/search/roo${query(roomParams)}`,
    group: 'rooms',
  });

  links.push({
    id: 'listingsproject',
    name: 'Listings Project',
    blurb: 'Curated weekly list of rooms and sublets, NYC-heavy.',
    tag: 'Curated',
    url: 'https://www.listingsproject.com/listings',
    group: 'rooms',
  });
  links.push({
    id: 'outpost',
    name: 'Outpost Club',
    blurb: 'Furnished co-living rooms with one all-in bill.',
    tag: 'Co-living',
    url: 'https://outpost.me/',
    group: 'rooms',
  });

  if (stateCode === 'ny') {
    links.push({
      id: 'nooklyn',
      name: 'Nooklyn',
      blurb: 'Brooklyn-led no-fee rentals with neighborhood guides.',
      tag: 'No-fee',
      url: 'https://nooklyn.com/rentals',
      group: 'local',
    });
    links.push({
      id: 'leasebreak',
      name: 'LeaseBreak',
      blurb: 'Short-notice leases and takeovers, mostly no-fee.',
      tag: 'No-fee',
      note: 'NYC focus; set neighborhoods on site.',
      url: 'https://www.leasebreak.com/',
      group: 'local',
    });
    links.push({
      id: 'cityrealty',
      name: 'CityRealty',
      blurb: 'NYC rental buildings with no-fee filters and floorplans.',
      url: 'https://www.cityrealty.com/nyc/rentals',
      group: 'local',
    });
    links.push({
      id: 'housingconnect',
      name: 'NYC Housing Connect',
      blurb: 'Official affordable-housing lotteries for NYC apartments.',
      tag: 'Official',
      url: 'https://housingconnect.nyc.gov/PublicWeb/',
      group: 'local',
    });
  }

  return links;
}

export function buildJobLinks(filters: JobFilters, settings: Settings): ServiceLink[] {
  const q = filters.q.trim() || settings.roleKeywords.trim() || 'product manager';
  const loc = filters.location.trim() || settings.jobLocation.trim() || marketLabel(settings);
  const encodedQ = encodeURIComponent(q);
  const encodedLoc = encodeURIComponent(loc);
  const links: ServiceLink[] = [];

  links.push({
    id: 'linkedin',
    name: 'LinkedIn Jobs',
    blurb: 'Widest professional network; alerts and referral paths.',
    tag: 'Start here',
    url: `https://www.linkedin.com/jobs/search/?keywords=${encodedQ}&location=${encodedLoc}&f_TPR=r604800${filters.remote ? '&f_WT=2' : ''}`,
  });

  links.push({
    id: 'indeed',
    name: 'Indeed',
    blurb: 'Highest volume aggregator; good for market pulse.',
    url: `https://www.indeed.com/jobs?q=${encodedQ}&l=${encodedLoc}&fromage=7${filters.remote ? '&sc=0kf%3Aattr(DSQF7)%3B' : ''}`,
  });

  links.push({
    id: 'google',
    name: 'Google Jobs',
    blurb: 'Aggregates boards and company pages in one view.',
    url: `https://www.google.com/search?q=${encodeURIComponent(`${q} jobs ${loc}${filters.remote ? ' remote' : ''}`)}&ibp=htl;jobs`,
  });

  links.push({
    id: 'glassdoor',
    name: 'Glassdoor',
    blurb: 'Pair each opening with salary and interview intel.',
    url: `https://www.glassdoor.com/Job/jobs.htm?sc.keyword=${encodedQ}&locKeyword=${encodedLoc}${filters.remote ? '&remoteWorkType=1' : ''}`,
  });

  links.push({
    id: 'wellfound',
    name: 'Wellfound',
    blurb: 'Startup roles with salary and equity up front.',
    tag: 'Startups',
    url: `https://wellfound.com/jobs?query=${encodedQ}${filters.remote ? '&remote=true' : ''}`,
  });

  links.push({
    id: 'builtin',
    name: 'Built In',
    blurb: 'Tech-hub companies with culture profiles.',
    url: `https://builtin.com/jobs?search=${encodedQ}&location=${encodedLoc}`,
  });

  links.push({
    id: 'adzuna',
    name: 'Adzuna',
    blurb: 'Cross-board aggregator. Connect the API for native results.',
    url: `https://www.adzuna.com/search?q=${encodedQ}&loc=${encodedLoc}`,
  });

  links.push({
    id: 'simplyhired',
    name: 'SimplyHired',
    blurb: 'Another sweep for postings that boards miss.',
    url: `https://www.simplyhired.com/search?q=${encodedQ}&l=${encodedLoc}`,
  });

  return links;
}

export function composeHomeBrief(filters: HomeFilters, settings: Settings): string {
  const lines = [
    'VANTAGE — HOME SEARCH BRIEF',
    `Market: ${withArea(filters.area, settings)}`,
    `Budget: ${filters.minRent ? `$${filters.minRent}` : 'any'} – ${filters.maxRent ? `$${filters.maxRent}/mo` : 'any'}`,
    `Beds: ${filters.beds || 'any'} · Baths: ${filters.baths || 'any'} · Pets: ${filters.pets ? 'required' : 'no preference'}`,
    `Neighborhoods in scope: ${settings.neighborhoods || 'not set'}`,
    `Commute target: ≤ ${settings.maxCommute} min`,
    '',
    'Rank each listing on: total move-in cost, $/sqft, commute, laundry, natural light, and lease flexibility. Flag fees and broker costs explicitly.',
  ];
  return lines.join('\n');
}

export function composeJobBrief(filters: JobFilters, settings: Settings): string {
  const q = filters.q.trim() || settings.roleKeywords || 'target role';
  const loc = filters.location.trim() || settings.jobLocation;
  return [
    'VANTAGE — JOB SEARCH BRIEF',
    `Target: ${q}`,
    `Location: ${loc}${filters.remote ? ' (remote or remote-first)' : ''}`,
    settings.remoteOnly ? 'Remote only: yes' : 'Remote only: no',
    '',
    'For each company, capture: role scope, comp range, team stage, growth path, interview loop, and a named human to contact. Prioritize warm-path companies over volume.',
  ].join('\n');
}

export function formatSearchCriteria(filters: HomeFilters): string {
  const parts = [];
  if (filters.area) parts.push(filters.area);
  if (filters.minRent || filters.maxRent) {
    parts.push(`${filters.minRent ? formatMoney(Number(filters.minRent)) : 'any'}–${filters.maxRent ? formatMoney(Number(filters.maxRent)) : 'any'}`);
  }
  if (filters.beds) parts.push(`${filters.beds} bd`);
  if (filters.baths) parts.push(`${filters.baths} ba`);
  if (filters.pets) parts.push('pets');
  return parts.join(' · ') || 'No filters';
}
