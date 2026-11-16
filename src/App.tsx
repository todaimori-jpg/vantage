import { useEffect, useState } from 'react';
import { Briefcase, Building2, LayoutDashboard, Radar, Settings2, Wifi, WifiOff } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { AppProvider, activeApartments, activeJobs, useApp } from './store';
import type { View } from './types';
import { Dashboard } from './components/Dashboard';
import { JobsView } from './components/Jobs';
import { HomesView } from './components/Homes';
import { SearchConsole } from './components/SearchConsole';
import { SettingsView } from './components/Settings';
import { timeAgo } from './lib/format';

const NAV: { id: View; label: string; icon: LucideIcon; eyebrow: string }[] = [
  { id: 'command', label: 'Command', icon: LayoutDashboard, eyebrow: 'Mission control' },
  { id: 'jobs', label: 'Jobs', icon: Briefcase, eyebrow: 'Role pipeline' },
  { id: 'homes', label: 'Homes', icon: Building2, eyebrow: 'Housing pipeline' },
  { id: 'search', label: 'Search', icon: Radar, eyebrow: 'Query console' },
  { id: 'settings', label: 'Settings', icon: Settings2, eyebrow: 'Configuration' },
];

const VIEWS: View[] = ['command', 'jobs', 'homes', 'search', 'settings'];

function readHash(): View {
  const hash = window.location.hash.replace('#', '') as View;
  return VIEWS.includes(hash) ? hash : 'command';
}

function BrandMark() {
  return (
    <svg className="brand__mark" viewBox="0 0 64 64" aria-hidden="true">
      <rect width="64" height="64" rx="14" fill="#070d12" />
      <rect x="1" y="1" width="62" height="62" rx="13" fill="none" stroke="#1d2c37" />
      <circle cx="32" cy="32" r="15" fill="none" stroke="#63f2b4" strokeWidth="2.4" opacity="0.9" />
      <circle cx="32" cy="32" r="3.4" fill="#63f2b4" />
      <path d="M32 8v9M32 47v9M8 32h9M47 32h9" stroke="#63f2b4" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M47 17l-6.5 6.5" stroke="#ffb454" strokeWidth="2.4" strokeLinecap="round" />
      <circle cx="47" cy="17" r="2.4" fill="#ffb454" />
    </svg>
  );
}

function Clock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);
  return <span className="clock">{now.toLocaleTimeString('en-US', { hour12: false })}</span>;
}

function useOnline(): boolean {
  const [online, setOnline] = useState(() => navigator.onLine);
  useEffect(() => {
    const up = () => setOnline(true);
    const down = () => setOnline(false);
    window.addEventListener('online', up);
    window.addEventListener('offline', down);
    return () => {
      window.removeEventListener('online', up);
      window.removeEventListener('offline', down);
    };
  }, []);
  return online;
}

function Shell() {
  const { state, savedAt } = useApp();
  const [view, setView] = useState<View>(readHash);
  const online = useOnline();

  useEffect(() => {
    if (!window.location.hash) window.history.replaceState(null, '', '#command');
    const onPop = () => setView(readHash());
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [view]);

  const go = (next: View) => {
    if (next === view) return;
    setView(next);
    window.history.pushState(null, '', `#${next}`);
  };

  const counts: Partial<Record<View, number>> = {
    jobs: activeJobs(state.jobs).length,
    homes: activeApartments(state.apartments).length,
  };

  const current = NAV.find((item) => item.id === view) ?? NAV[0];

  return (
    <div className="app">
      <aside className="rail">
        <button type="button" className="brand" onClick={() => go('command')} aria-label="Vantage home">
          <BrandMark />
          <span className="brand__text">
            <strong>VANTAGE</strong>
            <span>Search Command</span>
          </span>
        </button>

        <nav className="rail__nav" aria-label="Primary">
          <p className="rail__label">Deck</p>
          {NAV.map((item) => {
            const Icon = item.icon;
            const count = counts[item.id];
            return (
              <button
                type="button"
                key={item.id}
                className={view === item.id ? 'nav-item is-active' : 'nav-item'}
                onClick={() => go(item.id)}
                aria-current={view === item.id ? 'page' : undefined}
              >
                <Icon size={16} strokeWidth={1.8} />
                <span>{item.label}</span>
                {count !== undefined && count > 0 ? <span className="nav-item__count">{count}</span> : null}
              </button>
            );
          })}
        </nav>

        <div className="rail__foot">
          <div className={`status-chip ${online ? 'is-on' : 'is-off'}`}>
            {online ? <Wifi size={12} /> : <WifiOff size={12} />}
            <span>{online ? 'On-device · local' : 'Offline · local'}</span>
          </div>
          <p className="rail__saved mono-dim">{savedAt ? `Saved ${timeAgo(savedAt)}` : 'Autosaving locally'}</p>
          <p className="rail__version mono-dim">v1.0 · PWA</p>
        </div>
      </aside>

      <div className="main">
        <header className="topbar">
          <div className="topbar__left">
            <span className="topbar__eyebrow">{current.eyebrow}</span>
            <span className="topbar__sep" aria-hidden="true">
              /
            </span>
            <strong className="topbar__title">{current.label}</strong>
          </div>
          <div className="topbar__right">
            <span className={online ? 'topbar__signal is-on' : 'topbar__signal is-off'}>
              <span className="dot" />
              {online ? 'Live' : 'Offline'}
            </span>
            <span className="topbar__clock">
              <Clock />
              <span>{new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
            </span>
          </div>
        </header>

        <main className="view" key={view}>
          {view === 'command' ? <Dashboard onNavigate={go} /> : null}
          {view === 'jobs' ? <JobsView /> : null}
          {view === 'homes' ? <HomesView onNavigate={go} /> : null}
          {view === 'search' ? <SearchConsole onNavigate={go} /> : null}
          {view === 'settings' ? <SettingsView /> : null}
        </main>

        <nav className="tabbar" aria-label="Primary mobile">
          {NAV.map((item) => {
            const Icon = item.icon;
            const count = counts[item.id];
            return (
              <button
                type="button"
                key={item.id}
                className={view === item.id ? 'tab is-active' : 'tab'}
                onClick={() => go(item.id)}
                aria-current={view === item.id ? 'page' : undefined}
              >
                <span className="tab__icon">
                  <Icon size={19} strokeWidth={1.8} />
                  {count !== undefined && count > 0 ? <span className="tab__count">{count}</span> : null}
                </span>
                <span className="tab__label">{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <Shell />
    </AppProvider>
  );
}
