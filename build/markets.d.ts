import { Commitment, Connection, PublicKey } from '@solana/web3.js';
import { GetStructureSchema } from 'raydium-hakiun-sdk';
export declare const MINIMAL_MARKET_STATE_LAYOUT_V3: import("raydium-hakiun-sdk").Structure<PublicKey, "", {
    eventQueue: PublicKey;
    bids: PublicKey;
    asks: PublicKey;
}>;
export type MinimalMarketStateLayoutV3 = typeof MINIMAL_MARKET_STATE_LAYOUT_V3;
export type MinimalMarketLayoutV3 = GetStructureSchema<MinimalMarketStateLayoutV3>;
export declare function getMinimalMarketV3(connection: Connection, marketId: PublicKey, commitment?: Commitment): Promise<MinimalMarketLayoutV3>;
//# sourceMappingURL=markets.d.ts.map