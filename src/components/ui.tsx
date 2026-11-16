import { useEffect, useId, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Star, X } from 'lucide-react';
import { scoreLabel } from '../lib/calc';

export function Dialog({
  open,
  onClose,
  title,
  eyebrow,
  children,
  footer,
  wide = false,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  eyebrow?: string;
  children: ReactNode;
  footer?: ReactNode;
  wide?: boolean;
}) {
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div
      className="dialog-scrim"
      onPointerDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className={wide ? 'dialog dialog--wide' : 'dialog'} role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <header className="dialog__head">
          <div>
            {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
            <h2 id={titleId}>{title}</h2>
          </div>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close dialog">
            <X size={18} />
          </button>
        </header>
        <div className="dialog__body">{children}</div>
        {footer ? <footer className="dialog__foot">{footer}</footer> : null}
      </div>
    </div>,
    document.body
  );
}

export function Field({ label, hint, children, span = false }: { label: string; hint?: string; children: ReactNode; span?: boolean }) {
  return (
    <label className={span ? 'field field--span' : 'field'}>
      <span className="field__label">{label}</span>
      {children}
      {hint ? <span className="field__hint">{hint}</span> : null}
    </label>
  );
}

export function Stars({ value, onChange }: { value: number; onChange: (value: number) => void }) {
  return (
    <div className="stars" role="group" aria-label="Priority">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          type="button"
          key={n}
          className={n <= value ? 'stars__btn is-on' : 'stars__btn'}
          onClick={() => onChange(n)}
          aria-label={`${n} star${n > 1 ? 's' : ''}`}
          aria-pressed={n <= value}
        >
          <Star size={15} fill={n <= value ? 'currentColor' : 'none'} strokeWidth={1.6} />
        </button>
      ))}
    </div>
  );
}

export function StarDisplay({ value }: { value: number }) {
  return (
    <span className="stars stars--display" aria-label={`${value} of 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <span key={n} className={n <= value ? 'stars__btn is-on' : 'stars__btn'}>
          <Star size={11} fill={n <= value ? 'currentColor' : 'none'} strokeWidth={1.6} />
        </span>
      ))}
    </span>
  );
}

export function ScoreRing({ value, size = 42 }: { value: number; size?: number }) {
  const radius = 16;
  const circumference = 2 * Math.PI * radius;
  const color = value >= 80 ? '#63f2b4' : value >= 65 ? '#ffb454' : value >= 50 ? '#6cc4ff' : '#ff6b6b';
  return (
    <span className="ring" style={{ width: size, height: size }} title={`${scoreLabel(value)} · ${value}/100`}>
      <svg viewBox="0 0 40 40" width={size} height={size} aria-hidden="true">
        <circle cx="20" cy="20" r={radius} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="2.5" />
        <circle
          cx="20"
          cy="20"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeDasharray={`${(value / 100) * circumference} ${circumference}`}
          transform="rotate(-90 20 20)"
        />
      </svg>
      <span className="ring__value" style={{ color }}>
        {value}
      </span>
    </span>
  );
}

export function PanelHead({ eyebrow, title, trailing }: { eyebrow: string; title: string; trailing?: ReactNode }) {
  return (
    <div className="panel-head">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h3>{title}</h3>
      </div>
      {trailing ? <div className="panel-head__trailing">{trailing}</div> : null}
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  body,
  action,
}: {
  icon?: ReactNode;
  title: string;
  body: string;
  action?: ReactNode;
}) {
  return (
    <div className="empty">
      {icon ? <span className="empty__icon">{icon}</span> : null}
      <p className="empty__title">{title}</p>
      <p className="empty__body">{body}</p>
      {action ? <div className="empty__action">{action}</div> : null}
    </div>
  );
}

export function DangerButton({ label = 'Delete', onConfirm }: { label?: string; onConfirm: () => void }) {
  const [armed, setArmed] = useState(false);

  useEffect(() => {
    if (!armed) return;
    const timer = window.setTimeout(() => setArmed(false), 4000);
    return () => window.clearTimeout(timer);
  }, [armed]);

  return (
    <button
      type="button"
      className={armed ? 'btn btn--danger is-armed' : 'btn btn--danger'}
      onClick={() => {
        if (armed) onConfirm();
        else setArmed(true);
      }}
    >
      {armed ? 'Confirm delete' : label}
    </button>
  );
}

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (checked: boolean) => void; label: string }) {
  return (
    <label className="toggle">
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
      <span className="toggle__track" aria-hidden="true">
        <span className="toggle__thumb" />
      </span>
      <span className="toggle__label">{label}</span>
    </label>
  );
}
