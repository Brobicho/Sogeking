"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PoolService = void 0;
const RaydiumSwap_1 = __importDefault(require("../core/RaydiumSwap"));
const spl_token_1 = require("@solana/spl-token");
const web3_js_1 = require("@solana/web3.js");
const config_1 = require("../config");
const utils_1 = require("../utils");
const constants_1 = require("../constants");
class PoolService {
    static async initializePool(raydiumSwapInstance = null, pairAddress = config_1.swapConfig.tokenBAddress) {
        const raydiumSwap = raydiumSwapInstance ||
            new RaydiumSwap_1.default(process.env.RPC_URL, process.env.WALLET_PRIVATE_KEY);
        utils_1.logger.info('Raydium swap initialized');
        let poolInfo = null;
        while (poolInfo === null) {
            try {
                poolInfo = await raydiumSwap.getPoolDetailsByToken(pairAddress);
            }
            catch (error) {
                utils_1.logger.warn('Market does not exist yet, retrying in 3s...');
                await this.sleep(3000);
            }
        }
        const poolKeys = await raydiumSwap.getLiquidityPoolKeys(poolInfo);
        if (!poolKeys) {
            throw new Error("Couldn't find pool keys for the given token pair");
        }
        const poolTime = await raydiumSwap.getPoolOpenDate(poolKeys);
        const startDate = parseInt(poolTime.startTime.toString()) * 1000;
        utils_1.logger.info(`Pool start date: ${(0, utils_1.formatTimestamp)(startDate)}`);
        if (startDate === 0 || startDate - Date.now() > 30000) {
            utils_1.logger.info('Pool starts in more than 30s, skipping account creation...');
            config_1.swapConfig.createAccount = false;
        }
        if (config_1.swapConfig.createAccount) {
            await this.createTokenAccount(raydiumSwap);
        }
        if (Date.now() < startDate) {
            const waitTime = (startDate - Date.now()) / 1000;
            utils_1.logger.info(`Waiting for ${waitTime}s before starting swap...`);
            while (true) {
                try {
                    await (0, utils_1.waitForSpecificTime)(startDate);
                    break;
                }
                catch (error) {
                    await this.sleep(10);
                }
            }
        }
        return { raydiumSwap, poolKeys };
    }
    static async createTokenAccount(raydiumSwap, maxRetries = 25, timeBetweenRetries = constants_1.SOLANA_DEFAULTS.TIMEOUT_MS) {
        for (let i = 0; i < maxRetries; i++) {
            try {
                utils_1.logger.info('Fetching/Creating associated token account...');
                const accountKeyPromise = (0, spl_token_1.getOrCreateAssociatedTokenAccount)(raydiumSwap.connection, raydiumSwap.wallet.payer, new web3_js_1.PublicKey(config_1.swapConfig.tokenBAddress), raydiumSwap.wallet.publicKey, true, 'processed', undefined, spl_token_1.TOKEN_PROGRAM_ID);
                const accountKey = await Promise.race([
                    accountKeyPromise,
                    new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), timeBetweenRetries)),
                ]);
                if (accountKey) {
                    const account = await raydiumSwap.getAccount(accountKey.address.toString());
                    if (account) {
                        utils_1.logger.success('Associated token account loaded');
                        return;
                    }
                }
            }
            catch (error) {
                utils_1.logger.warn('Retrying account creation...', error);
                await this.sleep(timeBetweenRetries);
            }
        }
        throw new Error("Couldn't create associated token account");
    }
    static sleep(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
}
exports.PoolService = PoolService;
//# sourceMappingURL=PoolService.js.map