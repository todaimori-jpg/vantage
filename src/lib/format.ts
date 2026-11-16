export function uid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `id-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function todayISO(): string {
  const d = new Date();
  return toDateInput(d);
}

export function toDateInput(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function offsetISO(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return toDateInput(d);
}

export function parseDate(value?: string): Date | null {
  if (!value) return null;
  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (dateOnly) {
    return new Date(Number(dateOnly[1]), Number(dateOnly[2]) - 1, Number(dateOnly[3]));
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

const money = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});

export function formatMoney(value?: number, compact = false): string {
  if (value === undefined || value === null || Number.isNaN(value)) return '—';
  if (compact && Math.abs(value) >= 1000) {
    const thousands = value / 1000;
    const digits = thousands >= 100 || Number.isInteger(thousands) ? 0 : 1;
    return `$${thousands.toFixed(digits).replace(/\.0$/, '')}k`;
  }
  return money.format(value);
}

export function formatRent(value?: number): string {
  if (!value) return 'Rent TBD';
  return `${formatMoney(value)}/mo`;
}

const perSqft = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatPerSqft(value?: number | null): string {
  if (value === undefined || value === null || Number.isNaN(value)) return '—';
  return perSqft.format(value);
}

export function formatDate(value?: string): string {
  const d = parseDate(value);
  if (!d) return '—';
  const sameYear = d.getFullYear() === new Date().getFullYear();
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', ...(sameYear ? {} : { year: 'numeric' }) });
}

export function formatDateTime(value?: string): string {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return formatDate(value);
  return `${formatDate(value)} · ${d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
}

export function formatDateRange(min?: number, max?: number): string {
  if (!min && !max) return 'Salary not listed';
  if (min && max) return `${formatMoney(min, true)}–${formatMoney(max, true)}`;
  if (min) return `${formatMoney(min, true)}+`;
  return `up to ${formatMoney(max, true)}`;
}

export type DueTone = 'overdue' | 'today' | 'soon' | 'later' | 'none';

export function dueInfo(value?: string): { label: string; tone: DueTone } {
  const d = parseDate(value);
  if (!d) return { label: '', tone: 'none' };
  const today = new Date();
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const diff = Math.round((d.getTime() - start.getTime()) / 86_400_000);
  if (diff < 0) return { label: diff === -1 ? 'Yesterday' : `${Math.abs(diff)}d overdue`, tone: 'overdue' };
  if (diff === 0) return { label: 'Today', tone: 'today' };
  if (diff === 1) return { label: 'Tomorrow', tone: 'soon' };
  if (diff <= 6) return { label: `In ${diff}d`, tone: 'soon' };
  return { label: formatDate(value), tone: 'later' };
}

export function timeAgo(iso?: string): string {
  if (!iso) return '';
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';
  const diff = Date.now() - then;
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 5) return 'Working late';
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

export function pct(part: number, total: number): number {
  if (!total) return 0;
  return Math.round((part / total) * 100);
}
