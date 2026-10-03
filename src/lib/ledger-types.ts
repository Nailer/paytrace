import type { ChainProof } from './chain-types';
export type RequestRecord = { id: string; customer: string; description: string; amount: string; recipient: string; payer: string; createdAt: string; afterBlock: number; token: string; status: 'awaiting' | 'received' | 'cancelled'; proof: ChainProof | null; notes: { text: string; at: string }[] };
export type FundingRecord = { id: string; label: string; proof: ChainProof; createdAt: string };
export type LedgerSnapshot = { workspaceName?: string; recipient: string; requests: RequestRecord[]; funding: FundingRecord[]; reviews: ReviewRecord[] };

export type TrackingRecord = { id: string; description: string; amount: string; recipient: string; payer: string; status: RequestRecord['status']; createdAt: string; transactionHash: string | null; proof: ChainProof | null };
export type ReviewRecord = { id: string; requestId: string; transactionHash: string; reason: string; at: string; resolved: boolean };
