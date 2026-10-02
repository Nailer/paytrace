import { DatabaseSync } from 'node:sqlite';
import { chmodSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { randomBytes, randomUUID } from 'node:crypto';
import { units, decimal } from './payments';
import { MONAD_TESTNET, type ChainProof } from './chain-types';
import type { RequestRecord, FundingRecord, LedgerSnapshot, TrackingRecord } from './ledger-types';
export class LedgerError extends Error { constructor(message: string, public status = 400) { super(message); } }
export function address(value: unknown): string {
  if (typeof value !== 'string' || !/^0x[\da-f]{40}$/i.test(value.trim()) || /^0x0{40}$/i.test(value.trim())) throw new LedgerError('Enter a valid, nonzero wallet address.');
  return value.trim().toLowerCase();
}
function text(value: unknown, label: string, max: number): string {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > max) throw new LedgerError(`${label} must contain 1–${max} characters.`);
  return value.trim();
}
export class Ledger {
  db: DatabaseSync;
  constructor(path: string) {
    if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
    this.db = new DatabaseSync(path);
    if(path !== ':memory:') chmodSync(path,0o600);
    this.db.exec(`PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;
      CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS requests (id TEXT PRIMARY KEY, token TEXT UNIQUE NOT NULL, data TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS funding (id TEXT PRIMARY KEY, data TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS reviews (id TEXT PRIMARY KEY, request_id TEXT NOT NULL, hash TEXT NOT NULL, reason TEXT NOT NULL, at TEXT NOT NULL, resolved INTEGER NOT NULL DEFAULT 0, UNIQUE(request_id,hash));
      CREATE TABLE IF NOT EXISTS claims (evidence_id TEXT PRIMARY KEY, owner TEXT NOT NULL);`);
  }
  snapshot(): LedgerSnapshot {
    const setting = this.db.prepare('SELECT value FROM settings WHERE key=?').get('recipient');
    return { reviews: this.db.prepare('SELECT id, request_id AS requestId, hash AS transactionHash, reason, at, resolved FROM reviews WHERE resolved=0 OR id IN (SELECT id FROM reviews WHERE resolved=1 ORDER BY at DESC LIMIT 100) ORDER BY resolved ASC, at DESC').all().map(r => ({ ...r, resolved: Boolean(r.resolved) })) as LedgerSnapshot['reviews'], recipient: setting?.value as string || '', requests: this.db.prepare('SELECT data FROM requests ORDER BY rowid DESC').all().map(r => JSON.parse(r.data as string)), funding: this.db.prepare('SELECT data FROM funding ORDER BY rowid DESC').all().map(r => JSON.parse(r.data as string)) };
  }
  setRecipient(value: unknown) { const recipient = address(value); this.db.prepare('INSERT OR REPLACE INTO settings VALUES (?,?)').run('recipient', recipient); return recipient; }
  create(input: Record<string, unknown>, afterBlock: number): RequestRecord {
    if (!Number.isSafeInteger(afterBlock) || afterBlock < 0) throw new LedgerError('Could not establish the request’s starting block.', 502);
    const recipient = this.snapshot().recipient;
    if (!recipient) throw new LedgerError('Save your receiving wallet first.');
    const payer = address(input.payer);
    if (payer === recipient) throw new LedgerError('The payer must be a different wallet from the receiving wallet.');
    let amount: string;
    try { if (typeof input.amount !== 'string' || units(input.amount) <= 0n) throw new Error(); amount = decimal(units(input.amount)); } catch { throw new LedgerError('Enter a positive amount with up to six decimal places.'); }
    const row: RequestRecord = { id: `PT-${randomUUID()}`, token: randomBytes(24).toString('hex'), customer: text(input.customer, 'Customer name', 80), description: text(input.description, 'Description', 240), amount, recipient, payer, afterBlock, createdAt: new Date().toISOString(), status: 'awaiting', proof: null, notes: [] };
    this.db.prepare('INSERT INTO requests VALUES (?,?,?)').run(row.id, row.token, JSON.stringify(row)); return row;
  }
  request(id: string): RequestRecord {
    const row = this.db.prepare('SELECT data FROM requests WHERE id=?').get(id);
    if (!row) throw new LedgerError('Payment request not found.', 404);
    return JSON.parse(row.data as string);
  }
  tracking(token: string): TrackingRecord | null {
    if (!/^[a-f0-9]{48}$/.test(token)) return null;
    const row = this.db.prepare('SELECT data FROM requests WHERE token=?').get(token);
    if (!row) return null;
    const r: RequestRecord = JSON.parse(row.data as string);
    // Customer names, internal notes and funding records are never exposed here.
    return { payer: r.payer, proof: r.proof, id: r.id, description: r.description, amount: r.amount, recipient: r.recipient, status: r.status, createdAt: r.createdAt, transactionHash: r.proof?.transactionHash || null };
  }
  private claim(proof: ChainProof, owner: string, write: () => void) {
    if (proof.outcome !== 'verified' || proof.transfers.length !== 1) throw new LedgerError(proof.summary, 422);
    const transfer = proof.transfers[0];
    if (proof.chainId !== MONAD_TESTNET.chainId || proof.tokenAddress.toLowerCase() !== MONAD_TESTNET.usdc.toLowerCase() || transfer.to !== proof.recipient || units(transfer.amount) !== units(proof.expectedAmount) || proof.receivedAmount !== transfer.amount || proof.blockNumber === null || proof.finalizedThrough === null || proof.blockNumber > proof.finalizedThrough) throw new LedgerError('Inconsistent transfer evidence. Nothing was recorded.', 422);
    this.db.exec('BEGIN IMMEDIATE');
    try {
      if (this.db.prepare('SELECT owner FROM claims WHERE evidence_id=?').get(proof.transfers[0].evidenceId)) throw new LedgerError('This transfer is already recorded. It cannot be counted twice.', 409);
      this.db.prepare('INSERT INTO claims VALUES (?,?)').run(proof.transfers[0].evidenceId, owner);
      write(); this.db.exec('COMMIT');
    } catch (e) { this.db.exec('ROLLBACK'); throw e; }
  }
  importFunding(proof: ChainProof, label: unknown): FundingRecord {
    if (proof.recipient !== this.snapshot().recipient) throw new LedgerError('The receiving wallet changed. Verify the transfer again.', 409);
    const row = { id: randomUUID(), label: text(label, 'Receipt label', 120), proof, createdAt: new Date().toISOString() };
    this.claim(proof, row.id, () => this.db.prepare('INSERT INTO funding VALUES (?,?)').run(row.id, JSON.stringify(row))); return row;
  }
  match(id: string, proof: ChainProof): RequestRecord {
    const row = this.request(id);
    if (row.status !== 'awaiting') throw new LedgerError('This request is no longer awaiting payment.', 409);
    if (proof.recipient !== row.recipient || units(proof.expectedAmount) !== units(row.amount)) throw new LedgerError('The evidence does not match this request.', 422);
    if (proof.blockNumber === null || proof.blockNumber <= row.afterBlock) throw new LedgerError('This transfer predates the request. Import it as historical funding instead.', 422);
    if (proof.transfers.length !== 1 || proof.transfers[0].isMint || proof.transfers[0].from !== row.payer) throw new LedgerError('The transfer must come from this request’s expected payer wallet.', 422);
    const updated: RequestRecord = { ...row, status: 'received', proof };
    this.claim(proof, row.id, () => {
      // A second verifier may have completed while its RPC request was in flight.
      if (this.request(id).status !== 'awaiting') throw new LedgerError('This request is no longer awaiting payment.', 409);
      this.db.prepare('UPDATE requests SET data=? WHERE id=?').run(JSON.stringify(updated), id);
      this.db.prepare('UPDATE reviews SET resolved=1 WHERE request_id=?').run(id);
    }); return updated;
  }
  cancel(id: string) {
    const row = this.request(id);
    if (row.status !== 'awaiting') throw new LedgerError('Only an awaiting request can be cancelled.', 409);
    row.status = 'cancelled';
    this.db.prepare('UPDATE requests SET data=? WHERE id=?').run(JSON.stringify(row), id);
    this.db.prepare('UPDATE reviews SET resolved=1 WHERE request_id=?').run(id);
    return row;
  }
  review(id: string, hash: string, reason: string) {
    this.request(id);
    if (!/^0x[0-9a-f]{64}$/i.test(hash)) return;
    const count = this.db.prepare('SELECT COUNT(*) AS n FROM reviews WHERE request_id=?').get(id);
    if(Number(count?.n) >= 20) return;
    this.db.prepare('INSERT OR IGNORE INTO reviews (id,request_id,hash,reason,at) VALUES (?,?,?,?,?)').run(randomUUID(),id,hash.toLowerCase(),reason.slice(0,500),new Date().toISOString());
  }
  resolveReview(id: string) { this.db.prepare('UPDATE reviews SET resolved=1 WHERE id=?').run(id); }
  note(id: string, value: unknown) {
    const row = this.request(id); row.notes.push({ text: text(value, 'Note', 1000), at: new Date().toISOString() });
    this.db.prepare('UPDATE requests SET data=? WHERE id=?').run(JSON.stringify(row), id); return row;
  }
}
const globals = globalThis as unknown as { paytraceLedger?: Ledger };
export function ledger() { return globals.paytraceLedger ??= new Ledger(resolve(/* turbopackIgnore: true */ process.env.PAYTRACE_DB_PATH || '.data/paytrace.sqlite')); }
