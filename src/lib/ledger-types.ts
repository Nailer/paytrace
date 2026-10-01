import type { ChainProof } from './chain-types';
export type RequestRecord = { id: string; customer: string; description: string; amount: string; recipient: string; payer: string; createdAt: string; afterBlock: number; token: string; status: 'awaiting' | 'received'; proof: ChainProof | null; notes: { text: string; at: string }[] };
export type FundingRecord = { id: string; label: string; proof: ChainProof; createdAt: string };
export type LedgerSnapshot = { recipient: string; requests: RequestRecord[]; funding: FundingRecord[] };
