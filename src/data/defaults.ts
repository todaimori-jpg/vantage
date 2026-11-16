import type { Apartment, AppState, Job, Settings, Task } from '../types';

export const DEFAULT_SETTINGS: Settings = {
  name: '',
  roleKeywords: '',
  jobLocation: 'New York, NY',
  remoteOnly: false,
  city: 'New York',
  state: 'NY',
  neighborhoods: 'Manhattan, Brooklyn, Queens',
  rentBudget: 3200,
  maxCommute: 35,
  craigslistSite: 'newyork',
  adzunaAppId: '',
  adzunaAppKey: '',
  rentcastKey: '',
};

export function defaultState(): AppState {
  return {
    version: 1,
    settings: { ...DEFAULT_SETTINGS },
    jobs: [],
    apartments: [],
    tasks: [],
    searches: [],
  };
}

function dateAt(offsetDays: number, time?: string): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  return time ? `${iso}T${time}` : iso;
}

function makeJob(input: Omit<Job, 'createdAt' | 'updatedAt' | 'tags'> & { tags?: string[] }): Job {
  const stamp = new Date().toISOString();
  return { tags: [], ...input, createdAt: stamp, updatedAt: stamp };
}

function makeApartment(input: Omit<Apartment, 'createdAt' | 'updatedAt' | 'tags'> & { tags?: string[] }): Apartment {
  const stamp = new Date().toISOString();
  return { tags: [], ...input, createdAt: stamp, updatedAt: stamp };
}

export function demoState(): AppState {
  const jobs: Job[] = [
    makeJob({
      id: crypto.randomUUID(),
      title: 'Senior Product Manager',
      company: 'Northwind Labs',
      location: 'New York, NY',
      mode: 'hybrid',
      salaryMin: 165000,
      salaryMax: 190000,
      url: 'https://www.linkedin.com/jobs/',
      source: 'LinkedIn',
      stage: 'applied',
      priority: 4,
      appliedOn: dateAt(-6),
      nextAction: 'Follow up with the recruiter',
      nextActionOn: dateAt(2),
      contact: 'Dana R. · talent partner',
      tags: ['fintech', 'referral'],
    }),
    makeJob({
      id: crypto.randomUUID(),
      title: 'Staff Engineer, Platform',
      company: 'Kestrel Systems',
      location: 'Remote (US)',
      mode: 'remote',
      salaryMin: 200000,
      salaryMax: 240000,
      source: 'Wellfound',
      stage: 'interview',
      priority: 5,
      appliedOn: dateAt(-14),
      nextAction: 'Block 2h for system design prep',
      nextActionOn: dateAt(1),
      contact: 'Priya S. · engineering manager',
      tags: ['platform', 'remote'],
    }),
    makeJob({
      id: crypto.randomUUID(),
      title: 'Product Lead, Care Navigation',
      company: 'Beacon Health',
      location: 'New York, NY',
      mode: 'hybrid',
      salaryMin: 155000,
      salaryMax: 175000,
      source: 'Company site',
      stage: 'target',
      priority: 3,
      nextAction: 'Tailor resume for health-tech',
      nextActionOn: dateAt(3),
      tags: ['health', 'mission-driven'],
    }),
    makeJob({
      id: crypto.randomUUID(),
      title: 'Principal PM, Freight',
      company: 'Atlas Freight',
      location: 'Jersey City, NJ',
      mode: 'hybrid',
      salaryMin: 180000,
      salaryMax: 210000,
      source: 'Referral',
      stage: 'applied',
      priority: 4,
      appliedOn: dateAt(-3),
      nextAction: 'Send the case study PDF',
      nextActionOn: dateAt(0),
      tags: ['logistics'],
    }),
    makeJob({
      id: crypto.randomUUID(),
      title: 'Director of Operations',
      company: 'Meridian Co.',
      location: 'New York, NY',
      mode: 'onsite',
      salaryMin: 140000,
      salaryMax: 160000,
      stage: 'closed',
      priority: 2,
      appliedOn: dateAt(-21),
      notes: 'Role paused after final round. Recruiter said to revisit in Q1.',
      tags: ['ops'],
    }),
  ];

  const apartments: Apartment[] = [
    makeApartment({
      id: crypto.randomUUID(),
      address: '210 Bedford Ave',
      unit: '3R',
      neighborhood: 'Williamsburg, Brooklyn',
      stage: 'touring',
      rent: 3450,
      beds: 1,
      baths: 1,
      sqft: 640,
      availableFrom: dateAt(45),
      leaseMonths: 12,
      deposit: 3450,
      brokerFee: 0,
      lastMonth: false,
      pets: 'Cats ok, dogs on approval',
      laundry: 'in-unit',
      commuteMin: 27,
      rating: 5,
      url: 'https://streeteasy.com/for-rent/williamsburg',
      source: 'StreetEasy',
      contact: 'Lena · listing agent',
      tourAt: dateAt(1, '18:30'),
      pros: 'Sunny corner unit, in-unit washer/dryer, roof deck, 12 min walk to the L.',
      cons: 'Weekend street noise. No gym in the building.',
      tags: ['pre-war', 'roof deck', 'pet friendly'],
    }),
    makeApartment({
      id: crypto.randomUUID(),
      address: '88 Morningside Dr',
      unit: '5C',
      neighborhood: 'Morningside Heights, Manhattan',
      stage: 'shortlist',
      rent: 2950,
      beds: 1,
      baths: 1,
      sqft: 700,
      availableFrom: dateAt(30),
      leaseMonths: 12,
      deposit: 2950,
      brokerFee: 2950,
      pets: 'No pets',
      laundry: 'in-building',
      commuteMin: 33,
      rating: 4,
      url: 'https://streeteasy.com/for-rent/morningside-heights',
      source: 'StreetEasy',
      pros: 'Big pre-war layout, elevator, near the park.',
      cons: 'Broker fee, no in-unit laundry.',
      tags: ['pre-war', 'elevator'],
    }),
    makeApartment({
      id: crypto.randomUUID(),
      address: '45-20 Skillman Ave',
      unit: '2F',
      neighborhood: 'Sunnyside, Queens',
      stage: 'contacted',
      rent: 2350,
      beds: 1,
      baths: 1,
      sqft: 610,
      availableFrom: dateAt(20),
      leaseMonths: 12,
      deposit: 2350,
      brokerFee: 0,
      pets: 'Cats ok',
      laundry: 'in-building',
      commuteMin: 38,
      rating: 3,
      url: 'https://www.apartments.com/new-york-ny/',
      source: 'Apartments.com',
      contact: 'Owner listed directly',
      pros: 'Great price, quiet block, 7 train nearby.',
      cons: 'Longer commute, small kitchen.',
      tags: ['value'],
    }),
    makeApartment({
      id: crypto.randomUUID(),
      address: '500 W 43rd St',
      unit: '12A',
      neighborhood: "Hell's Kitchen, Manhattan",
      stage: 'applied',
      rent: 3850,
      beds: 0,
      baths: 1,
      sqft: 520,
      availableFrom: dateAt(15),
      leaseMonths: 14,
      deposit: 3850,
      brokerFee: 0,
      lastMonth: true,
      pets: 'Pets ok',
      laundry: 'in-unit',
      commuteMin: 22,
      rating: 4,
      url: 'https://www.zillow.com/rentals/',
      source: 'Zillow',
      pros: 'Doorman, gym, in-unit laundry, 22 min door-to-door.',
      cons: 'Studio layout. One month free prorated over 14 months.',
      tags: ['doorman', 'gym', 'elevator'],
    }),
  ];

  const tasks: Task[] = [
    { id: crypto.randomUUID(), title: 'Ask Marisol for the Beacon referral', due: dateAt(1), done: false, createdAt: new Date().toISOString() },
    { id: crypto.randomUUID(), title: 'Order renters insurance quotes', due: dateAt(5), done: false, createdAt: new Date().toISOString() },
    { id: crypto.randomUUID(), title: 'Update portfolio case study PDF', due: dateAt(2), done: false, createdAt: new Date().toISOString() },
  ];

  return { version: 1, settings: { ...DEFAULT_SETTINGS }, jobs, apartments, tasks, searches: [] };
}
