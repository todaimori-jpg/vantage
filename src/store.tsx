import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, useState, type ReactNode } from 'react';
import type { Apartment, AppState, HomeStage, Job, JobStage, SavedSearch, Settings, Task } from './types';
import { defaultState, demoState } from './data/defaults';
import { loadState, saveState } from './lib/storage';
import { todayISO, uid } from './lib/format';

type Action = { type: 'update'; fn: (state: AppState) => AppState };

function reducer(state: AppState, action: Action): AppState {
  return action.type === 'update' ? action.fn(state) : state;
}

interface Actions {
  saveJob: (job: Job) => void;
  deleteJob: (id: string) => void;
  moveJob: (id: string, stage: JobStage) => void;
  saveApartment: (apartment: Apartment) => void;
  deleteApartment: (id: string) => void;
  moveApartment: (id: string, stage: HomeStage) => void;
  addTask: (title: string, due?: string) => void;
  toggleTask: (id: string) => void;
  deleteTask: (id: string) => void;
  addSearch: (search: SavedSearch) => void;
  deleteSearch: (id: string) => void;
  patchSettings: (patch: Partial<Settings>) => void;
  replaceState: (next: AppState) => void;
  resetAll: () => void;
  loadDemo: () => void;
}

interface StoreValue {
  state: AppState;
  savedAt: string | null;
  actions: Actions;
}

const StoreContext = createContext<StoreValue | null>(null);

const stamp = () => new Date().toISOString();

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, loadState);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  const update = useCallback((fn: (state: AppState) => AppState) => dispatch({ type: 'update', fn }), []);

  const stateRef = useRef(state);
  stateRef.current = state;

  useEffect(() => {
    const timer = window.setTimeout(() => {
      saveState(state);
      setSavedAt(new Date().toISOString());
    }, 200);
    return () => window.clearTimeout(timer);
  }, [state]);

  useEffect(() => {
    const flush = () => saveState(stateRef.current);
    window.addEventListener('pagehide', flush);
    document.addEventListener('visibilitychange', flush);
    return () => {
      window.removeEventListener('pagehide', flush);
      document.removeEventListener('visibilitychange', flush);
    };
  }, []);

  const actions = useMemo<Actions>(() => {
    const upsertJob = (job: Job) => {
      const next = { ...job, updatedAt: stamp() };
      update((s) => {
        const exists = s.jobs.some((j) => j.id === job.id);
        return {
          ...s,
          jobs: exists ? s.jobs.map((j) => (j.id === job.id ? next : j)) : [next, ...s.jobs],
        };
      });
    };

    const upsertApartment = (apartment: Apartment) => {
      const next = { ...apartment, updatedAt: stamp() };
      update((s) => {
        const exists = s.apartments.some((a) => a.id === apartment.id);
        return {
          ...s,
          apartments: exists ? s.apartments.map((a) => (a.id === apartment.id ? next : a)) : [next, ...s.apartments],
        };
      });
    };

    return {
      saveJob: upsertJob,
      deleteJob: (id) => update((s) => ({ ...s, jobs: s.jobs.filter((j) => j.id !== id) })),
      moveJob: (id, stage) =>
        update((s) => ({
          ...s,
          jobs: s.jobs.map((j) =>
            j.id === id
              ? {
                  ...j,
                  stage,
                  appliedOn: stage !== 'target' && !j.appliedOn ? todayISO() : j.appliedOn,
                  updatedAt: stamp(),
                }
              : j
          ),
        })),
      saveApartment: upsertApartment,
      deleteApartment: (id) => update((s) => ({ ...s, apartments: s.apartments.filter((a) => a.id !== id) })),
      moveApartment: (id, stage) =>
        update((s) => ({
          ...s,
          apartments: s.apartments.map((a) => (a.id === id ? { ...a, stage, updatedAt: stamp() } : a)),
        })),
      addTask: (title, due) =>
        update((s) => ({
          ...s,
          tasks: [{ id: uid(), title, due, done: false, createdAt: stamp() }, ...s.tasks],
        })),
      toggleTask: (id) =>
        update((s) => ({ ...s, tasks: s.tasks.map((t: Task) => (t.id === id ? { ...t, done: !t.done } : t)) })),
      deleteTask: (id) => update((s) => ({ ...s, tasks: s.tasks.filter((t) => t.id !== id) })),
      addSearch: (search) => update((s) => ({ ...s, searches: [search, ...s.searches].slice(0, 20) })),
      deleteSearch: (id) => update((s) => ({ ...s, searches: s.searches.filter((x) => x.id !== id) })),
      patchSettings: (patch) => update((s) => ({ ...s, settings: { ...s.settings, ...patch } })),
      replaceState: (next) => update(() => next),
      resetAll: () => update(() => defaultState()),
      loadDemo: () => update((s) => ({ ...demoState(), settings: s.settings })),
    };
  }, [update]);

  const value = useMemo<StoreValue>(() => ({ state, savedAt, actions }), [state, savedAt, actions]);

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useApp(): StoreValue {
  const value = useContext(StoreContext);
  if (!value) throw new Error('useApp must be used inside AppProvider');
  return value;
}

export function activeJobs(jobs: Job[]): Job[] {
  return jobs.filter((j) => j.stage !== 'closed');
}

export function activeApartments(apartments: Apartment[]): Apartment[] {
  return apartments.filter((a) => a.stage !== 'passed' && a.stage !== 'leased');
}
