import { useEffect, useState } from 'react';
import { JOB_STAGES, JOB_STAGE_META, type Job, type JobStage } from '../types';
import { useApp } from '../store';
import { DangerButton, Dialog, Field, Stars } from './ui';
import { todayISO, uid } from '../lib/format';

function blankJob(stage: JobStage): Job {
  return {
    id: uid(),
    title: '',
    company: '',
    location: '',
    mode: 'hybrid',
    stage,
    priority: 3,
    tags: [],
    createdAt: '',
    updatedAt: '',
  };
}

function parseTags(value: string): string[] {
  return value
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean)
    .slice(0, 12);
}

export function JobModal({
  open,
  job,
  initialStage = 'target',
  onClose,
}: {
  open: boolean;
  job: Job | null;
  initialStage?: JobStage;
  onClose: () => void;
}) {
  const { actions } = useApp();
  const [form, setForm] = useState<Job>(() => blankJob(initialStage));
  const [tagsText, setTagsText] = useState('');

  useEffect(() => {
    if (!open) return;
    setForm(job ? { ...job } : blankJob(initialStage));
    setTagsText(job ? job.tags.join(', ') : '');
  }, [open, job, initialStage]);

  const set = <K extends keyof Job>(key: K, value: Job[K]) => setForm((current) => ({ ...current, [key]: value }));

  const save = () => {
    const title = form.title.trim();
    if (!title) return;
    actions.saveJob({
      ...form,
      title,
      company: form.company.trim(),
      location: form.location.trim(),
      tags: parseTags(tagsText),
      createdAt: form.createdAt || new Date().toISOString(),
      appliedOn: form.appliedOn || (form.stage !== 'target' ? todayISO() : undefined),
    });
    onClose();
  };

  const numberValue = (value: number | undefined) => (value === undefined ? '' : String(value));
  const parseNumber = (value: string) => (value.trim() === '' ? undefined : Number(value));

  return (
    <Dialog
      open={open}
      onClose={onClose}
      eyebrow={job ? 'Edit role' : 'New target'}
      title={job ? 'Update the record' : 'Add a role'}
      footer={
        <>
          {job ? (
            <DangerButton
              label="Delete role"
              onConfirm={() => {
                actions.deleteJob(form.id);
                onClose();
              }}
            />
          ) : null}
          <span className="dialog__spacer" />
          <button type="button" className="btn" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="btn btn--primary" onClick={save} disabled={!form.title.trim()}>
            {job ? 'Save changes' : 'Add role'}
          </button>
        </>
      }
    >
      <div className="form-grid">
        <Field label="Role title" span>
          <input value={form.title} onChange={(event) => set('title', event.target.value)} placeholder="e.g. Senior Product Manager" autoFocus />
        </Field>
        <Field label="Company">
          <input value={form.company} onChange={(event) => set('company', event.target.value)} placeholder="Company name" />
        </Field>
        <Field label="Location">
          <input value={form.location} onChange={(event) => set('location', event.target.value)} placeholder="City or Remote (US)" />
        </Field>
        <Field label="Work mode">
          <select value={form.mode} onChange={(event) => set('mode', event.target.value as Job['mode'])}>
            <option value="onsite">On-site</option>
            <option value="hybrid">Hybrid</option>
            <option value="remote">Remote</option>
          </select>
        </Field>
        <Field label="Stage">
          <select value={form.stage} onChange={(event) => set('stage', event.target.value as JobStage)}>
            {JOB_STAGES.map((stage) => (
              <option key={stage} value={stage}>
                {JOB_STAGE_META[stage].label}
              </option>
            ))}
          </select>
        </Field>
        <div className="field">
          <span className="field__label">Priority</span>
          <Stars value={form.priority} onChange={(value) => set('priority', value)} />
          <span className="field__hint">How much do you want this one?</span>
        </div>
        <Field label="Source">
          <input value={form.source ?? ''} onChange={(event) => set('source', event.target.value)} placeholder="LinkedIn, referral, careers page" />
        </Field>
        <Field label="Salary min" hint="Base, USD">
          <input
            type="number"
            inputMode="numeric"
            value={numberValue(form.salaryMin)}
            onChange={(event) => set('salaryMin', parseNumber(event.target.value))}
            placeholder="150000"
          />
        </Field>
        <Field label="Salary max">
          <input
            type="number"
            inputMode="numeric"
            value={numberValue(form.salaryMax)}
            onChange={(event) => set('salaryMax', parseNumber(event.target.value))}
            placeholder="180000"
          />
        </Field>
        <Field label="Applied on">
          <input type="date" value={form.appliedOn ?? ''} onChange={(event) => set('appliedOn', event.target.value)} />
        </Field>
        <Field label="Next action" span>
          <input value={form.nextAction ?? ''} onChange={(event) => set('nextAction', event.target.value)} placeholder="What moves this forward?" />
        </Field>
        <Field label="Action due">
          <input type="date" value={form.nextActionOn ?? ''} onChange={(event) => set('nextActionOn', event.target.value)} />
        </Field>
        <Field label="Contact">
          <input value={form.contact ?? ''} onChange={(event) => set('contact', event.target.value)} placeholder="Recruiter, hiring manager…" />
        </Field>
        <Field label="Posting URL" span>
          <input type="url" value={form.url ?? ''} onChange={(event) => set('url', event.target.value)} placeholder="https://…" />
        </Field>
        <Field label="Tags" span hint="Comma separated">
          <input value={tagsText} onChange={(event) => setTagsText(event.target.value)} placeholder="fintech, referral, remote" />
        </Field>
        <Field label="Notes" span>
          <textarea rows={3} value={form.notes ?? ''} onChange={(event) => set('notes', event.target.value)} placeholder="Context, comp intel, interview loop…" />
        </Field>
      </div>
    </Dialog>
  );
}
