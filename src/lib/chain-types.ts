export const MONAD_TESTNET = {
  chainId: 10143,
  name: 'Monad Testnet',
  rpc: 'https://testnet-rpc.monad.xyz',
  explorer: 'https://testnet.monadscan.com',
  usdc: '0x534b2f3A21130d7a60830c2Df862319e593943A3',
  decimals: 6,
} as const;
export type VerifyInput = { transactionHash: string; recipient: string; expectedAmount: string };
export type ChainTransfer = { evidenceId: string; logIndex: number; from: string; to: string; amount: string; isMint: boolean };
export type ChainProof = {
  outcome: 'verified' | 'amount_mismatch' | 'no_transfer' | 'not_finalized' | 'reverted' | 'unavailable';
  summary: string; transactionHash: string; chainId: number; tokenAddress: string; recipient: string;
  expectedAmount: string; receivedAmount: string | null; blockNumber: number | null; blockHash: string | null;
  finalizedThrough: number | null; checkedAt: string; transfers: ChainTransfer[];
};
