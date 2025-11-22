import RaydiumSwap from '../core/RaydiumSwap';
import { LiquidityPoolKeysV4 } from 'raydium-hakiun-sdk';
export declare class PriceMonitorService {
    private readonly raydiumSwap;
    private readonly poolKeys;
    private initialPrice;
    private lossThreshold;
    private profitThreshold;
    private shouldSell;
    private sellRetries;
    constructor(raydiumSwap: RaydiumSwap, poolKeys: LiquidityPoolKeysV4);
    enableManualSell(): void;
    watchPriceAndSell(): Promise<void>;
    private displayPriceInterface;
    private executeSell;
    private sleep;
}
//# sourceMappingURL=PriceMonitorService.d.ts.map