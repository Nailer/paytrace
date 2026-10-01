import type { Payment, Status, PaymentEvent } from './payments';
const entries: [string, string, string, Status, string, string, string][] = [
  ['Orbit Studio','4800','4800','completed','US','Brand identity · October','Bridge sandbox'],
  ['Amara Okafor','1250','1000','attention','NG','Product design retainer','Brale sandbox'],
  ['Linear House','3200','3200','processing','GB','Website development','Bridge sandbox'],
  ['Daniel Kim','850','850','completed','KR','Illustration commission','Brale sandbox'],
  ['Forma Collective','6400','6400','returned','DE','September consulting','Bridge sandbox'],
  ['Sofia Martins','2100','2100','completed','PT','Content production','Brale sandbox'],
  ['Northstar Labs','8750','8750','completed','US','Engineering milestone 2','Bridge sandbox'],
  ['Ada Williams','1800','0','awaiting','GB','Research sprint','Not assigned'],
  ['Studio Tayo','3600','3600','processing','NG','Motion design package','Brale sandbox'],
  ['Mika Tanaka','950','950','completed','JP','Interface illustrations','Bridge sandbox'],
  ['Common Ground','5200','5200','completed','CA','Strategy workshop','Brale sandbox'],
  ['Ravi Patel','1450','1450','completed','IN','Accessibility review','Bridge sandbox'],
  ['Paper & Pine','2800','2800','processing','US','Editorial system','Bridge sandbox'],
  ['Elena Rossi','1650','1650','completed','IT','October photography','Brale sandbox'],
  ['Atlas Works','4100','0','awaiting','FR','Mobile app discovery','Not assigned'],
  ['June Park','725','725','completed','KR','Visual QA','Brale sandbox'],
];
export function samplePayments(now = new Date()): Payment[] {
  return entries.map(([customer, amount, received, status, country, description, provider], i) => {
    const time = now.getTime() - (i * 18 + 2) * 3600000;
    const event = (kind: PaymentEvent['kind'], title: string, detail: string, offset: number): PaymentEvent => ({ id: `seed-${i}-${kind}`, kind, title, detail, at: new Date(time + offset * 60000).toISOString() });
    const events: PaymentEvent[] = [event('created', 'Payment request created', 'Sample payment for a fictional customer.', 0)];
    if (received !== '0') events.push(event('received', 'Transfer observed', `${received} demo USDC received. Simulated chain event.`, 2));
    if (['processing','completed','returned'].includes(status)) events.push(event('submitted', 'Payout submitted', `${provider} · simulated payout submitted.`, 3));
    if (status === 'completed') events.push(event('completed', 'Provider reported completion', 'Simulated provider result. Recipient bank receipt is not independently confirmed.', 8));
    if (status === 'returned') events.push(event('returned', 'Payout returned', 'Simulated bank rejection: recipient details need review. No actual funds moved.', 15));
    return { id: `PT-${(1048 - i).toString()}`, customer, email: `${customer.toLowerCase().replaceAll(/[^a-z]/g, '')}@example.com`, amount, received, status, country, description, provider: provider as Payment['provider'], createdAt: new Date(time).toISOString(), dueAt: new Date(time + 7 * 86400000).toISOString(), archived: false, events };
  });
}
