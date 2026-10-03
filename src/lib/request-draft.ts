import { units } from './payments';
export const DRAFT_KEY = 'paytrace-request-draft-v1';
export type RequestDraft = { customer: string; description: string; amount: string; payer: string; recipient: string };
export const EMPTY_DRAFT: RequestDraft = { customer: '', description: '', amount: '', payer: '', recipient: '' };
export function validateDraft(input: unknown): RequestDraft {
  if (!input || typeof input !== 'object') throw Error('Enter your request details.');
  const value = input as Record<string, unknown>;
  const result = { ...EMPTY_DRAFT };
  for (const key of Object.keys(result) as (keyof RequestDraft)[]) {
    if (typeof value[key] !== 'string') throw Error('Enter your request details.');
    result[key] = value[key].trim();
  }
  if (!result.customer || result.customer.length > 80) throw Error('Enter a customer or reference, up to 80 characters.');
  if (!result.description || result.description.length > 240) throw Error('Enter a description, up to 240 characters.');
  if (units(result.amount) <= 0n) throw Error('The amount must be greater than zero.');
  for (const key of ['payer', 'recipient'] as const) {
    if (!/^0x[\da-f]{40}$/i.test(result[key]) || /^0x0{40}$/i.test(result[key])) throw Error('Enter valid, nonzero payer and receiving wallets.');
  }
  if (result.payer.toLowerCase() === result.recipient.toLowerCase()) throw Error('Use different payer and receiving wallets.');
  return result;
}
