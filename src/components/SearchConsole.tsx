import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowUpRight,
  BookmarkPlus,
  Briefcase,
  Building2,
  Copy,
  ExternalLink,
  RefreshCw,
  Trash2,
  Wand2,
} from 'lucide-react';
import type { Apartment, HomeFilters, Job, JobFilters, SavedSearch, View } from '../types';
import { useApp } from '../store';
import { Field, PanelHead, Toggle } from './ui';
import {
  HOME_GROUPS,
  buildHomeLinks,
  buildJobLinks,
  composeHomeBrief,
  composeJobBrief,
  formatSearchCriteria,
  type ServiceLink,
} from '../lib/links';
import { fetchAdzunaJobs, fetchRentcast, type LiveHome, type LiveJob } from '../lib/live';
import { formatMoney, uid } from '../lib/format';

type Mode = 'homes' | 'jobs';

function SourceCard({ link }: { link: ServiceLink }) {
  return (
    <a className="svc" href={link.url} target="_blank" rel="noreferrer noopener">
      <div className="svc__top">
        <span className="svc__name">{link.name}</span>
        <ArrowUpRight size={15} className="svc__arrow" />
      </div>
      <p className="svc__blurb">{link.blurb}</p>
      <div className="svc__foot">
        {link.tag ? <span className="tag">{link.tag}</span> : <span />}
        {link.note ? <span className="svc__note">{link.note}</span> : null}
      </div>
    </a>
  );
}

export function SearchConsole({ onNavigate }: { onNavigate: (view: View) => void }) {
  const { state, actions } = useApp();
  const { settings, searches } = state;

  const [mode, setMode] = useState<Mode>('homes');
  const [homeFilters, setHomeFilters] = useState<HomeFilters>(() => ({
    area: '',
    minRent: '',
    maxRent: settings.rentBudget ? String(settings.rentBudget) : '',
    beds: '',
    baths: '',
    pets: false,
  }));
  const [jobFilters, setJobFilters] = useState<JobFilters>(() => ({
    q: settings.roleKeywords,
    location: settings.jobLocation,
    remote: settings.remoteOnly,
  }));
  const [toast, setToast] = useState('');

  const [homeResults, setHomeResults] = useState<LiveHome[] | null>(null);
  const [homeError, setHomeError] = useState('');
  const [homeLoading, setHomeLoading] = useState(false);
  const [savedHomeIds, setSavedHomeIds] = useState<string[]>([]);

  const [jobResults, setJobResults] = useState<LiveJob[] | null>(null);
  const [jobError, setJobError] = useState('');
  const [jobLoading, setJobLoading] = useState(false);
  const [savedJobIds, setSavedJobIds] = useState<string[]>([]);

  const toastTimer = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (toastTimer.current) window.clearTimeout(toastTimer.current);
    };
  }, []);

  const notify = (message: string) => {
    setToast(message);
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(''), 2600);
  };

  const market = `${settings.city}, ${settings.state}`;
  const homeLinks = useMemo(() => buildHomeLinks(homeFilters, settings), [homeFilters, settings]);
  const jobLinks = useMemo(() => buildJobLinks(jobFilters, settings), [jobFilters, settings]);
  const links = mode === 'homes' ? homeLinks : jobLinks;
  const homeGroups = useMemo(
    () =>
      HOME_GROUPS.map((group) => ({
        ...group,
        links: homeLinks.filter((link) => link.group === group.id),
      })).filter((group) => group.links.length > 0),
    [homeLinks],
  );
  const presets = settings.neighborhoods
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)
    .slice(0, 6);

  const copyBrief = async () => {
    const brief = mode === 'homes' ? composeHomeBrief(homeFilters, settings) : composeJobBrief(jobFilters, settings);
    try {
      await navigator.clipboard.writeText(brief);
      notify('Search brief copied.');
    } catch {
      notify('Clipboard blocked by the browser.');
    }
  };

  const saveSearch = () => {
    const now = new Date().toISOString();
    if (mode === 'homes') {
      const name = [
        homeFilters.area || `${settings.city} metro`,
        homeFilters.beds ? `${homeFilters.beds} bd` : 'any beds',
        homeFilters.maxRent ? `≤ ${formatMoney(Number(homeFilters.maxRent))}` : '',
      ]
        .filter(Boolean)
        .join(' · ');
      actions.addSearch({ id: uid(), kind: 'homes', name, filters: homeFilters, createdAt: now });
    } else {
      const name = [jobFilters.q || 'Any role', jobFilters.location || 'Any location'].join(' · ');
      actions.addSearch({ id: uid(), kind: 'jobs', name, filters: jobFilters, createdAt: now });
    }
    notify('Search saved to the library.');
  };

  const runSaved = (search: SavedSearch) => {
    if (search.kind === 'homes') {
      setMode('homes');
      setHomeFilters(search.filters);
    } else {
      setMode('jobs');
      setJobFilters(search.filters);
    }
    notify('Filters loaded.');
  };

  const runRentcast = async () => {
    setHomeLoading(true);
    setHomeError('');
    try {
      const rows = await fetchRentcast({
        key: settings.rentcastKey,
        city: settings.city,
        state: settings.state,
        minRent: homeFilters.minRent,
        maxRent: homeFilters.maxRent,
        beds: homeFilters.beds,
      });
      setHomeResults(rows);
    } catch (error) {
      setHomeResults(null);
      setHomeError(error instanceof Error ? error.message : 'The request failed.');
    } finally {
      setHomeLoading(false);
    }
  };

  const saveLiveHome = (row: LiveHome) => {
    const stamp = new Date().toISOString();
    const apartment: Apartment = {
      id: uid(),
      address: row.address,
      neighborhood: [row.city, row.state].filter(Boolean).join(', '),
      stage: 'shortlist',
      rent: row.rent,
      beds: row.beds,
      baths: row.baths,
      sqft: row.sqft,
      source: 'Rentcast',
      tags: row.propertyType ? [row.propertyType] : [],
      createdAt: stamp,
      updatedAt: stamp,
    };
    actions.saveApartment(apartment);
    setSavedHomeIds((ids) => [...ids, row.id]);
    notify('Listing added to the board.');
  };

  const runAdzuna = async () => {
    setJobLoading(true);
    setJobError('');
    try {
      const rows = await fetchAdzunaJobs({
        appId: settings.adzunaAppId,
        appKey: settings.adzunaAppKey,
        what: jobFilters.q,
        where: jobFilters.location,
        remoteOnly: jobFilters.remote,
      });
      setJobResults(rows);
    } catch (error) {
      setJobResults(null);
      setJobError(error instanceof Error ? error.message : 'The request failed.');
    } finally {
      setJobLoading(false);
    }
  };

  const saveLiveJob = (row: LiveJob) => {
    const stamp = new Date().toISOString();
    const job: Job = {
      id: uid(),
      title: row.title,
      company: row.company,
      location: row.location,
      mode: jobFilters.remote ? 'remote' : 'hybrid',
      salaryMin: row.salaryMin,
      salaryMax: row.salaryMax,
      url: row.url,
      source: 'Adzuna',
      stage: 'target',
      priority: 3,
      tags: [],
      createdAt: stamp,
      updatedAt: stamp,
    };
    actions.saveJob(job);
    setSavedJobIds((ids) => [...ids, row.id]);
    notify('Role added to the pipeline.');
  };

  return (
    <>
      <header className="page-head">
        <div>
          <p className="eyebrow">Query console</p>
          <h1>Search the market</h1>
          <p className="page-sub">Every rental site and job board, fired in one pass with your filters attached. Save what matters.</p>
        </div>
        <div className="page-actions">
          <div className="segmented" role="tablist" aria-label="Search type">
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'homes'}
              className={mode === 'homes' ? 'seg is-active' : 'seg'}
              onClick={() => setMode('homes')}
            >
              <Building2 size={14} /> Homes
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'jobs'}
              className={mode === 'jobs' ? 'seg is-active' : 'seg'}
              onClick={() => setMode('jobs')}
            >
              <Briefcase size={14} /> Jobs
            </button>
          </div>
        </div>
      </header>

      <section className="panel">
        <div className="console-head">
          <div>
            <p className="eyebrow">{mode === 'homes' ? 'Housing query' : 'Role query'}</p>
            <h3>{mode === 'homes' ? 'Define the sweep' : 'Define the target'}</h3>
          </div>
          <button type="button" className="link-btn" onClick={() => onNavigate('settings')}>
            <Wand2 size={13} /> Market: {market}
          </button>
        </div>

        {mode === 'homes' ? (
          <>
            {presets.length > 0 ? (
              <div className="presets">
                <span className="mono-dim">Jump to</span>
                <button type="button" className={!homeFilters.area ? 'preset is-active' : 'preset'} onClick={() => setHomeFilters((f) => ({ ...f, area: '' }))}>
                  Whole city
                </button>
                {presets.map((preset) => (
                  <button
                    type="button"
                    key={preset}
                    className={homeFilters.area === preset ? 'preset is-active' : 'preset'}
                    onClick={() => setHomeFilters((f) => ({ ...f, area: preset }))}
                  >
                    {preset}
                  </button>
                ))}
              </div>
            ) : null}
            <div className="filter-grid">
              <Field label="Neighborhood / area" span>
                <input
                  value={homeFilters.area}
                  onChange={(event) => setHomeFilters((f) => ({ ...f, area: event.target.value }))}
                  placeholder="e.g. Williamsburg — leave blank for the whole metro"
                />
              </Field>
              <Field label="Min rent">
                <input
                  type="number"
                  inputMode="numeric"
                  value={homeFilters.minRent}
                  onChange={(event) => setHomeFilters((f) => ({ ...f, minRent: event.target.value }))}
                  placeholder="1500"
                />
              </Field>
              <Field label="Max rent">
                <input
                  type="number"
                  inputMode="numeric"
                  value={homeFilters.maxRent}
                  onChange={(event) => setHomeFilters((f) => ({ ...f, maxRent: event.target.value }))}
                  placeholder="3200"
                />
              </Field>
              <Field label="Beds">
                <select value={homeFilters.beds} onChange={(event) => setHomeFilters((f) => ({ ...f, beds: event.target.value }))}>
                  <option value="">Any</option>
                  <option value="0">Studio</option>
                  <option value="1">1+</option>
                  <option value="2">2+</option>
                  <option value="3">3+</option>
                  <option value="4">4+</option>
                </select>
              </Field>
              <Field label="Baths">
                <select value={homeFilters.baths} onChange={(event) => setHomeFilters((f) => ({ ...f, baths: event.target.value }))}>
                  <option value="">Any</option>
                  <option value="1">1+</option>
                  <option value="1.5">1.5+</option>
                  <option value="2">2+</option>
                  <option value="3">3+</option>
                </select>
              </Field>
              <div className="filter-toggle">
                <Toggle label="Pet friendly" checked={homeFilters.pets} onChange={(pets) => setHomeFilters((f) => ({ ...f, pets }))} />
              </div>
            </div>
          </>
        ) : (
          <div className="filter-grid">
            <Field label="Role keywords" span>
              <input
                value={jobFilters.q}
                onChange={(event) => setJobFilters((f) => ({ ...f, q: event.target.value }))}
                placeholder="e.g. Senior Product Manager, fintech"
              />
            </Field>
            <Field label="Location">
              <input
                value={jobFilters.location}
                onChange={(event) => setJobFilters((f) => ({ ...f, location: event.target.value }))}
                placeholder="New York, NY or Remote"
              />
            </Field>
            <div className="filter-toggle">
              <Toggle label="Remote only" checked={jobFilters.remote} onChange={(remote) => setJobFilters((f) => ({ ...f, remote }))} />
            </div>
          </div>
        )}

        <div className="filter-actions">
          <span className="mono-dim">
            {mode === 'homes'
              ? `${market} · ${homeFilters.beds ? `${homeFilters.beds} bd` : 'any beds'} · ${homeFilters.maxRent ? `≤ ${formatMoney(Number(homeFilters.maxRent))}` : 'no cap'}`
              : `${jobFilters.q || 'Any role'} · ${jobFilters.location || 'Any location'}${jobFilters.remote ? ' · remote' : ''}`}
          </span>
          <span className="dialog__spacer" />
          <button type="button" className="btn btn--ghost" onClick={copyBrief}>
            <Copy size={14} /> Copy brief
          </button>
          <button type="button" className="btn" onClick={saveSearch}>
            <BookmarkPlus size={14} /> Save search
          </button>
        </div>
      </section>

      <div className="section-head">
        <div>
          <p className="eyebrow">Destinations</p>
          <h2>Open a source</h2>
        </div>
        <span className="mono-dim">{links.length} destinations · opens in a new tab</span>
      </div>
      {mode === 'homes' ? (
        homeGroups.map((group) => (
          <section key={group.id} className="svc-group" aria-label={group.label}>
            <div className="svc-group__head">
              <h3>{group.label}</h3>
              <span className="mono-dim">{group.blurb}</span>
            </div>
            <div className="svc-grid">
              {group.links.map((link) => (
                <SourceCard key={link.id} link={link} />
              ))}
            </div>
          </section>
        ))
      ) : (
        <div className="svc-grid">
          {links.map((link) => (
            <SourceCard key={link.id} link={link} />
          ))}
        </div>
      )}

      {mode === 'homes' ? (
        <section className="panel live">
          <PanelHead
            eyebrow="Live feed · optional"
            title="Rentcast listings"
            trailing={<span className="tag">API</span>}
          />
          {!settings.rentcastKey ? (
            <div className="live-gate">
              <p>Connect a Rentcast key to pull live rental listings here, filtered by this market and rent range.</p>
              <button type="button" className="btn" onClick={() => onNavigate('settings')}>
                Add Rentcast key
              </button>
            </div>
          ) : (
            <>
              <div className="live-actions">
                <button type="button" className="btn" onClick={runRentcast} disabled={homeLoading}>
                  <RefreshCw size={14} className={homeLoading ? 'spin' : undefined} /> {homeLoading ? 'Fetching…' : 'Fetch live listings'}
                </button>
                <span className="mono-dim">Keys stay in this browser. Free tier allows ~50 calls/month.</span>
              </div>
              {homeError ? <div className="notice notice--error">{homeError}</div> : null}
              {homeResults ? (
                homeResults.length === 0 ? (
                  <p className="mono-dim">No active listings came back for this filter set. Widen the rent range.</p>
                ) : (
                  <ul className="results">
                    {homeResults.map((row) => (
                      <li className="result" key={row.id}>
                        <div className="result__main">
                          <strong>{row.address}</strong>
                          <span>
                            {[row.city, row.state].filter(Boolean).join(', ')}
                            {row.beds !== undefined ? ` · ${row.beds} bd` : ''}
                            {row.baths !== undefined ? ` · ${row.baths} ba` : ''}
                            {row.sqft ? ` · ${row.sqft} ft²` : ''}
                          </span>
                        </div>
                        <span className="result__pay">{row.rent ? `${formatMoney(row.rent)}/mo` : '—'}</span>
                        <button
                          type="button"
                          className="btn btn--sm"
                          onClick={() => saveLiveHome(row)}
                          disabled={savedHomeIds.includes(row.id)}
                        >
                          {savedHomeIds.includes(row.id) ? 'Saved' : 'Save'}
                        </button>
                      </li>
                    ))}
                  </ul>
                )
              ) : null}
            </>
          )}
        </section>
      ) : (
        <section className="panel live">
          <PanelHead eyebrow="Live feed · optional" title="Adzuna roles" trailing={<span className="tag">API</span>} />
          {!settings.adzunaAppId || !settings.adzunaAppKey ? (
            <div className="live-gate">
              <p>Connect an Adzuna app ID and key to pull live postings here. They save straight into the pipeline.</p>
              <button type="button" className="btn" onClick={() => onNavigate('settings')}>
                Add Adzuna keys
              </button>
            </div>
          ) : (
            <>
              <div className="live-actions">
                <button type="button" className="btn" onClick={runAdzuna} disabled={jobLoading}>
                  <RefreshCw size={14} className={jobLoading ? 'spin' : undefined} /> {jobLoading ? 'Fetching…' : 'Fetch live roles'}
                </button>
                <span className="mono-dim">Keys stay in this browser. Review Adzuna’s free-tier limits.</span>
              </div>
              {jobError ? <div className="notice notice--error">{jobError}</div> : null}
              {jobResults ? (
                jobResults.length === 0 ? (
                  <p className="mono-dim">No postings returned. Broaden the keywords or location.</p>
                ) : (
                  <ul className="results">
                    {jobResults.map((row) => (
                      <li className="result" key={row.id}>
                        <div className="result__main">
                          <strong>{row.title}</strong>
                          <span>
                            {[row.company, row.location].filter(Boolean).join(' · ')}
                            {row.salaryMin ? ` · from ${formatMoney(row.salaryMin, true)}` : ''}
                          </span>
                        </div>
                        {row.url ? (
                          <a className="result__link" href={row.url} target="_blank" rel="noreferrer noopener" aria-label="Open posting">
                            <ExternalLink size={14} />
                          </a>
                        ) : null}
                        <button
                          type="button"
                          className="btn btn--sm"
                          onClick={() => saveLiveJob(row)}
                          disabled={savedJobIds.includes(row.id)}
                        >
                          {savedJobIds.includes(row.id) ? 'Saved' : 'Save'}
                        </button>
                      </li>
                    ))}
                  </ul>
                )
              ) : null}
            </>
          )}
        </section>
      )}

      <section className="panel">
        <PanelHead
          eyebrow="Library"
          title="Saved searches"
          trailing={<span className="mono-dim">{searches.length} stored</span>}
        />
        {searches.length === 0 ? (
          <p className="mono-dim">Save a filter set above and it lands here for one-tap reopening on any device you export to.</p>
        ) : (
          <ul className="saved-list">
            {searches.map((search) => (
              <li key={search.id} className="saved-row">
                <button type="button" className="saved" onClick={() => runSaved(search)}>
                  <span className="tag">{search.kind === 'homes' ? 'Home' : 'Job'}</span>
                  <span className="saved__body">
                    <strong>{search.name}</strong>
                    <span className="mono-dim">
                      {search.kind === 'homes' ? formatSearchCriteria(search.filters) : `${search.filters.q || 'Any role'} · ${search.filters.location || 'Any location'}`}
                    </span>
                  </span>
                  <span className="saved__run">
                    Run <ArrowUpRight size={12} />
                  </span>
                </button>
                <button type="button" className="icon-btn" onClick={() => actions.deleteSearch(search.id)} aria-label={`Delete ${search.name}`}>
                  <Trash2 size={14} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {toast ? (
        <div className="toast" role="status">
          {toast}
        </div>
      ) : null}
    </>
  );
}
