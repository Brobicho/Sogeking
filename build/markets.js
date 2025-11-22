"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MINIMAL_MARKET_STATE_LAYOUT_V3 = void 0;
exports.getMinimalMarketV3 = getMinimalMarketV3;
const raydium_hakiun_sdk_1 = require("raydium-hakiun-sdk");
exports.MINIMAL_MARKET_STATE_LAYOUT_V3 = (0, raydium_hakiun_sdk_1.struct)([(0, raydium_hakiun_sdk_1.publicKey)('eventQueue'), (0, raydium_hakiun_sdk_1.publicKey)('bids'), (0, raydium_hakiun_sdk_1.publicKey)('asks')]);
async function getMinimalMarketV3(connection, marketId, commitment) {
    const marketInfo = await connection.getAccountInfo(marketId, {
        commitment,
        dataSlice: {
            offset: raydium_hakiun_sdk_1.MARKET_STATE_LAYOUT_V3.offsetOf('eventQueue'),
            length: 32 * 3,
        },
    });
    return exports.MINIMAL_MARKET_STATE_LAYOUT_V3.decode(marketInfo.data);
}
//# sourceMappingURL=markets.js.map