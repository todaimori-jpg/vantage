import { useState } from 'react';
import {
  ArrowUpRight,
  Briefcase,
  Building2,
  CalendarDays,
  Check,
  ListChecks,
  Plus,
  Radar,
  Sparkles,
} from 'lucide-react';
import { activeApartments, activeJobs, useApp } from '../store';
import { JOB_STAGES, JOB_STAGE_META, type Apartment, type Job, type Task, type View } from '../types';
import { EmptyState, PanelHead, ScoreRing } from './ui';
import { JobModal } from './JobModal';
import { HomeModal } from './HomeModal';
import { apartmentScore } from '../lib/calc';
import { dueInfo, formatDate, formatDateTime, formatMoney, greeting, parseDate, pct } from '../lib/format';

interface QueueItem {
  id: string;
  kind: 'job' | 'home' | 'task';
  title: string;
  meta: string;
  due?: string;
  task?: Task;
  job?: Job;
  home?: Apartment;
}

function sortValue(due?: string): number {
  const parsed = parseDate(due);
  return parsed ? parsed.getTime() : Number.MAX_SAFE_INTEGER;
}

function Stat({ label, value, meta, tone }: { label: string; value: string | number; meta: string; tone: 'mint' | 'amber' | 'blue' | 'violet' }) {
  return (
    <div className={`stat stat--${tone}`}>
      <p className="stat__label">{label}</p>
      <p className="stat__value">{value}</p>
      <p className="stat__meta">{meta}</p>
    </div>
  );
}

export function Dashboard({ onNavigate }: { onNavigate: (view: View) => void }) {
  const { state, actions } = useApp();
  const { settings } = state;

  const [jobOpen, setJobOpen] = useState(false);
  const [editingJob, setEditingJob] = useState<Job | null>(null);
  const [homeOpen, setHomeOpen] = useState(false);
  const [editingHome, setEditingHome] = useState<Apartment | null>(null);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDue, setTaskDue] = useState('');

  const jobsActive = activeJobs(state.jobs);
  const applications = state.jobs.filter((job) => ['applied', 'interview', 'offer'].includes(job.stage));
  const interviewing = state.jobs.filter((job) => job.stage === 'interview');
  const offers = state.jobs.filter((job) => job.stage === 'offer');
  const homesActive = activeApartments(state.apartments);
  const upcomingTours = homesActive
    .filter((home) => home.tourAt && new Date(home.tourAt).getTime() >= Date.now())
    .sort((a, b) => (a.tourAt ?? '').localeCompare(b.tourAt ?? ''));
  const priced = homesActive.filter((home) => home.rent);
  const avgRent = priced.length ? Math.round(priced.reduce((sum, home) => sum + (home.rent ?? 0), 0) / priced.length) : undefined;
  const inBudget = priced.filter((home) => (home.rent ?? 0) <= settings.rentBudget).length;
  const overBudget = priced.length - inBudget;

  const scores = new Map(state.apartments.map((home) => [home.id, apartmentScore(home, settings, state.apartments)]));
  const topHomes = [...homesActive].sort((a, b) => (scores.get(b.id) ?? 0) - (scores.get(a.id) ?? 0)).slice(0, 3);

  const queue: QueueItem[] = [];
  state.tasks
    .filter((task) => !task.done)
    .forEach((task) =>
      queue.push({ id: `task-${task.id}`, kind: 'task', title: task.title, meta: 'Task', due: task.due, task })
    );
  jobsActive
    .filter((job) => job.nextAction)
    .forEach((job) =>
      queue.push({
        id: `job-${job.id}`,
        kind: 'job',
        title: job.nextAction ?? '',
        meta: [job.company, job.title].filter(Boolean).join(' · '),
        due: job.nextActionOn,
        job,
      })
    );
  homesActive
    .filter((home) => home.tourAt)
    .forEach((home) =>
      queue.push({
        id: `home-${home.id}`,
        kind: 'home',
        title: `Tour ${home.address}`,
        meta: home.neighborhood || 'Apartment tour',
        due: home.tourAt,
        home,
      })
    );
  queue.sort((a, b) => sortValue(a.due) - sortValue(b.due));
  const overdue = queue.filter((item) => item.due && dueInfo(item.due).tone === 'overdue').length;

  const interviewRate = applications.length ? pct(interviewing.length + offers.length, applications.length) : 0;
  const stageCounts = JOB_STAGES.map((stage) => ({
    stage,
    count: state.jobs.filter((job) => job.stage === stage).length,
  }));
  const maxStage = Math.max(1, ...stageCounts.map((entry) => entry.count));
  const budgetScale = Math.max(settings.rentBudget * 1.25, avgRent ?? 0, 1);

  const summary =
    state.jobs.length === 0 && state.apartments.length === 0
      ? 'Your deck is quiet. Load the demo board to see how it runs, or add your first target.'
      : `${applications.length} applications in flight · ${upcomingTours.length} tours ahead${overdue ? ` · ${overdue} overdue action${overdue === 1 ? '' : 's'}` : ''}.`;

  const openJob = (job: Job) => {
    setEditingJob(job);
    setJobOpen(true);
  };

  const openHome = (home: Apartment) => {
    setEditingHome(home);
    setHomeOpen(true);
  };

  const addTask = (event: React.FormEvent) => {
    event.preventDefault();
    const title = taskTitle.trim();
    if (!title) return;
    actions.addTask(title, taskDue || undefined);
    setTaskTitle('');
    setTaskDue('');
  };

  return (
    <>
      <header className="page-head page-head--hero">
        <div>
          <p className="eyebrow">
            Mission control · {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
          <h1>
            {greeting()}
            {settings.name ? `, ${settings.name}` : ''}.
          </h1>
          <p className="page-sub">{summary}</p>
        </div>
        <div className="page-actions">
          <button
            type="button"
            className="btn"
            onClick={() => {
              setEditingJob(null);
              setJobOpen(true);
            }}
          >
            <Briefcase size={15} /> Add role
          </button>
          <button
            type="button"
            className="btn btn--primary"
            onClick={() => {
              setEditingHome(null);
              setHomeOpen(true);
            }}
          >
            <Building2 size={15} /> Add apartment
          </button>
        </div>
      </header>

      <div className="stats">
        <Stat
          label="Applications out"
          value={applications.length}
          meta={`${interviewing.length} interviewing · ${offers.length} offer${offers.length === 1 ? '' : 's'}`}
          tone="blue"
        />
        <Stat
          label="Interview rate"
          value={`${interviewRate}%`}
          meta={`${interviewing.length + offers.length} of ${applications.length} advanced`}
          tone="amber"
        />
        <Stat
          label="Homes tracked"
          value={homesActive.length}
          meta={`${upcomingTours.length} tour${upcomingTours.length === 1 ? '' : 's'} scheduled`}
          tone="violet"
        />
        <Stat
          label="Avg shortlist rent"
          value={avgRent ? formatMoney(avgRent) : '—'}
          meta={`Target ${formatMoney(settings.rentBudget)}/mo`}
          tone="mint"
        />
      </div>

      {state.jobs.length === 0 && state.apartments.length === 0 ? (
        <div className="panel panel--demo">
          <div>
            <p className="eyebrow">Fast start</p>
            <h3>Want to see the system with live-looking data?</h3>
            <p className="page-sub">Load a sample board of five roles, four listings, and a starter action queue. You can wipe it anytime.</p>
          </div>
          <button type="button" className="btn btn--primary" onClick={actions.loadDemo}>
            <Sparkles size={15} /> Load demo board
          </button>
        </div>
      ) : null}

      <div className="dash">
        <section className="panel dash__queue">
          <PanelHead
            eyebrow="Priority"
            title="Action queue"
            trailing={<span className={overdue ? 'mono-dim is-alert' : 'mono-dim'}>{queue.length} open{overdue ? ` · ${overdue} overdue` : ''}</span>}
          />
          <form className="task-add" onSubmit={addTask}>
            <input value={taskTitle} onChange={(event) => setTaskTitle(event.target.value)} placeholder="Add an action…" aria-label="New task" />
            <input type="date" value={taskDue} onChange={(event) => setTaskDue(event.target.value)} aria-label="Task due date" />
            <button type="submit" className="btn btn--primary btn--icon" aria-label="Add task" disabled={!taskTitle.trim()}>
              <Plus size={16} />
            </button>
          </form>
          {queue.length === 0 ? (
            <EmptyState
              icon={<ListChecks size={20} />}
              title="Queue is clear"
              body="Next actions from roles and tours land here automatically. Add a task for anything else."
            />
          ) : (
            <ul className="queue">
              {queue.slice(0, 9).map((item) => {
                const due = dueInfo(item.due);
                return (
                  <li key={item.id} className={`queue__item queue__item--${item.kind}${due.tone === 'overdue' ? ' is-overdue' : ''}`}>
                    {item.kind === 'task' ? (
                      <button
                        type="button"
                        className="queue__check"
                        onClick={() => actions.toggleTask(item.task!.id)}
                        aria-label={`Complete ${item.title}`}
                      >
                        <Check size={11} />
                      </button>
                    ) : (
                      <span className={`queue__dot queue__dot--${item.kind}`} />
                    )}
                    <button
                      type="button"
                      className="queue__body"
                      onClick={() => {
                        if (item.job) openJob(item.job);
                        else if (item.home) openHome(item.home);
                      }}
                    >
                      <span className="queue__title">{item.title}</span>
                      <span className="queue__meta">{item.meta}</span>
                    </button>
                    {due.label ? <span className={`due-pill due-pill--${due.tone}`}>{due.label}</span> : null}
                  </li>
                );
              })}
            </ul>
          )}
          {queue.length > 9 ? <p className="panel__more">+{queue.length - 9} more actions in the boards.</p> : null}
        </section>

        <section className="panel dash__budget">
          <PanelHead
            eyebrow="Housing"
            title="Budget fit"
            trailing={
              <button type="button" className="link-btn" onClick={() => onNavigate('homes')}>
                Board <ArrowUpRight size={12} />
              </button>
            }
          />
          <div className="budget">
            <p className="budget__value">
              {avgRent ? formatMoney(avgRent) : '—'}
              <span>/mo avg</span>
            </p>
            <div className="budget__bar">
              <span
                className={`budget__fill${(avgRent ?? 0) > settings.rentBudget ? ' is-over' : ''}`}
                style={{ width: `${Math.min(100, ((avgRent ?? 0) / budgetScale) * 100)}%` }}
              />
              <span className="budget__target" style={{ left: `${(settings.rentBudget / budgetScale) * 100}%` }} />
            </div>
            <div className="budget__legend">
              <span>Target {formatMoney(settings.rentBudget)}</span>
              <span className={overBudget ? 'is-alert' : ''}>{priced.length ? `${inBudget}/${priced.length} in range` : 'No rents yet'}</span>
            </div>
          </div>

          <div className="tours">
            <p className="tours__title">Tours ahead</p>
            {upcomingTours.length === 0 ? (
              <p className="mono-dim">Nothing scheduled. Pick a shortlist finalist and book it.</p>
            ) : (
              <ul>
                {upcomingTours.slice(0, 3).map((home) => (
                  <li key={home.id}>
                    <button type="button" className="tour" onClick={() => openHome(home)}>
                      <span className="tour__icon">
                        <CalendarDays size={13} />
                      </span>
                      <span className="tour__body">
                        <strong>{home.address}</strong>
                        <span>{formatDateTime(home.tourAt)}</span>
                      </span>
                      <span className="tour__rent">{home.rent ? formatMoney(home.rent) : ''}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        <section className="panel dash__pipeline">
          <PanelHead
            eyebrow="Job funnel"
            title="Pipeline"
            trailing={
              <button type="button" className="link-btn" onClick={() => onNavigate('jobs')}>
                Board <ArrowUpRight size={12} />
              </button>
            }
          />
          {state.jobs.length === 0 ? (
            <EmptyState
              icon={<Briefcase size={20} />}
              title="No roles yet"
              body="Add targets manually or pull a search brief into the console."
              action={
                <button type="button" className="btn" onClick={() => onNavigate('search')}>
                  Open search console
                </button>
              }
            />
          ) : (
            <div className="funnel">
              {stageCounts.map(({ stage, count }) => (
                <div className="funnel__row" key={stage}>
                  <span className="funnel__label">{JOB_STAGE_META[stage].label}</span>
                  <span className="funnel__track">
                    <span
                      className="funnel__fill"
                      style={{ width: `${(count / maxStage) * 100}%`, background: JOB_STAGE_META[stage].color }}
                    />
                  </span>
                  <span className="funnel__count">{count}</span>
                </div>
              ))}
              <div className="funnel__foot">
                <span>
                  {jobsActive.length} active · <strong>{applications.length}</strong> submitted
                </span>
                <span>{offers.length ? `${offers.length} offer${offers.length === 1 ? '' : 's'} on the table` : 'Chase the next interview'}</span>
              </div>
            </div>
          )}
        </section>

        <section className="panel dash__matches">
          <PanelHead
            eyebrow="Signal ranking"
            title="Top apartment matches"
            trailing={
              <button type="button" className="link-btn" onClick={() => onNavigate('homes')}>
                Compare <ArrowUpRight size={12} />
              </button>
            }
          />
          {topHomes.length === 0 ? (
            <EmptyState
              icon={<Building2 size={20} />}
              title="No listings tracked"
              body="Add the places you’re considering, then the deck ranks them on budget, value, commute, and your rating."
              action={
                <button
                  type="button"
                  className="btn"
                  onClick={() => {
                    setEditingHome(null);
                    setHomeOpen(true);
                  }}
                >
                  Add apartment
                </button>
              }
            />
          ) : (
            <ul className="matches">
              {topHomes.map((home, index) => (
                <li key={home.id}>
                  <button type="button" className="match" onClick={() => openHome(home)}>
                    <span className="match__rank">{String(index + 1).padStart(2, '0')}</span>
                    <span className="match__body">
                      <strong>{home.address}</strong>
                      <span>
                        {home.neighborhood || 'No neighborhood'} · {home.beds === 0 ? 'Studio' : home.beds ? `${home.beds} bd` : '—'}
                      </span>
                    </span>
                    <span className="match__rent">{home.rent ? formatMoney(home.rent) : '—'}</span>
                    <ScoreRing value={scores.get(home.id) ?? 0} size={36} />
                  </button>
                </li>
              ))}
            </ul>
          )}
          <p className="panel__foot mono-dim">
            {upcomingTours[0]
              ? `Next tour ${formatDate(upcomingTours[0].tourAt)} at ${upcomingTours[0].address}.`
              : 'Score = budget fit · $/sqft · commute · your rating.'}
          </p>
        </section>

        <section className="panel dash__search">
          <div className="quick-search">
            <span className="quick-search__icon">
              <Radar size={18} />
            </span>
            <div>
              <p className="eyebrow">Sweep the market</p>
              <h3>One console, every listing source.</h3>
              <p>Generate filtered searches across ten rental sites and eight job boards — then save what matters.</p>
            </div>
            <button type="button" className="btn btn--primary" onClick={() => onNavigate('search')}>
              Open search console
            </button>
          </div>
        </section>
      </div>

      <JobModal open={jobOpen} job={editingJob} onClose={() => setJobOpen(false)} />
      <HomeModal open={homeOpen} apartment={editingHome} onClose={() => setHomeOpen(false)} />
    </>
  );
}
