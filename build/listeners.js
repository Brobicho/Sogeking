"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Listeners = void 0;
const raydium_hakiun_sdk_1 = require("raydium-hakiun-sdk");
const events_1 = require("events");
const spl_token_1 = require("@solana/spl-token");
const utils_1 = require("./utils");
const TOKEN_ACCOUNT_SIZE = 165;
const OWNER_OFFSET = 32;
class Listeners extends events_1.EventEmitter {
    constructor(connection) {
        super();
        this.connection = connection;
        this.subscriptions = [];
    }
    async start(config) {
        try {
            const raydiumSubscription = await this.subscribeToRaydiumPools(config);
            const walletSubscription = await this.subscribeToWalletChanges(config);
            this.subscriptions.push(raydiumSubscription);
            this.subscriptions.push(walletSubscription);
            utils_1.logger.debug('Listeners started successfully');
        }
        catch (error) {
            utils_1.logger.error('Failed to start listeners', error);
            throw error;
        }
    }
    async subscribeToRaydiumPools(config) {
        return this.connection.onProgramAccountChange(raydium_hakiun_sdk_1.MAINNET_PROGRAM_ID.AmmV4, async (updatedAccountInfo) => {
            this.emit('pool', updatedAccountInfo);
        }, this.connection.commitment, [
            { dataSize: raydium_hakiun_sdk_1.LIQUIDITY_STATE_LAYOUT_V4.span },
            {
                memcmp: {
                    offset: raydium_hakiun_sdk_1.LIQUIDITY_STATE_LAYOUT_V4.offsetOf('quoteMint'),
                    bytes: config.quoteToken.mint.toBase58(),
                },
            },
            {
                memcmp: {
                    offset: raydium_hakiun_sdk_1.LIQUIDITY_STATE_LAYOUT_V4.offsetOf('marketProgramId'),
                    bytes: raydium_hakiun_sdk_1.MAINNET_PROGRAM_ID.OPENBOOK_MARKET.toBase58(),
                },
            },
        ]);
    }
    async subscribeToWalletChanges(config) {
        return this.connection.onProgramAccountChange(spl_token_1.TOKEN_PROGRAM_ID, async (updatedAccountInfo) => {
            this.emit('wallet', updatedAccountInfo);
        }, this.connection.commitment, [
            { dataSize: TOKEN_ACCOUNT_SIZE },
            {
                memcmp: {
                    offset: OWNER_OFFSET,
                    bytes: config.walletPublicKey.toBase58(),
                },
            },
        ]);
    }
    async stop() {
        for (let i = this.subscriptions.length - 1; i >= 0; i--) {
            const subscription = this.subscriptions[i];
            try {
                await this.connection.removeAccountChangeListener(subscription);
                this.subscriptions.splice(i, 1);
            }
            catch (error) {
                utils_1.logger.error(`Failed to remove subscription ${subscription}`, error);
            }
        }
        utils_1.logger.debug('All listeners stopped');
    }
}
exports.Listeners = Listeners;
//# sourceMappingURL=listeners.js.map