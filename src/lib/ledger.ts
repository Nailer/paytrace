import { createClient, type Client, type Transaction, type InValue } from '@libsql/client';
import { mkdirSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { dirname, resolve } from 'node:path';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
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
  db: Client;
  workspace = "legacy";
  private ready: Promise<unknown>;
  constructor(path: string, authToken?: string) {
    const remote = /^(libsql|https):\/\//.test(path);
    if (!remote && path !== ':memory:') mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
    this.db = createClient({ url: remote ? path : path === ':memory:' ? 'file::memory:' : pathToFileURL(resolve(path)).href, authToken });
    this.ready = this.db.batch([
      'CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL)',
      'CREATE TABLE IF NOT EXISTS requests (id TEXT PRIMARY KEY, token TEXT UNIQUE NOT NULL, data TEXT NOT NULL)',
      'CREATE TABLE IF NOT EXISTS funding (id TEXT PRIMARY KEY, data TEXT NOT NULL)',
      'CREATE TABLE IF NOT EXISTS reviews (id TEXT PRIMARY KEY, request_id TEXT NOT NULL, hash TEXT NOT NULL, reason TEXT NOT NULL, at TEXT NOT NULL, resolved INTEGER NOT NULL DEFAULT 0, UNIQUE(request_id,hash))',
      'CREATE TABLE IF NOT EXISTS claims (evidence_id TEXT PRIMARY KEY, owner TEXT NOT NULL)',
      'CREATE TABLE IF NOT EXISTS ownership (record_id TEXT PRIMARY KEY, kind TEXT NOT NULL, workspace TEXT NOT NULL)',
      'CREATE INDEX IF NOT EXISTS ownership_workspace ON ownership(workspace,kind)',
      'CREATE TABLE IF NOT EXISTS accounts (id TEXT PRIMARY KEY, username TEXT UNIQUE NOT NULL, name TEXT NOT NULL, password TEXT NOT NULL, recovery TEXT NOT NULL, version INTEGER NOT NULL DEFAULT 1)',
      'CREATE TABLE IF NOT EXISTS auth_challenges (id TEXT PRIMARY KEY, message TEXT NOT NULL, binding TEXT NOT NULL, expires INTEGER NOT NULL)',
      'CREATE TABLE IF NOT EXISTS wallet_accounts (wallet TEXT PRIMARY KEY, account_id TEXT NOT NULL UNIQUE)',
      'CREATE TABLE IF NOT EXISTS login_limits (key TEXT PRIMARY KEY, attempts INTEGER NOT NULL, expires INTEGER NOT NULL)',
    ], 'write');
  }
  forWorkspace(workspace: string) {
    if (workspace !== 'legacy' && !/^[a-f0-9-]{36}$/.test(workspace)) throw new LedgerError('Invalid workspace.', 401);
    const scoped = Object.create(this) as Ledger;
    scoped.workspace = workspace;
    return scoped;
  }
  private scope(kind: 'request' | 'funding', column = 'id') {
    return `(${column} IN (SELECT record_id FROM ownership WHERE kind='${kind}' AND workspace='${this.workspace}') OR ('${this.workspace}'='legacy' AND ${column} NOT IN (SELECT record_id FROM ownership WHERE kind='${kind}')))`;
  }
  private recipientKey() { return this.workspace === 'legacy' ? 'recipient' : `workspace:${this.workspace}:recipient`; }
  async forTracking(token: string) {
    if (!/^[a-f0-9]{48}$/.test(token)) throw new LedgerError('Payment link not found.', 404);
    const row = (await this.query('SELECT ownership.workspace FROM requests LEFT JOIN ownership ON ownership.record_id=requests.id WHERE requests.token=?', [token])).rows[0];
    if (!row) throw new LedgerError('Payment link not found.', 404);
    return this.forWorkspace(row.workspace ? String(row.workspace) : 'legacy');
  }
  async account(username: string) { return (await this.query('SELECT * FROM accounts WHERE username=?', [username])).rows[0]; }
  async accountById(id: string) { return (await this.query('SELECT id,name,username,version FROM accounts WHERE id=?', [id])).rows[0]; }
  async registerAccount(username: string, name: string, password: string, recovery: string) {
    const id = randomUUID();
    try { await this.query('INSERT INTO accounts(id,username,name,password,recovery) VALUES (?,?,?,?,?)', [id, username, name, password, recovery]); }
    catch(e) { if (String(e).includes('UNIQUE')) throw new LedgerError('That username is already taken. Choose another.', 409); throw e; }
    return { id, name, username, version: 1 };
  }
  async recoverAccount(id: string, oldRecovery: string, password: string, recovery: string) {
    const result = await this.query('UPDATE accounts SET password=?,recovery=?,version=version+1 WHERE id=? AND recovery=?', [password,recovery,id,oldRecovery]);
    if (result.rowsAffected !== 1) throw new LedgerError('Recovery details are incorrect or already used.', 401);
    return this.accountById(id);
  }
  async saveChallenge(id: string, message: string, binding: string, expires: number) {
    await this.atomic(async tx => {
      await this.query('DELETE FROM auth_challenges WHERE expires<=?', [Date.now()], tx);
      await this.query('INSERT INTO auth_challenges VALUES (?,?,?,?)', [id,message,binding,expires], tx);
    });
  }
  async challenge(id: string, binding: string) {
    return (await this.query('SELECT message,expires FROM auth_challenges WHERE id=? AND binding=? AND expires>?', [id,binding,Date.now()])).rows[0];
  }
  async finishWalletSignIn(id: string, binding: string, wallet: string) {
    return this.atomic(async tx => {
      const used = await this.query('DELETE FROM auth_challenges WHERE id=? AND binding=? AND expires>?', [id,binding,Date.now()], tx);
      if (used.rowsAffected!==1) throw new LedgerError('This sign-in expired or was already used. Please try again.',401);
      const existing = (await this.query('SELECT accounts.id,accounts.version FROM wallet_accounts JOIN accounts ON accounts.id=wallet_accounts.account_id WHERE wallet=?', [wallet], tx)).rows[0];
      if (existing) return {id:String(existing.id),version:Number(existing.version)};
      const accountId=randomUUID();
      await this.query('INSERT INTO accounts(id,username,name,password,recovery) VALUES (?,?,?,?,?)',[accountId,`wallet:${wallet}`,`Workspace ${wallet.slice(0,6)}…${wallet.slice(-4)}`,'disabled',randomBytes(32).toString('hex')],tx);
      await this.query('INSERT INTO wallet_accounts VALUES (?,?)',[wallet,accountId],tx);
      return {id:accountId,version:1};
    });
  }
  private async query(sql: string, args: InValue[] = [], tx?: Transaction) {
    await this.ready;
    return (tx ?? this.db).execute({ sql, args });
  }
  private async atomic<T>(fn: (tx: Transaction) => Promise<T>): Promise<T> {
    await this.ready;
    const tx = await this.db.transaction('write');
    try { const value = await fn(tx); await tx.commit(); return value; }
    catch (error) { if (!tx.closed) await tx.rollback(); throw error; }
    finally { tx.close(); }
  }
  async snapshot(): Promise<LedgerSnapshot> {
    const setting = (await this.query('SELECT value FROM settings WHERE key=?', [this.recipientKey()])).rows[0];
    return { workspaceName: this.workspace === 'legacy' ? 'Original workspace' : String((await this.accountById(this.workspace))?.name || 'My workspace'), reviews: (await this.query(`SELECT id, request_id AS requestId, hash AS transactionHash, reason, at, resolved FROM reviews WHERE ${this.scope('request','request_id')} AND (resolved=0 OR id IN (SELECT id FROM reviews WHERE ${this.scope('request','request_id')} AND resolved=1 ORDER BY at DESC LIMIT 100)) ORDER BY resolved ASC, at DESC`)).rows.map(r => ({ id: String(r.id), requestId: String(r.requestId), transactionHash: String(r.transactionHash), reason: String(r.reason), at: String(r.at), resolved: Boolean(r.resolved) })), recipient: setting?.value as string || '', requests: (await this.query(`SELECT data FROM requests WHERE ${this.scope('request')} ORDER BY rowid DESC`)).rows.map(r => JSON.parse(r.data as string)), funding: (await this.query(`SELECT data FROM funding WHERE ${this.scope('funding')} ORDER BY rowid DESC`)).rows.map(r => JSON.parse(r.data as string)) };
  }
  async setRecipient(value: unknown) { const recipient = address(value); await this.query('INSERT OR REPLACE INTO settings VALUES (?,?)', [this.recipientKey(), recipient]); return recipient; }
  async create(input: Record<string, unknown>, afterBlock: number): Promise<RequestRecord> {
    if (!Number.isSafeInteger(afterBlock) || afterBlock < 0) throw new LedgerError('Could not establish the request’s starting block.', 502);
    const recipient = input.recipient === undefined ? (await this.snapshot()).recipient : address(input.recipient);
    if (!recipient) throw new LedgerError('Save your receiving wallet first.');
    const payer = address(input.payer);
    if (payer === recipient) throw new LedgerError('The payer must be a different wallet from the receiving wallet.');
    let amount: string;
    try { if (typeof input.amount !== 'string' || units(input.amount) <= 0n) throw new Error(); amount = decimal(units(input.amount)); } catch { throw new LedgerError('Enter a positive amount with up to six decimal places.'); }
    const row: RequestRecord = { id: `PT-${randomUUID()}`, token: randomBytes(24).toString('hex'), customer: text(input.customer, 'Customer name', 80), description: text(input.description, 'Description', 240), amount, recipient, payer, afterBlock, createdAt: new Date().toISOString(), status: 'awaiting', proof: null, notes: [] };
    await this.atomic(async tx => { await this.query('INSERT INTO requests VALUES (?,?,?)', [row.id, row.token, JSON.stringify(row)],tx); await this.query('INSERT INTO ownership VALUES (?,?,?)',[row.id,'request',this.workspace],tx); }); return row;
  }
  async request(id: string): Promise<RequestRecord> {
    const row = (await this.query(`SELECT data FROM requests WHERE id=? AND ${this.scope('request')}`, [id])).rows[0];
    if (!row) throw new LedgerError('Payment request not found.', 404);
    return JSON.parse(row.data as string);
  }
  async tracking(token: string): Promise<TrackingRecord | null> {
    if (!/^[a-f0-9]{48}$/.test(token)) return null;
    const row = (await this.query('SELECT data FROM requests WHERE token=?', [token])).rows[0];
    if (!row) return null;
    const r: RequestRecord = JSON.parse(row.data as string);
    // Customer names, internal notes and funding records are never exposed here.
    return { payer: r.payer, proof: r.proof, id: r.id, description: r.description, amount: r.amount, recipient: r.recipient, status: r.status, createdAt: r.createdAt, transactionHash: r.proof?.transactionHash || null };
  }
  private async claim(proof: ChainProof, owner: string, tx: Transaction) {
    if (proof.outcome !== 'verified' || proof.transfers.length !== 1) throw new LedgerError(proof.summary, 422);
    const transfer = proof.transfers[0];
    if (proof.chainId !== MONAD_TESTNET.chainId || proof.tokenAddress.toLowerCase() !== MONAD_TESTNET.usdc.toLowerCase() || transfer.to !== proof.recipient || units(transfer.amount) !== units(proof.expectedAmount) || proof.receivedAmount !== transfer.amount || proof.blockNumber === null || proof.finalizedThrough === null || proof.blockNumber > proof.finalizedThrough) throw new LedgerError('Inconsistent transfer evidence. Nothing was recorded.', 422);
    if ((await this.query('SELECT owner FROM claims WHERE evidence_id=?', [this.workspace === 'legacy' ? transfer.evidenceId : `${this.workspace}:${transfer.evidenceId}`], tx)).rows[0]) throw new LedgerError('This transfer is already recorded. It cannot be counted twice.', 409);
    await this.query('INSERT INTO claims VALUES (?,?)', [this.workspace === 'legacy' ? transfer.evidenceId : `${this.workspace}:${transfer.evidenceId}`, owner], tx);
  }
  async importFunding(proof: ChainProof, label: unknown): Promise<FundingRecord> {
    return this.atomic(async tx => {
      const setting = (await this.query('SELECT value FROM settings WHERE key=?', [this.recipientKey()], tx)).rows[0];
      if (proof.recipient !== setting?.value) throw new LedgerError('The receiving wallet changed. Verify the transfer again.', 409);
      const row = { id: randomUUID(), label: text(label, 'Receipt label', 120), proof, createdAt: new Date().toISOString() };
      await this.claim(proof, row.id, tx);
      await this.query('INSERT INTO funding VALUES (?,?)', [row.id, JSON.stringify(row)], tx);
      await this.query('INSERT INTO ownership VALUES (?,?,?)', [row.id,'funding',this.workspace], tx);
      return row;
    });
  }
  private async readRequest(id: string, tx: Transaction): Promise<RequestRecord> {
    const record = (await this.query(`SELECT data FROM requests WHERE id=? AND ${this.scope('request')}`, [id], tx)).rows[0];
    if (!record) throw new LedgerError('Payment request not found.', 404);
    return JSON.parse(String(record.data));
  }
  async match(id: string, proof: ChainProof): Promise<RequestRecord> {
    return this.atomic(async tx => {
      const row = await this.readRequest(id, tx);
      if (row.status !== 'awaiting') throw new LedgerError('This request is no longer awaiting payment.', 409);
      if (proof.recipient !== row.recipient || units(proof.expectedAmount) !== units(row.amount)) throw new LedgerError('The evidence does not match this request.', 422);
      if (proof.blockNumber === null || proof.blockNumber <= row.afterBlock) throw new LedgerError('This transfer predates the request. Import it as historical funding instead.', 422);
      if (proof.transfers.length !== 1 || proof.transfers[0].isMint || proof.transfers[0].from !== row.payer) throw new LedgerError('The transfer must come from this request’s expected payer wallet.', 422);
      await this.claim(proof, row.id, tx);
      const updated: RequestRecord = { ...row, status: 'received', proof };
      await this.query('UPDATE requests SET data=? WHERE id=?', [JSON.stringify(updated), id], tx);
      await this.query('UPDATE reviews SET resolved=1 WHERE request_id=?', [id], tx);
      return updated;
    });
  }
  async cancel(id: string) {
    return this.atomic(async tx => {
      const row = await this.readRequest(id, tx);
      if (row.status !== 'awaiting') throw new LedgerError('Only an awaiting request can be cancelled.', 409);
      row.status = 'cancelled';
      await this.query('UPDATE requests SET data=? WHERE id=?', [JSON.stringify(row), id], tx);
      await this.query('UPDATE reviews SET resolved=1 WHERE request_id=?', [id], tx);
      return row;
    });
  }
  async review(id: string, hash: string, reason: string) {
    if (!/^0x[0-9a-f]{64}$/i.test(hash)) return;
    await this.atomic(async tx => {
      const row = await this.readRequest(id, tx);
      if (row.status !== 'awaiting') return;
      const count = (await this.query('SELECT COUNT(*) AS n FROM reviews WHERE request_id=?', [id], tx)).rows[0];
      if (Number(count?.n) >= 20) return;
      await this.query('INSERT OR IGNORE INTO reviews (id,request_id,hash,reason,at) VALUES (?,?,?,?,?)', [randomUUID(), id, hash.toLowerCase(), reason.slice(0,500), new Date().toISOString()], tx);
    });
  }
  async takeLoginAttempt(key: string, now = Date.now()) {
    return this.atomic(async tx => {
      await this.query('DELETE FROM login_limits WHERE expires<=?', [now], tx);
      const row = (await this.query('SELECT attempts FROM login_limits WHERE key=?', [key], tx)).rows[0];
      if (Number(row?.attempts ?? 0) >= 5) throw new LedgerError('Too many sign-in attempts. Try again in 15 minutes.', 429);
      await this.query('INSERT INTO login_limits VALUES (?,1,?) ON CONFLICT(key) DO UPDATE SET attempts=attempts+1', [key, now + 15 * 60000], tx);
    });
  }
  async resolveReview(id: string) { await this.query(`UPDATE reviews SET resolved=1 WHERE id=? AND ${this.scope('request','request_id')}`, [id]); }
  async note(id: string, value: unknown) {
    const note = { text: text(value, 'Note', 1000), at: new Date().toISOString() };
    return this.atomic(async tx => {
      const row = await this.readRequest(id, tx);
      row.notes.push(note);
      await this.query('UPDATE requests SET data=? WHERE id=?', [JSON.stringify(row), id], tx);
      return row;
    });
  }
}
const globals = globalThis as unknown as { paytraceLedger?: Ledger };
export function ledger() {
  if (globals.paytraceLedger) return globals.paytraceLedger;
  const url = process.env.PAYTRACE_PROD_TURSO_DATABASE_URL || process.env.TURSO_DATABASE_URL;
  const authToken = process.env.PAYTRACE_PROD_TURSO_AUTH_TOKEN || process.env.TURSO_AUTH_TOKEN;
  console.info('PayTrace storage', { backend: url ? 'turso' : 'local', database: url ? createHash('sha256').update(url).digest('hex').slice(0,12) : 'local', hosted: Boolean(process.env.VERCEL) });
  if (process.env.VERCEL && (!url || !authToken)) throw new LedgerError('Hosted database is not configured.', 503);
  if (url && !/^(libsql|https):\/\//.test(url)) throw new LedgerError('Hosted database requires a secure remote URL.', 503);
  return globals.paytraceLedger = new Ledger(url || resolve(/* turbopackIgnore: true */ process.env.PAYTRACE_DB_PATH || '.data/paytrace.sqlite'), authToken);
}
