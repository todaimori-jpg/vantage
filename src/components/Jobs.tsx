import { useMemo, useState } from 'react';
import {
  DndContext,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import { Briefcase, CalendarClock, ExternalLink, GripVertical, MapPin, Plus, Search } from 'lucide-react';
import { JOB_STAGES, JOB_STAGE_META, type Job, type JobStage } from '../types';
import { useApp } from '../store';
import { EmptyState } from './ui';
import { JobModal } from './JobModal';
import { dueInfo, formatDate, formatDateRange } from '../lib/format';

const MODE_LABEL: Record<Job['mode'], string> = { onsite: 'On-site', hybrid: 'Hybrid', remote: 'Remote' };

function JobCard({ job, onOpen }: { job: Job; onOpen: () => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: job.id });
  const due = dueInfo(job.nextActionOn);
  const style = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : undefined;

  return (
    <article
      ref={setNodeRef}
      style={style}
      className={`jcard${isDragging ? ' is-dragging' : ''}`}
      onClick={onOpen}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onOpen();
        }
      }}
      role="button"
      tabIndex={0}
      aria-label={`Edit ${job.title}`}
    >
      <div className="jcard__top">
        <span className="pips" aria-label={`Priority ${job.priority} of 5`}>
          {[1, 2, 3, 4, 5].map((n) => (
            <span key={n} className={n <= job.priority ? 'pip is-on' : 'pip'} />
          ))}
        </span>
        <button
          type="button"
          className="drag-handle"
          {...listeners}
          {...attributes}
          onClick={(event) => event.stopPropagation()}
          aria-label="Drag to another stage"
        >
          <GripVertical size={14} />
        </button>
      </div>

      <h4>{job.title || 'Untitled role'}</h4>
      <p className="jcard__company">{job.company || 'Company TBD'}</p>

      <div className="chips">
        <span className="chip chip--mode">{MODE_LABEL[job.mode]}</span>
        {job.location ? (
          <span className="chip">
            <MapPin size={11} /> {job.location}
          </span>
        ) : null}
      </div>

      <p className="jcard__salary">{formatDateRange(job.salaryMin, job.salaryMax)}</p>

      {job.nextAction ? (
        <div className={`due due--${due.tone}`}>
          <CalendarClock size={12} />
          <span className="due__text">{job.nextAction}</span>
          {due.label ? <b>{due.label}</b> : null}
        </div>
      ) : null}

      <div className="jcard__foot">
        <span>{job.appliedOn ? `Applied ${formatDate(job.appliedOn)}` : job.source || 'Target'}</span>
        {job.url ? (
          <a
            className="jcard__link"
            href={job.url}
            target="_blank"
            rel="noreferrer noopener"
            onClick={(event) => event.stopPropagation()}
            aria-label="Open posting"
          >
            <ExternalLink size={12} />
          </a>
        ) : null}
      </div>
    </article>
  );
}

function JobColumn({
  stage,
  jobs,
  onOpen,
  onAdd,
}: {
  stage: JobStage;
  jobs: Job[];
  onOpen: (job: Job) => void;
  onAdd: (stage: JobStage) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: stage });
  const meta = JOB_STAGE_META[stage];

  return (
    <section className={`col${isOver ? ' is-over' : ''}`} ref={setNodeRef}>
      <header className="col__head">
        <span className="col__dot" style={{ background: meta.color }} />
        <span className="col__title">{meta.label}</span>
        <span className="col__count">{jobs.length}</span>
        <button type="button" className="col__add" onClick={() => onAdd(stage)} aria-label={`Add role to ${meta.label}`}>
          <Plus size={14} />
        </button>
      </header>
      <div className="col__body">
        {jobs.map((job) => (
          <JobCard key={job.id} job={job} onOpen={() => onOpen(job)} />
        ))}
        {jobs.length === 0 ? <div className="col__empty">Drop a role here</div> : null}
      </div>
    </section>
  );
}

export function JobsView() {
  const { state, actions } = useApp();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Job | null>(null);
  const [initialStage, setInitialStage] = useState<JobStage>('target');
  const [query, setQuery] = useState('');

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 6 } }),
    useSensor(KeyboardSensor)
  );

  const activeCount = state.jobs.filter((job) => job.stage !== 'closed').length;
  const appliedCount = state.jobs.filter((job) => ['applied', 'interview', 'offer'].includes(job.stage)).length;
  const interviewCount = state.jobs.filter((job) => job.stage === 'interview').length;
  const offerCount = state.jobs.filter((job) => job.stage === 'offer').length;

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return state.jobs;
    return state.jobs.filter((job) =>
      [job.title, job.company, job.location, job.source ?? '', ...job.tags].join(' ').toLowerCase().includes(needle)
    );
  }, [state.jobs, query]);

  const openNew = (stage: JobStage) => {
    setEditing(null);
    setInitialStage(stage);
    setOpen(true);
  };

  const openEdit = (job: Job) => {
    setEditing(job);
    setOpen(true);
  };

  const onDragEnd = (event: DragEndEvent) => {
    const jobId = String(event.active.id);
    const target = event.over?.id;
    if (typeof target === 'string' && JOB_STAGES.includes(target as JobStage)) {
      actions.moveJob(jobId, target as JobStage);
    }
  };

  return (
    <>
      <header className="page-head">
        <div>
          <p className="eyebrow">Directed search</p>
          <h1>Role pipeline</h1>
          <p className="page-sub">
            {activeCount} active · {appliedCount} applications out · {interviewCount} interviewing · {offerCount} offers
          </p>
        </div>
        <div className="page-actions">
          <div className="search-box">
            <Search size={15} />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Filter roles, companies, tags…" aria-label="Filter roles" />
          </div>
          <button type="button" className="btn btn--primary" onClick={() => openNew('target')}>
            <Plus size={15} /> Add role
          </button>
        </div>
      </header>

      {state.jobs.length === 0 ? (
        <div className="panel">
          <EmptyState
            icon={<Briefcase size={22} />}
            title="No roles in the pipeline"
            body="Add a target role, or run the search console and save postings here as you work them."
            action={
              <button type="button" className="btn btn--primary" onClick={() => openNew('target')}>
                Add your first role
              </button>
            }
          />
        </div>
      ) : (
        <DndContext sensors={sensors} onDragEnd={onDragEnd}>
          <div className="board board--jobs">
            {JOB_STAGES.map((stage) => (
              <JobColumn
                key={stage}
                stage={stage}
                jobs={filtered
                  .filter((job) => job.stage === stage)
                  .sort((a, b) => b.priority - a.priority || b.updatedAt.localeCompare(a.updatedAt))}
                onOpen={openEdit}
                onAdd={openNew}
              />
            ))}
          </div>
          {filtered.length === 0 ? <p className="board__empty">No roles match “{query}”.</p> : null}
        </DndContext>
      )}

      <JobModal open={open} job={editing} initialStage={initialStage} onClose={() => setOpen(false)} />
    </>
  );
}
