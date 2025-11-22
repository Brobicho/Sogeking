import RaydiumSwap from '../core/RaydiumSwap';
import { LiquidityPoolKeysV4 } from 'raydium-hakiun-sdk';
export interface PoolInitResult {
    raydiumSwap: RaydiumSwap;
    poolKeys: LiquidityPoolKeysV4;
}
export declare class PoolService {
    static initializePool(raydiumSwapInstance?: RaydiumSwap | null, pairAddress?: string): Promise<PoolInitResult>;
    private static createTokenAccount;
    private static sleep;
}
//# sourceMappingURL=PoolService.d.ts.map