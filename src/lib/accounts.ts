import { createHash, randomBytes, scryptSync } from 'node:crypto';
import { ledger, LedgerError } from './ledger';
import { passwordMatches } from './access';
export function username(value: unknown) {
  if (typeof value !== 'string' || !/^[a-z0-9][a-z0-9_-]{2,29}$/.test(value.trim().toLowerCase())) throw new LedgerError('Choose a username of 3–30 letters, numbers, underscores or hyphens.');
  return value.trim().toLowerCase();
}
export function passwordHash(value: unknown) {
  if(typeof value !== 'string' || value.length < 12 || value.length > 128) throw new LedgerError('Use a password between 12 and 128 characters.');
  const salt=randomBytes(16).toString('hex');
  return `${salt}:${scryptSync(value,salt,64).toString('hex')}`;
}
const recoveryHash=(value: unknown)=>createHash('sha256').update(typeof value==='string'?value.trim():'').digest('hex');
export async function createAccount(input: Record<string,unknown>) {
  const handle=username(input.username);
  if(typeof input.name !== 'string' || !input.name.trim() || input.name.trim().length>60)throw new LedgerError('Enter a workspace name of 1–60 characters.');
  const hash=passwordHash(input.password), recoveryCode=randomBytes(32).toString('base64url');
  const account=await ledger().registerAccount(handle,input.name.trim(),hash,recoveryHash(recoveryCode));
  return {account,recoveryCode};
}
export async function signIn(input: Record<string,unknown>) {
  const account=await ledger().account(username(input.username));
  // Always perform a password hash check, including when the account is absent.
  const ok=passwordMatches(input.password,account?String(account.password):`unregistered:${'0'.repeat(128)}`);
  if(!account || !ok)throw new LedgerError('Username or password is incorrect.',401);
  return {id:String(account.id),version:Number(account.version)};
}
export async function recover(input: Record<string,unknown>) {
  const account=await ledger().account(username(input.username));
  const hash=recoveryHash(input.recoveryCode);
  if(!account || account.recovery!==hash)throw new LedgerError('Recovery details are incorrect or already used.',401);
  const nextCode=randomBytes(32).toString('base64url');
  const updated=await ledger().recoverAccount(String(account.id),hash,passwordHash(input.password),recoveryHash(nextCode));
  return {account:updated!,recoveryCode:nextCode};
}
