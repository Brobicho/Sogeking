import { PublicKey } from '@solana/web3.js';
export interface PoolInfo {
    baseMint: PublicKey;
    quoteMint: PublicKey;
    lpMint: PublicKey;
    baseDecimal: any;
    quoteDecimal: any;
    marketId: PublicKey;
    marketProgramId: PublicKey;
    openOrders: PublicKey;
    targetOrders: PublicKey;
    baseVault: PublicKey;
    quoteVault: PublicKey;
    withdrawQueue: PublicKey;
    lpVault: PublicKey;
}
export interface MarketInfo {
    pubkey: PublicKey;
    marketBids: PublicKey;
    marketAsks: PublicKey;
    marketEventQueue: PublicKey;
    marketBaseVault: PublicKey;
    marketQuoteVault: PublicKey;
    marketAuthority: PublicKey;
}
export interface PoolTimeInfo {
    startTime: any;
}
export interface UncheckedToken {
    tokenAddress: string;
    opensAt: number;
    scannedAt: number;
}
//# sourceMappingURL=pool.types.d.ts.map