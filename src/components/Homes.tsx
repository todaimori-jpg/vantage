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
import { Bath, BedDouble, CalendarDays, Check, ExternalLink, GripVertical, Plus, Ruler, Search } from 'lucide-react';
import { HOME_STAGES, HOME_STAGE_META, type Apartment, type HomeStage, type View } from '../types';
import { useApp } from '../store';
import { Dialog, EmptyState, ScoreRing, StarDisplay } from './ui';
import { HomeModal } from './HomeModal';
import { apartmentScore, moveInCost, pricePerSqft, scoreLabel } from '../lib/calc';
import { dueInfo, formatDate, formatDateTime, formatMoney, formatPerSqft } from '../lib/format';

const LAUNDRY_LABEL: Record<string, string> = {
  'in-unit': 'W/D in unit',
  'in-building': 'W/D in building',
  none: 'No laundry',
};

function HomeCard({
  home,
  score,
  selected,
  onToggle,
  onOpen,
}: {
  home: Apartment;
  score: number;
  selected: boolean;
  onToggle: () => void;
  onOpen: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: home.id });
  const style = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : undefined;
  const ppsf = pricePerSqft(home);
  const total = moveInCost(home);
  const tour = home.tourAt ? dueInfo(home.tourAt) : null;

  return (
    <article
      ref={setNodeRef}
      style={style}
      className={`hcard${isDragging ? ' is-dragging' : ''}${selected ? ' is-selected' : ''}`}
      onClick={onOpen}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onOpen();
        }
      }}
      role="button"
      tabIndex={0}
      aria-label={`Edit ${home.address}`}
    >
      <div className="hcard__bar">
        <button
          type="button"
          className={selected ? 'pick is-on' : 'pick'}
          onClick={(event) => {
            event.stopPropagation();
            onToggle();
          }}
          aria-pressed={selected}
          aria-label={selected ? 'Remove from comparison' : 'Add to comparison'}
        >
          {selected ? <Check size={12} /> : null}
        </button>
        <span className="hcard__barspace" />
        <StarDisplay value={home.rating ?? 0} />
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

      <div className="hcard__addr-row">
        <div className="hcard__addr">
          <h4>
            {home.address}
            {home.unit ? <span className="hcard__unit">#{home.unit}</span> : null}
          </h4>
          <p>{home.neighborhood || 'Neighborhood TBD'}</p>
        </div>
        <ScoreRing value={score} size={40} />
      </div>

      <div className="hcard__rent">
        <strong>{home.rent ? formatMoney(home.rent) : 'Rent TBD'}</strong>
        {home.rent ? <span>/mo</span> : null}
        {ppsf ? <em>{formatPerSqft(ppsf)}/sqft</em> : null}
      </div>

      <div className="hcard__specs">
        <span>
          <BedDouble size={13} /> {home.beds === 0 ? 'Studio' : home.beds ? `${home.beds} bd` : '—'}
        </span>
        <span>
          <Bath size={13} /> {home.baths ? `${home.baths} ba` : '—'}
        </span>
        <span>
          <Ruler size={13} /> {home.sqft ? `${home.sqft} ft²` : '—'}
        </span>
      </div>

      <div className="chips">
        {home.laundry ? <span className="chip">{LAUNDRY_LABEL[home.laundry]}</span> : null}
        {home.tags.slice(0, 2).map((tag) => (
          <span className="chip" key={tag}>
            {tag}
          </span>
        ))}
      </div>

      {home.tourAt ? (
        <div className={`due due--${tour?.tone ?? 'soon'}`}>
          <CalendarDays size={12} />
          <span className="due__text">Tour</span>
          <b>{formatDateTime(home.tourAt)}</b>
        </div>
      ) : null}

      <div className="hcard__foot">
        <span>Move-in {formatMoney(total)}</span>
        {home.availableFrom ? <span>Avail {formatDate(home.availableFrom)}</span> : null}
        {home.url ? (
          <a
            href={home.url}
            target="_blank"
            rel="noreferrer noopener"
            className="jcard__link"
            onClick={(event) => event.stopPropagation()}
            aria-label="Open listing"
          >
            <ExternalLink size={12} />
          </a>
        ) : null}
      </div>
    </article>
  );
}

function HomeColumn({
  stage,
  homes,
  scores,
  selected,
  onToggle,
  onOpen,
  onAdd,
}: {
  stage: HomeStage;
  homes: Apartment[];
  scores: Map<string, number>;
  selected: string[];
  onToggle: (id: string) => void;
  onOpen: (home: Apartment) => void;
  onAdd: (stage: HomeStage) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: stage });
  const meta = HOME_STAGE_META[stage];

  return (
    <section className={`col${isOver ? ' is-over' : ''}`} ref={setNodeRef}>
      <header className="col__head">
        <span className="col__dot" style={{ background: meta.color }} />
        <span className="col__title">{meta.label}</span>
        <span className="col__count">{homes.length}</span>
        <button type="button" className="col__add" onClick={() => onAdd(stage)} aria-label={`Add apartment to ${meta.label}`}>
          <Plus size={14} />
        </button>
      </header>
      <div className="col__body">
        {homes.map((home) => (
          <HomeCard
            key={home.id}
            home={home}
            score={scores.get(home.id) ?? 0}
            selected={selected.includes(home.id)}
            onToggle={() => onToggle(home.id)}
            onOpen={() => onOpen(home)}
          />
        ))}
        {homes.length === 0 ? <div className="col__empty">Drop a listing here</div> : null}
      </div>
    </section>
  );
}

function bestOf(values: Array<number | undefined>, mode: 'min' | 'max'): number | undefined {
  const defined = values.filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
  if (defined.length < 2) return undefined;
  return mode === 'min' ? Math.min(...defined) : Math.max(...defined);
}

function CompareDialog({
  open,
  homes,
  scores,
  onClose,
  onRemove,
}: {
  open: boolean;
  homes: Apartment[];
  scores: Map<string, number>;
  onClose: () => void;
  onRemove: (id: string) => void;
}) {
  const bestRent = bestOf(homes.map((h) => h.rent), 'min');
  const bestMoveIn = bestOf(homes.map((h) => moveInCost(h)), 'min');
  const bestPpsf = bestOf(homes.map(pricePerSqft), 'min');
  const bestCommute = bestOf(homes.map((h) => h.commuteMin), 'min');
  const bestScore = bestOf(homes.map((h) => scores.get(h.id)), 'max');
  const bestRating = bestOf(homes.map((h) => h.rating), 'max');

  const cell = (value: number | undefined, best: number | undefined) =>
    value !== undefined && best !== undefined && value === best ? 'cmp__cell is-best' : 'cmp__cell';

  return (
    <Dialog open={open} onClose={onClose} wide eyebrow="Side by side" title="Compare listings">
      <div className="cmp-wrap">
        <table className="cmp">
          <thead>
            <tr>
              <th scope="col" className="cmp__label">
                Criteria
              </th>
              {homes.map((home) => (
                <th scope="col" key={home.id}>
                  <span className="cmp__addr">{home.address}</span>
                  <span className="cmp__hood">{home.neighborhood}</span>
                  <button type="button" className="cmp__remove" onClick={() => onRemove(home.id)} aria-label={`Remove ${home.address}`}>
                    Remove
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <th scope="row">Monthly rent</th>
              {homes.map((home) => (
                <td key={home.id} className={cell(home.rent, bestRent)}>
                  {home.rent ? formatMoney(home.rent) : '—'}
                </td>
              ))}
            </tr>
            <tr>
              <th scope="row">Move-in cost</th>
              {homes.map((home) => (
                <td key={home.id} className={cell(moveInCost(home), bestMoveIn)}>
                  {formatMoney(moveInCost(home))}
                </td>
              ))}
            </tr>
            <tr>
              <th scope="row">$ / sqft</th>
              {homes.map((home) => (
                <td key={home.id} className={cell(pricePerSqft(home), bestPpsf)}>
                  {pricePerSqft(home) ? formatPerSqft(pricePerSqft(home)) : '—'}
                </td>
              ))}
            </tr>
            <tr>
              <th scope="row">Layout</th>
              {homes.map((home) => (
                <td key={home.id}>
                  {home.beds === 0 ? 'Studio' : home.beds ? `${home.beds} bd` : '—'} · {home.baths ? `${home.baths} ba` : '—'} ·{' '}
                  {home.sqft ? `${home.sqft} ft²` : '—'}
                </td>
              ))}
            </tr>
            <tr>
              <th scope="row">Commute</th>
              {homes.map((home) => (
                <td key={home.id} className={cell(home.commuteMin, bestCommute)}>
                  {home.commuteMin ? `${home.commuteMin} min` : '—'}
                </td>
              ))}
            </tr>
            <tr>
              <th scope="row">Laundry</th>
              {homes.map((home) => (
                <td key={home.id}>{home.laundry ? LAUNDRY_LABEL[home.laundry] : '—'}</td>
              ))}
            </tr>
            <tr>
              <th scope="row">Pets</th>
              {homes.map((home) => (
                <td key={home.id}>{home.pets || 'Unknown'}</td>
              ))}
            </tr>
            <tr>
              <th scope="row">Tour</th>
              {homes.map((home) => (
                <td key={home.id}>{home.tourAt ? formatDateTime(home.tourAt) : '—'}</td>
              ))}
            </tr>
            <tr>
              <th scope="row">Rating</th>
              {homes.map((home) => (
                <td key={home.id} className={cell(home.rating, bestRating)}>
                  {home.rating ? `${home.rating}/5` : '—'}
                </td>
              ))}
            </tr>
            <tr>
              <th scope="row">Signal score</th>
              {homes.map((home) => {
                const value = scores.get(home.id) ?? 0;
                return (
                  <td key={home.id} className={cell(value, bestScore)}>
                    {value} · {scoreLabel(value)}
                  </td>
                );
              })}
            </tr>
            <tr>
              <th scope="row">Lease</th>
              {homes.map((home) => (
                <td key={home.id}>
                  {home.leaseMonths ? `${home.leaseMonths} mo` : '—'} · {home.availableFrom ? `from ${formatDate(home.availableFrom)}` : 'date TBD'}
                </td>
              ))}
            </tr>
            <tr>
              <th scope="row">Pros</th>
              {homes.map((home) => (
                <td key={home.id} className="cmp__prose">
                  {home.pros || '—'}
                </td>
              ))}
            </tr>
            <tr>
              <th scope="row">Cons</th>
              {homes.map((home) => (
                <td key={home.id} className="cmp__prose">
                  {home.cons || '—'}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
      <div className="dialog__foot dialog__foot--inline">
        <span className="mono-dim">Best values are highlighted.</span>
        <span className="dialog__spacer" />
        <button type="button" className="btn btn--primary" onClick={onClose}>
          Done
        </button>
      </div>
    </Dialog>
  );
}

export function HomesView({ onNavigate }: { onNavigate: (view: View) => void }) {
  const { state, actions } = useApp();
  const { apartments, settings } = state;
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Apartment | null>(null);
  const [initialStage, setInitialStage] = useState<HomeStage>('shortlist');
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [comparing, setComparing] = useState(false);

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 6 } }),
    useSensor(KeyboardSensor)
  );

  const activeHomes = apartments.filter((home) => home.stage !== 'passed' && home.stage !== 'leased');
  const tours = activeHomes.filter((home) => home.tourAt && new Date(home.tourAt).getTime() > Date.now());
  const priced = activeHomes.filter((home) => home.rent);
  const avgRent = priced.length ? Math.round(priced.reduce((sum, home) => sum + (home.rent ?? 0), 0) / priced.length) : undefined;
  const inBudget = priced.filter((home) => (home.rent ?? 0) <= settings.rentBudget).length;

  const scores = useMemo(
    () => new Map(apartments.map((home) => [home.id, apartmentScore(home, settings, apartments)])),
    [apartments, settings]
  );

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return apartments;
    return apartments.filter((home) =>
      [home.address, home.neighborhood ?? '', home.source ?? '', ...home.tags].join(' ').toLowerCase().includes(needle)
    );
  }, [apartments, query]);

  const selectedHomes = apartments.filter((home) => selected.includes(home.id));

  const openNew = (stage: HomeStage) => {
    setEditing(null);
    setInitialStage(stage);
    setOpen(true);
  };

  const openEdit = (home: Apartment) => {
    setEditing(home);
    setOpen(true);
  };

  const toggle = (id: string) =>
    setSelected((current) => (current.includes(id) ? current.filter((value) => value !== id) : [...current, id]));

  const onDragEnd = (event: DragEndEvent) => {
    const homeId = String(event.active.id);
    const target = event.over?.id;
    if (typeof target === 'string' && HOME_STAGES.includes(target as HomeStage)) {
      actions.moveApartment(homeId, target as HomeStage);
    }
  };

  return (
    <>
      <header className="page-head">
        <div>
          <p className="eyebrow">Housing search</p>
          <h1>Apartment pipeline</h1>
          <p className="page-sub">
            {activeHomes.length} live listings · {tours.length} tours ahead ·{' '}
            {avgRent ? `avg ${formatMoney(avgRent)}/mo` : 'no rents logged yet'} · {inBudget} within budget
          </p>
        </div>
        <div className="page-actions">
          <div className="search-box">
            <Search size={15} />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Filter addresses, tags…" aria-label="Filter listings" />
          </div>
          <button type="button" className="btn" onClick={() => onNavigate('search')}>
            Search market
          </button>
          <button type="button" className="btn btn--primary" onClick={() => openNew('shortlist')}>
            <Plus size={15} /> Add apartment
          </button>
        </div>
      </header>

      {apartments.length === 0 ? (
        <div className="panel">
          <EmptyState
            icon={<Search size={22} />}
            title="No apartments on the board"
            body="Sweep the market in the search console, then save the listings worth tracking here. Compare, tour, and lock in the best total cost."
            action={
              <div className="empty__buttons">
                <button type="button" className="btn" onClick={() => onNavigate('search')}>
                  Open search console
                </button>
                <button type="button" className="btn btn--primary" onClick={() => openNew('shortlist')}>
                  Add a listing
                </button>
              </div>
            }
          />
        </div>
      ) : (
        <>
          <DndContext sensors={sensors} onDragEnd={onDragEnd}>
            <div className="board board--homes">
              {HOME_STAGES.map((stage) => (
                <HomeColumn
                  key={stage}
                  stage={stage}
                  homes={filtered
                    .filter((home) => home.stage === stage)
                    .sort((a, b) => (scores.get(b.id) ?? 0) - (scores.get(a.id) ?? 0))}
                  scores={scores}
                  selected={selected}
                  onToggle={toggle}
                  onOpen={openEdit}
                  onAdd={openNew}
                />
              ))}
            </div>
            {filtered.length === 0 ? <p className="board__empty">No listings match “{query}”.</p> : null}
          </DndContext>

          {selectedHomes.length > 0 ? (
            <div className="compare-bar">
              <span className="compare-bar__count">
                {selectedHomes.length} selected
              </span>
              <button type="button" className="btn btn--ghost" onClick={() => setSelected([])}>
                Clear
              </button>
              <button type="button" className="btn btn--primary" onClick={() => setComparing(true)} disabled={selectedHomes.length < 2}>
                Compare
              </button>
            </div>
          ) : null}
        </>
      )}

      <HomeModal open={open} apartment={editing} initialStage={initialStage} onClose={() => setOpen(false)} />
      <CompareDialog
        open={comparing}
        homes={selectedHomes}
        scores={scores}
        onClose={() => setComparing(false)}
        onRemove={(id) => toggle(id)}
      />
    </>
  );
}
