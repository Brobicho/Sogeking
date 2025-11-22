import { TokenAmount } from 'raydium-hakiun-sdk';
export type SwapDirection = 'in' | 'out';
export interface SwapResult {
    amountIn: TokenAmount;
    amountOut: TokenAmount;
    minAmountOut: TokenAmount;
    currentPrice: any;
    executionPrice: any;
    priceImpact: any;
    fee: any;
}
export interface SwapTransactionParams {
    toToken: string;
    amount: number;
    maxLamports: number;
    useVersionedTransaction: boolean;
    fixedSide: SwapDirection;
}
export interface PriceMonitorStats {
    initialPrice: number;
    currentPrice: number;
    actualPercent: number;
    topNegPercent: number;
    topPosPercent: number;
    startTime: Date;
}
//# sourceMappingURL=swap.types.d.ts.map