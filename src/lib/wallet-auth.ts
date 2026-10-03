import { randomBytes, createHash } from 'node:crypto';
import { SiweMessage } from 'siwe';
import { getAddress } from 'ethers';
import { address, LedgerError, type Ledger } from './ledger';
export const CHALLENGE_COOKIE='paytrace_signin';
export const bindingHash=(value:string)=>createHash('sha256').update(value).digest('hex');
export async function walletChallenge(db:Ledger, wallet:unknown, origin:string) {
  const normalized=address(wallet), nonce=randomBytes(24).toString('hex'), binding=randomBytes(32).toString('hex');
  const message=new SiweMessage({domain:new URL(origin).host,address:getAddress(normalized),statement:'Sign in to your PayTrace workspace. This does not authorize a payment or token access.',uri:origin,version:'1',chainId:10143,nonce,issuedAt:new Date().toISOString(),expirationTime:new Date(Date.now()+5*60_000).toISOString()}).prepareMessage();
  await db.saveChallenge(nonce,message,bindingHash(binding),Date.now()+5*60_000);
  return {id:nonce,message,binding};
}
export async function verifyWalletChallenge(db:Ledger,input:Record<string,unknown>,binding:string,origin:string) {
  if(typeof input.id!=='string'||!/^[a-f0-9]{48}$/.test(input.id)||typeof input.signature!=='string'||!/^0x[a-f0-9]{130}$/i.test(input.signature)||! /^[a-f0-9]{64}$/.test(binding))throw new LedgerError('Invalid sign-in. Please try again.',401);
  const row=await db.challenge(input.id,bindingHash(binding));
  if(!row)throw new LedgerError('This sign-in expired or was already used. Please try again.',401);
  const message=new SiweMessage(String(row.message));
  if(message.uri!==origin || message.chainId!==10143)throw new LedgerError('Invalid sign-in origin or network.',401);
  try { const result=await message.verify({signature:input.signature,domain:new URL(origin).host,nonce:input.id});if(!result.success)throw Error(); }
  catch {throw new LedgerError('The wallet signature could not be verified.',401);}
  return db.finishWalletSignIn(input.id,bindingHash(binding),message.address.toLowerCase());
}
