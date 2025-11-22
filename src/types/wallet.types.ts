import { PublicKey } from '@solana/web3.js';
import BN from 'bn.js';

export interface TokenAccount {
  pubkey: PublicKey;
  programId: PublicKey;
  accountInfo: TokenAccountInfo;
}

export interface TokenAccountInfo {
  mint: PublicKey;
  owner: PublicKey;
  amount: BN;
  delegateOption: number;
  delegate: PublicKey;
  state: number;
  isNativeOption: number;
  isNative: BN;
  delegatedAmount: BN;
  closeAuthorityOption: number;
  closeAuthority: PublicKey;
}

export interface OwnedToken {
  tokenAddress: string;
  amount: number;
}
