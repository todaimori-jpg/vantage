import { useEffect, useState } from 'react';
import { HOME_STAGES, HOME_STAGE_META, type Apartment, type HomeStage } from '../types';
import { useApp } from '../store';
import { DangerButton, Dialog, Field, Stars } from './ui';
import { uid } from '../lib/format';

function blankApartment(stage: HomeStage): Apartment {
  return {
    id: uid(),
    address: '',
    stage,
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

export function HomeModal({
  open,
  apartment,
  initialStage = 'shortlist',
  onClose,
}: {
  open: boolean;
  apartment: Apartment | null;
  initialStage?: HomeStage;
  onClose: () => void;
}) {
  const { actions } = useApp();
  const [form, setForm] = useState<Apartment>(() => blankApartment(initialStage));
  const [tagsText, setTagsText] = useState('');

  useEffect(() => {
    if (!open) return;
    setForm(apartment ? { ...apartment } : blankApartment(initialStage));
    setTagsText(apartment ? apartment.tags.join(', ') : '');
  }, [open, apartment, initialStage]);

  const set = <K extends keyof Apartment>(key: K, value: Apartment[K]) =>
    setForm((current) => ({ ...current, [key]: value }));

  const save = () => {
    const address = form.address.trim();
    if (!address) return;
    actions.saveApartment({
      ...form,
      address,
      neighborhood: form.neighborhood?.trim() || undefined,
      tags: parseTags(tagsText),
      createdAt: form.createdAt || new Date().toISOString(),
    });
    onClose();
  };

  const numberValue = (value: number | undefined) => (value === undefined ? '' : String(value));
  const parseNumber = (value: string) => (value.trim() === '' ? undefined : Number(value));

  return (
    <Dialog
      open={open}
      onClose={onClose}
      wide
      eyebrow={apartment ? 'Edit listing' : 'New listing'}
      title={apartment ? form.address || 'Update the record' : 'Track an apartment'}
      footer={
        <>
          {apartment ? (
            <DangerButton
              label="Delete listing"
              onConfirm={() => {
                actions.deleteApartment(form.id);
                onClose();
              }}
            />
          ) : null}
          <span className="dialog__spacer" />
          <button type="button" className="btn" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="btn btn--primary" onClick={save} disabled={!form.address.trim()}>
            {apartment ? 'Save changes' : 'Add listing'}
          </button>
        </>
      }
    >
      <div className="form-section">
        <p className="form-section__title">Listing</p>
        <div className="form-grid">
          <Field label="Street address" span>
            <input value={form.address} onChange={(event) => set('address', event.target.value)} placeholder="210 Bedford Ave" autoFocus />
          </Field>
          <Field label="Unit">
            <input value={form.unit ?? ''} onChange={(event) => set('unit', event.target.value)} placeholder="3R" />
          </Field>
          <Field label="Neighborhood">
            <input
              value={form.neighborhood ?? ''}
              onChange={(event) => set('neighborhood', event.target.value)}
              placeholder="Williamsburg, Brooklyn"
            />
          </Field>
          <Field label="Stage">
            <select value={form.stage} onChange={(event) => set('stage', event.target.value as HomeStage)}>
              {HOME_STAGES.map((stage) => (
                <option key={stage} value={stage}>
                  {HOME_STAGE_META[stage].label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Tour date">
            <input type="datetime-local" value={form.tourAt ?? ''} onChange={(event) => set('tourAt', event.target.value)} />
          </Field>
        </div>
      </div>

      <div className="form-section">
        <p className="form-section__title">Economics</p>
        <div className="form-grid">
          <Field label="Monthly rent" hint="USD">
            <input
              type="number"
              inputMode="numeric"
              value={numberValue(form.rent)}
              onChange={(event) => set('rent', parseNumber(event.target.value))}
              placeholder="3200"
            />
          </Field>
          <Field label="Square feet">
            <input
              type="number"
              inputMode="numeric"
              value={numberValue(form.sqft)}
              onChange={(event) => set('sqft', parseNumber(event.target.value))}
              placeholder="650"
            />
          </Field>
          <Field label="Beds" hint="0 = studio">
            <input
              type="number"
              inputMode="numeric"
              min={0}
              value={numberValue(form.beds)}
              onChange={(event) => set('beds', parseNumber(event.target.value))}
              placeholder="1"
            />
          </Field>
          <Field label="Baths">
            <input
              type="number"
              inputMode="decimal"
              step="0.5"
              value={numberValue(form.baths)}
              onChange={(event) => set('baths', parseNumber(event.target.value))}
              placeholder="1"
            />
          </Field>
          <Field label="Deposit">
            <input
              type="number"
              inputMode="numeric"
              value={numberValue(form.deposit)}
              onChange={(event) => set('deposit', parseNumber(event.target.value))}
              placeholder="3200"
            />
          </Field>
          <Field label="Broker fee">
            <input
              type="number"
              inputMode="numeric"
              value={numberValue(form.brokerFee)}
              onChange={(event) => set('brokerFee', parseNumber(event.target.value))}
              placeholder="0"
            />
          </Field>
          <Field label="Available from">
            <input type="date" value={form.availableFrom ?? ''} onChange={(event) => set('availableFrom', event.target.value)} />
          </Field>
          <Field label="Lease months">
            <input
              type="number"
              inputMode="numeric"
              value={numberValue(form.leaseMonths)}
              onChange={(event) => set('leaseMonths', parseNumber(event.target.value))}
              placeholder="12"
            />
          </Field>
          <label className="check">
            <input type="checkbox" checked={!!form.lastMonth} onChange={(event) => set('lastMonth', event.target.checked)} />
            <span>Last month’s rent due upfront</span>
          </label>
        </div>
      </div>

      <div className="form-section">
        <p className="form-section__title">Liveability</p>
        <div className="form-grid">
          <Field label="Laundry">
            <select value={form.laundry ?? ''} onChange={(event) => set('laundry', (event.target.value || undefined) as Apartment['laundry'])}>
              <option value="">Unknown</option>
              <option value="in-unit">In unit</option>
              <option value="in-building">In building</option>
              <option value="none">None</option>
            </select>
          </Field>
          <Field label="Pets">
            <input value={form.pets ?? ''} onChange={(event) => set('pets', event.target.value)} placeholder="Cats ok, dogs on approval" />
          </Field>
          <Field label="Commute minutes" hint="Door to door">
            <input
              type="number"
              inputMode="numeric"
              value={numberValue(form.commuteMin)}
              onChange={(event) => set('commuteMin', parseNumber(event.target.value))}
              placeholder="28"
            />
          </Field>
          <div className="field">
            <span className="field__label">Your rating</span>
            <Stars value={form.rating ?? 0} onChange={(value) => set('rating', value)} />
            <span className="field__hint">Gut feel after touring</span>
          </div>
        </div>
      </div>

      <div className="form-section">
        <p className="form-section__title">Tracking</p>
        <div className="form-grid">
          <Field label="Listing URL" span>
            <input type="url" value={form.url ?? ''} onChange={(event) => set('url', event.target.value)} placeholder="https://…" />
          </Field>
          <Field label="Source">
            <input value={form.source ?? ''} onChange={(event) => set('source', event.target.value)} placeholder="StreetEasy, Zillow, owner" />
          </Field>
          <Field label="Contact">
            <input value={form.contact ?? ''} onChange={(event) => set('contact', event.target.value)} placeholder="Agent or landlord" />
          </Field>
          <Field label="Pros" span>
            <textarea rows={2} value={form.pros ?? ''} onChange={(event) => set('pros', event.target.value)} placeholder="Light, layout, commute, building amenities…" />
          </Field>
          <Field label="Cons" span>
            <textarea rows={2} value={form.cons ?? ''} onChange={(event) => set('cons', event.target.value)} placeholder="Fees, noise, missing amenities…" />
          </Field>
          <Field label="Tags" span hint="Comma separated">
            <input value={tagsText} onChange={(event) => setTagsText(event.target.value)} placeholder="pre-war, roof deck, no-fee" />
          </Field>
          <Field label="Notes" span>
            <textarea rows={2} value={form.notes ?? ''} onChange={(event) => set('notes', event.target.value)} placeholder="Anything else worth remembering" />
          </Field>
        </div>
      </div>
    </Dialog>
  );
}
