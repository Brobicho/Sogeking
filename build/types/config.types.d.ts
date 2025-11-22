import { SwapDirection } from './swap.types';
export interface SwapConfig {
    executeSwap: boolean;
    useVersionedTransaction: boolean;
    tokenAAmount: number;
    tokenAAddress: string;
    tokenBAddress: string;
    maxLamports: number;
    direction: SwapDirection;
    liquidityFile: string;
    maxRetries: number;
    instantSell: boolean;
    showInterface: boolean;
    takeProfit: number;
    stopLoss: number;
    createAccount: boolean;
    snipeMode: boolean;
    tresholdLossBuy: number;
    tresholdResetTime: number;
    noBuy: boolean;
}
export interface SwapOutConfig {
    executeSwap: boolean;
    useVersionedTransaction: boolean;
    tokenAAddress: string;
    tokenBAddress: string;
    maxLamports: number;
    direction: SwapDirection;
    liquidityFile: string;
    maxRetries: number;
}
export interface ListenerConfig {
    walletPublicKey: any;
    quoteToken: any;
}
export interface CommandLineArgs {
    command?: string;
    tokenAddress?: string;
    walletAddress?: string;
    minDiff?: number;
    maxDiff?: number;
    solAmount?: number;
}
//# sourceMappingURL=config.types.d.ts.map