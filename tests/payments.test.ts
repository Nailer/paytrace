import test from 'node:test';
import assert from 'node:assert/strict';
import { applyEvent, createPayment, csv, decimal, isPayment, needsAttention, tokenAmount, units } from '../src/lib/payments';
import type { PaymentEvent } from '../src/lib/payments';
const input = { customer: 'Example Studio', email: 'studio@example.com', amount: '0.100001', country: 'NG', description: 'Design' };
const start = new Date('2026-10-01T12:00:00Z');
const event = (kind: PaymentEvent['kind'], id = kind): PaymentEvent => ({ id, kind, at: '2026-10-01T12:01:00Z', title: kind, detail: 'Simulation' });
test('token amounts reconcile exactly without floating-point rounding', () => {
  assert.equal(units('0.1') + units('0.2'), units('0.3'));
  assert.equal(decimal(units('0.100001')), '0.100001');
  assert.throws(() => units('0.0000001'));
  assert.throws(() => units('-1'));
  assert.throws(() => units('1e6'));
  assert.equal(tokenAmount('0.000001'), '0.000001');
  assert.equal(tokenAmount('1250.100001'), '1,250.100001');
});
test('a matching receipt enters processing and a payout can later return', () => {
  const p = createPayment(input, start);
  const received = applyEvent(p, event('received'), input.amount);
  assert.equal(received.status, 'processing');
  const completed = applyEvent(received, event('completed'));
  assert.equal(completed.status, 'completed');
  const returned = applyEvent(completed, event('returned'));
  assert.equal(returned.status, 'returned');
  assert.equal(needsAttention(returned), true);
});
test('duplicate events do not append or alter balances', () => {
  const p = applyEvent(createPayment(input, start), event('received'), input.amount);
  const duplicate = applyEvent(p, event('received'), '9000');
  assert.equal(duplicate, p);
  assert.equal(duplicate.events.length, 2);
});
test('underpayments and overpayments require attention and cannot be marked complete', () => {
  for (const amount of ['0.1', '0.100002']) {
    const p = applyEvent(createPayment(input, start), event('received'), amount);
    assert.equal(p.status, 'attention');
    assert.throws(() => applyEvent(p, event('completed')));
  }
});
test('completion without a matching receipt is rejected', () => {
  assert.throws(() => applyEvent(createPayment(input, start), event('completed')));
});
test('older events cannot rewind a payment', () => {
  const p = applyEvent(createPayment(input, start), event('received'), input.amount);
  assert.throws(() => applyEvent(p, { ...event('completed'), at: '2026-10-01T11:00:00Z' }));
});
test('CSV escapes quotes and spreadsheet formulas', () => {
  const p = createPayment({ ...input, customer: '=HYPERLINK("unsafe")' }, start);
  const output = csv([p]);
  assert.ok(output.includes("'="));
  assert.ok(output.includes('""unsafe""'));
  assert.ok(output.includes('Demo / simulated'));
});
test('notes and inbox archival do not change financial status', () => {
  const p = applyEvent(createPayment(input, start), event('received'), '0.01');
  const noted = applyEvent(p, event('note'));
  assert.equal(noted.status, 'attention');
  assert.equal(needsAttention({ ...noted, archived: true }), false);
});
test('invalid requests and malformed saved records are rejected', () => {
  assert.throws(() => createPayment({ ...input, amount: '0' }));
  assert.throws(() => createPayment({ ...input, email: 'bad' }));
  assert.throws(() => createPayment({ ...input, customer: ' ' }));
  assert.equal(isPayment({ id: 'bad' }), false);
  assert.equal(isPayment(createPayment(input)), true);
});
