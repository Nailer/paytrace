import { MONAD_TESTNET } from './chain-types';
import { units } from './payments';
export type WalletProvider = { request: (args:{method:string;params?:unknown[]})=>Promise<unknown> };
export function transferData(recipient:string,amount:string){if(!/^0x[0-9a-f]{40}$/i.test(recipient)||/^0x0{40}$/i.test(recipient))throw new Error('Invalid receiving wallet.');const raw=units(amount);if(raw<=0n)throw new Error('Invalid payment amount.');return '0xa9059cbb'+recipient.slice(2).toLowerCase().padStart(64,'0')+raw.toString(16).padStart(64,'0');}
export async function sendPayment(provider:WalletProvider,payment:{payer:string;recipient:string;amount:string}){
  const accounts=await provider.request({method:'eth_requestAccounts'});
  if(!Array.isArray(accounts)||typeof accounts[0]!=='string'||accounts[0].toLowerCase()!==payment.payer.toLowerCase())throw new Error(`Select the expected payer account ${payment.payer} in your wallet, then try again.`);
  const chain=await provider.request({method:'eth_chainId'});
  if(chain!=='0x279f'){
    try{await provider.request({method:'wallet_switchEthereumChain',params:[{chainId:'0x279f'}]});}
    catch(e){if((e as {code?:number}).code!==4902)throw e;await provider.request({method:'wallet_addEthereumChain',params:[{chainId:'0x279f',chainName:'Monad Testnet',nativeCurrency:{name:'MON',symbol:'MON',decimals:18},rpcUrls:[MONAD_TESTNET.rpc],blockExplorerUrls:[MONAD_TESTNET.explorer]}]});await provider.request({method:'wallet_switchEthereumChain',params:[{chainId:'0x279f'}]});}
  }
  if(await provider.request({method:'eth_chainId'})!=='0x279f')throw new Error('Switch your wallet to Monad Testnet before paying.');
  const current=await provider.request({method:'eth_accounts'});
  if(!Array.isArray(current)||typeof current[0]!=='string'||current[0].toLowerCase()!==payment.payer.toLowerCase())throw new Error('Your wallet account changed. Select the expected payer and retry.');
  const tx={from:current[0],to:MONAD_TESTNET.usdc,data:transferData(payment.recipient,payment.amount),value:'0x0',chainId:'0x279f'};
  // Wallet estimates execution before asking the user to sign. No allowance or approval is requested.
  await provider.request({method:'eth_estimateGas',params:[tx]});
  const hash=await provider.request({method:'eth_sendTransaction',params:[tx]});
  if(typeof hash!=='string'||!/^0x[0-9a-f]{64}$/i.test(hash))throw new Error('The wallet did not return a transaction hash. Check its activity before trying another payment.');
  return hash;
}
