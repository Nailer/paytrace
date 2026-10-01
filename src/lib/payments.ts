export type Status = 'awaiting' | 'processing' | 'completed' | 'attention' | 'returned';
export type EventKind = 'created' | 'received' | 'submitted' | 'completed' | 'returned' | 'note';
export type PaymentEvent = { id: string; kind: EventKind; at: string; title: string; detail: string };
export type Payment = {
  id: string; customer: string; email: string; description: string; amount: string; received: string;
  status: Status; provider: 'Bridge sandbox' | 'Brale sandbox' | 'Not assigned'; country: string;
  createdAt: string; dueAt: string; events: PaymentEvent[]; archived: boolean; note?: string;
};
export const labels: Record<Status, string> = { awaiting: 'Awaiting payment', processing: 'In transit', completed: 'Completed', attention: 'Needs attention', returned: 'Returned' };
export const statusOrder: Status[] = ['completed', 'processing', 'attention', 'returned', 'awaiting'];
export function units(value: string): bigint {
  if (!/^\d{1,12}(\.\d{1,6})?$/.test(value)) throw new Error('Enter an amount with up to 6 decimal places.');
  const [whole, fraction = ''] = value.split('.');
  return BigInt(whole) * 1_000_000n + BigInt(fraction.padEnd(6, '0'));
}
export function decimal(value: bigint): string {
  const negative = value < 0n; const abs = negative ? -value : value;
  return `${negative ? '-' : ''}${abs / 1_000_000n}.${(abs % 1_000_000n).toString().padStart(6, '0')}`;
}
export function money(value: string, compact = false): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', notation: compact ? 'compact' : 'standard', minimumFractionDigits: compact ? 0 : 2, maximumFractionDigits: compact ? 1 : 2 }).format(Number(value));
}
export function tokenAmount(value: string): string {
  const raw = units(value);
  const whole = (raw / 1_000_000n).toLocaleString('en-US');
  const fraction = (raw % 1_000_000n).toString().padStart(6, '0').replace(/0+$/, '').padEnd(2, '0');
  return `${whole}.${fraction}`;
}
export function sum(payments: Payment[], field: 'amount' | 'received' = 'amount'): string { return decimal(payments.reduce((total, p) => total + units(p[field]), 0n)); }
export function initials(name: string): string { return name.split(' ').slice(0, 2).map(s => s[0]).join('').toUpperCase(); }
export function dateLabel(date: string): string { return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }); }
export function needsAttention(p: Payment): boolean { return !p.archived && (p.status === 'attention' || p.status === 'returned'); }
export function createPayment(input: { customer: string; email: string; description: string; amount: string; country: string }, now = new Date()): Payment {
  if (!input.customer.trim() || input.customer.trim().length > 80) throw new Error('Enter a customer name between 1 and 80 characters.');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email) || input.email.length > 254) throw new Error('Enter a valid email address.');
  if (units(input.amount) <= 0n) throw new Error('The requested amount must be greater than zero.');
  const at = now.toISOString();
  return { ...input, customer: input.customer.trim(), email: input.email.trim(), description: input.description.trim().slice(0, 240), id: `PT-${crypto.randomUUID().slice(0, 8).toUpperCase()}`, received: '0', status: 'awaiting', provider: 'Not assigned', createdAt: at, dueAt: new Date(now.getTime() + 7 * 86400000).toISOString(), archived: false, events: [{ id: crypto.randomUUID(), kind: 'created', at, title: 'Payment request created', detail: 'Demo request saved on this device. No email or payment was sent.' }] };
}
export function applyEvent(payment: Payment, event: PaymentEvent, received?: string): Payment {
  if (payment.events.some(e => e.id === event.id)) return payment;
  if (payment.events.some(e => new Date(e.at).getTime() > new Date(event.at).getTime())) throw new Error('An older event cannot replace the current payment state.');
  let status = payment.status; let nextReceived = payment.received;
  if (event.kind === 'received') {
    if (payment.status !== 'awaiting') throw new Error('Receipt can only be recorded for an awaiting payment.');
    if (received === undefined || units(received) <= 0n) throw new Error('Received amount must be greater than zero.');
    nextReceived = received; status = units(received) === units(payment.amount) ? 'processing' : 'attention';
  } else if (event.kind === 'submitted') {
    if (payment.status !== 'processing') throw new Error('Only a matched payment can be submitted.');
  } else if (event.kind === 'completed') {
    if (payment.status !== 'processing') throw new Error('Only an in-transit payment can be completed.');
    status = 'completed';
  } else if (event.kind === 'returned') {
    if (!['processing', 'completed'].includes(payment.status)) throw new Error('Only a submitted payment can be returned.');
    status = 'returned';
  }
  return { ...payment, received: nextReceived, status, archived: event.kind === 'returned' ? false : payment.archived, events: [...payment.events, event] };
}
export function csv(payments: Payment[]): string {
  const escape = (v: string) => `"${(/^[=+\-@\t\r]/.test(v) ? "'" + v : v).replaceAll('"', '""')}"`;
  const rows = [['Payment ID', 'Customer', 'Email', 'Description', 'Requested USDC', 'Received USDC', 'Status', 'Provider', 'Created', 'Source'], ...payments.map(p => [p.id, p.customer, p.email, p.description, p.amount, p.received, labels[p.status], p.provider, p.createdAt, 'Demo / simulated'])];
  return rows.map(r => r.map(escape).join(',')).join('\r\n');
}
export function isPayment(value: unknown): value is Payment {
  if (!value || typeof value !== 'object') return false;
  const p = value as Payment;
  try { units(p.amount); units(p.received); } catch { return false; }
  return typeof p.id === 'string' && typeof p.customer === 'string' && typeof p.email === 'string' && typeof p.description === 'string' && typeof p.country === 'string' && typeof p.archived === 'boolean' && Object.keys(labels).includes(p.status) && ['Bridge sandbox', 'Brale sandbox', 'Not assigned'].includes(p.provider) && !Number.isNaN(Date.parse(p.createdAt)) && !Number.isNaN(Date.parse(p.dueAt)) && Array.isArray(p.events) && p.events.every(e => typeof e.id === 'string' && typeof e.title === 'string' && typeof e.detail === 'string' && ['created','received','submitted','completed','returned','note'].includes(e.kind) && !Number.isNaN(Date.parse(e.at)));
}
