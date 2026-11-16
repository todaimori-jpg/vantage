import { useEffect, useMemo, useState } from 'react';
import {
  ArrowUpRight,
  Database,
  Download,
  HardDriveDownload,
  KeyRound,
  MapPin,
  PlugZap,
  Smartphone,
  Upload,
  UserRound,
} from 'lucide-react';
import { useApp } from '../store';
import type { Settings } from '../types';
import { DangerButton, Field, PanelHead, Toggle } from './ui';
import { parseStateFile, stateSize } from '../lib/storage';
import { testAdzuna, testRentcast } from '../lib/live';
import { INSTALL_EVENT, installAvailable, isIOS, isStandalone, promptInstall } from '../lib/install';
import { timeAgo } from '../lib/format';

type ConnState = { status: 'idle' | 'loading' | 'ok' | 'error'; message: string };

const RENTCAST_URL = 'https://app.rentcast.io/app/api';
const ADZUNA_URL = 'https://developer.adzuna.com/';

export function SettingsView() {
  const { state, actions, savedAt } = useApp();
  const { settings } = state;

  const [adzuna, setAdzuna] = useState<ConnState>({ status: 'idle', message: '' });
  const [rentcast, setRentcast] = useState<ConnState>({ status: 'idle', message: '' });
  const [notice, setNotice] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);
  const [installable, setInstallable] = useState(installAvailable());

  const standalone = useMemo(() => isStandalone(), []);
  const ios = useMemo(() => isIOS(), []);

  useEffect(() => {
    const onInstallable = () => setInstallable(true);
    window.addEventListener(INSTALL_EVENT, onInstallable);
    return () => window.removeEventListener(INSTALL_EVENT, onInstallable);
  }, []);

  const set = (patch: Partial<Settings>) => actions.patchSettings(patch);

  const exportData = () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `vantage-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1200);
    setNotice({ tone: 'ok', text: 'Snapshot downloaded. Keep it somewhere safe.' });
  };

  const importData = async (file: File) => {
    try {
      const text = await file.text();
      const next = parseStateFile(text);
      const confirmed = window.confirm(
        `Import ${next.jobs.length} roles and ${next.apartments.length} listings? This replaces everything currently on this device.`
      );
      if (!confirmed) return;
      actions.replaceState(next);
      setNotice({ tone: 'ok', text: 'Snapshot imported and saved locally.' });
    } catch (error) {
      setNotice({ tone: 'error', text: error instanceof Error ? error.message : 'Import failed.' });
    }
  };

  const testAdzunaConnection = async () => {
    if (!settings.adzunaAppId.trim() || !settings.adzunaAppKey.trim()) {
      setAdzuna({ status: 'error', message: 'Enter both the app ID and app key first.' });
      return;
    }
    setAdzuna({ status: 'loading', message: 'Testing against Adzuna…' });
    try {
      const message = await testAdzuna(settings.adzunaAppId, settings.adzunaAppKey);
      setAdzuna({ status: 'ok', message });
    } catch (error) {
      setAdzuna({ status: 'error', message: error instanceof Error ? error.message : 'Connection failed.' });
    }
  };

  const testRentcastConnection = async () => {
    if (!settings.rentcastKey.trim()) {
      setRentcast({ status: 'error', message: 'Enter the Rentcast key first.' });
      return;
    }
    setRentcast({ status: 'loading', message: 'Testing against Rentcast…' });
    try {
      const message = await testRentcast(settings.rentcastKey, settings.city, settings.state);
      setRentcast({ status: 'ok', message });
    } catch (error) {
      setRentcast({ status: 'error', message: error instanceof Error ? error.message : 'Connection failed.' });
    }
  };

  const install = async () => {
    const accepted = await promptInstall();
    if (accepted) setNotice({ tone: 'ok', text: 'Installed. Open Vantage from your home screen.' });
  };

  const kb = Math.max(1, Math.round(stateSize(state) / 1024));

  return (
    <>
      <header className="page-head">
        <div>
          <p className="eyebrow">Configuration</p>
          <h1>Settings</h1>
          <p className="page-sub">Market defaults, optional data feeds, and local snapshots. Everything is stored on this device.</p>
        </div>
      </header>

      <div className="settings-grid">
        <section className="panel">
          <PanelHead eyebrow="Identity" title="Operator profile" trailing={<UserRound size={16} className="panel-icon" />} />
          <div className="form-grid">
            <Field label="Your name">
              <input value={settings.name} onChange={(event) => set({ name: event.target.value })} placeholder="First name" />
            </Field>
            <Field label="Default job location">
              <input
                value={settings.jobLocation}
                onChange={(event) => set({ jobLocation: event.target.value })}
                placeholder="New York, NY"
              />
            </Field>
            <Field label="Target role keywords" span hint="Seeds the job search console">
              <input
                value={settings.roleKeywords}
                onChange={(event) => set({ roleKeywords: event.target.value })}
                placeholder="e.g. Senior Product Manager, fintech"
              />
            </Field>
            <div className="filter-toggle">
              <Toggle label="Remote only by default" checked={settings.remoteOnly} onChange={(remoteOnly) => set({ remoteOnly })} />
            </div>
          </div>
        </section>

        <section className="panel">
          <PanelHead eyebrow="Market" title="Apartment search base" trailing={<MapPin size={16} className="panel-icon" />} />
          <div className="form-grid">
            <Field label="City">
              <input value={settings.city} onChange={(event) => set({ city: event.target.value })} placeholder="New York" />
            </Field>
            <Field label="State">
              <input
                value={settings.state}
                onChange={(event) => set({ state: event.target.value.toUpperCase().slice(0, 2) })}
                placeholder="NY"
                maxLength={2}
              />
            </Field>
            <Field label="Neighborhood shortcuts" span hint="Comma separated; used as one-tap presets">
              <input
                value={settings.neighborhoods}
                onChange={(event) => set({ neighborhoods: event.target.value })}
                placeholder="Manhattan, Brooklyn, Queens"
              />
            </Field>
            <Field label="Monthly rent budget">
              <input
                type="number"
                inputMode="numeric"
                value={settings.rentBudget || ''}
                onChange={(event) => set({ rentBudget: Number(event.target.value) || 0 })}
                placeholder="3200"
              />
            </Field>
            <Field label="Max commute (min)">
              <input
                type="number"
                inputMode="numeric"
                value={settings.maxCommute || ''}
                onChange={(event) => set({ maxCommute: Number(event.target.value) || 0 })}
                placeholder="35"
              />
            </Field>
            <Field label="Craigslist site" hint="e.g. newyork, sfbay, austin">
              <input
                value={settings.craigslistSite}
                onChange={(event) => set({ craigslistSite: event.target.value })}
                placeholder="newyork"
              />
            </Field>
          </div>
          <p className="notice">
            Deep links use this market. StreetEasy stays pinned to New York City; other cities work everywhere else.
          </p>
        </section>

        <section className="panel settings-span">
          <PanelHead eyebrow="Feeds · optional" title="Live integrations" trailing={<PlugZap size={16} className="panel-icon" />} />
          <p className="panel__intro">
            The deep-link console works with zero setup. Add keys only if you want native results inside the app. Keys live in this
            browser’s local storage — never put a shared or company-wide key on a public site.
          </p>

          <div className="integration">
            <div className="integration__head">
              <div>
                <h4>Adzuna</h4>
                <p>Job postings across boards, filtered by role and market.</p>
              </div>
              <a className="link-btn" href={ADZUNA_URL} target="_blank" rel="noreferrer noopener">
                Get keys <ArrowUpRight size={12} />
              </a>
            </div>
            <div className="form-grid">
              <Field label="App ID">
                <input
                  value={settings.adzunaAppId}
                  onChange={(event) => set({ adzunaAppId: event.target.value })}
                  placeholder="Adzuna app ID"
                  autoComplete="off"
                  spellCheck={false}
                  className="mono-input"
                />
              </Field>
              <Field label="App key">
                <input
                  value={settings.adzunaAppKey}
                  onChange={(event) => set({ adzunaAppKey: event.target.value })}
                  placeholder="Adzuna app key"
                  autoComplete="off"
                  spellCheck={false}
                  className="mono-input"
                />
              </Field>
            </div>
            <div className="integration__foot">
              <button type="button" className="btn btn--sm" onClick={testAdzunaConnection} disabled={adzuna.status === 'loading'}>
                {adzuna.status === 'loading' ? 'Testing…' : 'Test connection'}
              </button>
              {adzuna.message ? <span className={`conn conn--${adzuna.status}`}>{adzuna.message}</span> : null}
            </div>
          </div>

          <div className="integration">
            <div className="integration__head">
              <div>
                <h4>Rentcast</h4>
                <p>Active long-term rental listings for the configured market.</p>
              </div>
              <a className="link-btn" href={RENTCAST_URL} target="_blank" rel="noreferrer noopener">
                Get a key <ArrowUpRight size={12} />
              </a>
            </div>
            <div className="form-grid">
              <Field label="API key" span>
                <input
                  value={settings.rentcastKey}
                  onChange={(event) => set({ rentcastKey: event.target.value })}
                  placeholder="Paste your Rentcast key"
                  autoComplete="off"
                  spellCheck={false}
                  className="mono-input"
                  type="password"
                />
              </Field>
            </div>
            <div className="integration__foot">
              <button type="button" className="btn btn--sm" onClick={testRentcastConnection} disabled={rentcast.status === 'loading'}>
                {rentcast.status === 'loading' ? 'Testing…' : 'Test connection'}
              </button>
              {rentcast.message ? <span className={`conn conn--${rentcast.status}`}>{rentcast.message}</span> : null}
            </div>
            <p className="integration__hint">
              Use a key from the API dashboard (not the property app). A 403 means the key is restricted or the API plan/billing is
              inactive; a 401 means the key is wrong or revoked. Each test spends one API request.
            </p>
          </div>

          <p className="notice">
            If a test reports a CORS error, that provider blocks direct browser calls — the deep-link console still works. Rentcast
            and Adzuna may also enforce quotas; keep queries deliberate.
          </p>
        </section>

        <section className="panel">
          <PanelHead eyebrow="Persistence" title="Data & snapshots" trailing={<Database size={16} className="panel-icon" />} />
          <ul className="data-stats">
            <li>
              <span>Roles</span>
              <strong>{state.jobs.length}</strong>
            </li>
            <li>
              <span>Listings</span>
              <strong>{state.apartments.length}</strong>
            </li>
            <li>
              <span>Tasks</span>
              <strong>{state.tasks.length}</strong>
            </li>
            <li>
              <span>Searches</span>
              <strong>{state.searches.length}</strong>
            </li>
            <li>
              <span>Storage</span>
              <strong>{kb} KB</strong>
            </li>
            <li>
              <span>Last save</span>
              <strong>{savedAt ? timeAgo(savedAt) : '—'}</strong>
            </li>
          </ul>
          <div className="button-row">
            <button type="button" className="btn" onClick={exportData}>
              <Download size={14} /> Export JSON
            </button>
            <label className="btn">
              <Upload size={14} /> Import JSON
              <input
                type="file"
                accept="application/json,.json"
                hidden
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) void importData(file);
                  event.target.value = '';
                }}
              />
            </label>
            <button type="button" className="btn" onClick={actions.loadDemo}>
              Load demo data
            </button>
            <DangerButton label="Reset everything" onConfirm={actions.resetAll} />
          </div>
          <p className="notice">
            To move boards between iPad and phone, export on one device and import on the other. Import replaces the local snapshot.
          </p>
          {notice ? <div className={notice.tone === 'ok' ? 'notice notice--ok' : 'notice notice--error'}>{notice.text}</div> : null}
        </section>

        <section className="panel">
          <PanelHead eyebrow="Device" title="Install the command deck" trailing={<Smartphone size={16} className="panel-icon" />} />
          {standalone ? (
            <p className="install-state">
              <span className="dot" /> Running as an installed app.
            </p>
          ) : installable ? (
            <button type="button" className="btn btn--primary" onClick={install}>
              <HardDriveDownload size={15} /> Install on this device
            </button>
          ) : (
            <p className="mono-dim">Use the browser menu to install for a full-screen, offline-capable deck.</p>
          )}

          <ol className="install-steps">
            <li>
              <strong>iPad / iPhone{ios ? ' — this device' : ''}</strong>
              <span>Open the site in Safari → Share → Add to Home Screen.</span>
            </li>
            <li>
              <strong>Android</strong>
              <span>Chrome menu → Install app (or “Add to Home screen”).</span>
            </li>
            <li>
              <strong>Desktop</strong>
              <span>Click the install icon in the address bar, or use the menu → Install Vantage.</span>
            </li>
          </ol>
          <p className="notice">Installed mode removes browser chrome, respects safe areas, and keeps working offline after first load.</p>
        </section>
      </div>

      <footer className="settings-footer">
        <span className="mono-dim">VANTAGE · v1.0</span>
        <span className="mono-dim">Local-first. No account. No telemetry.</span>
        <span className="mono-dim">
          <KeyRound size={12} /> Keys never leave this browser
        </span>
      </footer>
    </>
  );
}
