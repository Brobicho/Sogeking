"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WalletMonitorService = void 0;
const raydium_hakiun_sdk_1 = require("raydium-hakiun-sdk");
const spl_token_1 = require("@solana/spl-token");
const config_1 = require("../config");
const utils_1 = require("../utils");
class WalletMonitorService {
    constructor(raydiumSwap, walletAddress) {
        this.raydiumSwap = raydiumSwap;
        this.walletAddress = walletAddress;
        this.tokenList = [];
    }
    async startMonitoring() {
        this.tokenList = await this.raydiumSwap.getTokensOwnedByAccount(this.walletAddress);
        const listener = await this.raydiumSwap.logWallet(this.walletAddress);
        utils_1.logger.info(`Listening to wallet: ${this.walletAddress}...`);
        listener.on('wallet', async (updatedAccountInfo) => {
            await this.handleWalletUpdate(updatedAccountInfo);
        });
        listener.on('error', (error) => {
            utils_1.logger.error('Wallet listener error', error);
        });
    }
    async handleWalletUpdate(updatedAccountInfo) {
        try {
            const account = spl_token_1.AccountLayout.decode(updatedAccountInfo.accountInfo.data);
            const tokenAddress = account.mint.toString();
            const newAmount = parseInt(account.amount.toString());
            const program = await this.raydiumSwap.fetchProgramAccounts(tokenAddress, raydium_hakiun_sdk_1.WSOL.mint);
            const pairAddress = program[0].pubkey.toString();
            utils_1.logger.debug('Wallet update detected', {
                pair: pairAddress,
                token: tokenAddress,
                amount: newAmount,
            });
            const poolInfo = await this.raydiumSwap.getPoolDetailsByToken(tokenAddress);
            const poolKeys = await this.raydiumSwap.getLiquidityPoolKeys(poolInfo);
            if (!poolKeys) {
                utils_1.logger.warn('Pool keys not found, skipping...');
                return;
            }
            const existingToken = this.tokenList.find((t) => t.tokenAddress === tokenAddress);
            const oldAmount = existingToken?.amount;
            if (!existingToken && newAmount > 0) {
                await this.handleBuy(tokenAddress, pairAddress, poolKeys);
                this.tokenList.push({ tokenAddress, amount: newAmount });
            }
            else if (existingToken && oldAmount && newAmount < oldAmount) {
                await this.handleSell(tokenAddress, poolKeys);
                existingToken.amount = newAmount;
            }
            else if (existingToken) {
                existingToken.amount = newAmount;
            }
        }
        catch (error) {
            utils_1.logger.error('Error handling wallet update', error);
        }
    }
    async handleBuy(tokenAddress, pairAddress, poolKeys) {
        utils_1.logger.info('New token detected', {
            token: tokenAddress,
            time: new Date().toISOString(),
        });
        console.log((0, utils_1.formatSolscanTokenUrl)(pairAddress));
        utils_1.logger.info('Sending buy transaction...');
        const txBuy = await this.raydiumSwap.getSwapTransaction(tokenAddress, config_1.swapConfig.tokenAAmount, poolKeys, config_1.swapConfig.maxLamports, false, config_1.swapConfig.direction);
        const _txId = await this.raydiumSwap.sendLegacyTransaction(txBuy, 20);
        utils_1.logger.success('Buy transaction sent', { time: new Date().toISOString() });
        console.log((0, utils_1.formatSolscanTxUrl)(_txId));
    }
    async handleSell(tokenAddress, poolKeys) {
        try {
            const myAmount = await this.raydiumSwap.getTokenAmount(tokenAddress);
            if (!myAmount || myAmount === 0) {
                utils_1.logger.warn('Amount is 0, skipping sell...');
                return;
            }
            let multiplier = 1;
            if (this.raydiumSwap.quoteDecimals < 9) {
                multiplier = 10 ** (9 - this.raydiumSwap.quoteDecimals);
            }
            utils_1.logger.info('Sell detected', { time: new Date().toISOString() });
            utils_1.logger.info('Sending sell transaction...');
            const txSell = await this.raydiumSwap.getSwapTransaction(config_1.swapConfig.tokenAAddress, (myAmount / 10 ** this.raydiumSwap.lpDecimals) * multiplier, poolKeys, config_1.swapOut.maxLamports, false, config_1.swapOut.direction);
            const _txId = await this.raydiumSwap.sendLegacyTransaction(txSell, 20);
            utils_1.logger.success('Sell transaction sent', { time: new Date().toISOString() });
            console.log((0, utils_1.formatSolscanTxUrl)(_txId));
            console.log((0, utils_1.formatDexscreenerUrl)(tokenAddress, 'Ajyj2VA2F6s32q6Q3Yt7zwrbekJ9Qr8L6UyNFL7psKLf'));
        }
        catch (error) {
            utils_1.logger.error('Error while trying to sell', error);
        }
    }
}
exports.WalletMonitorService = WalletMonitorService;
//# sourceMappingURL=WalletMonitorService.js.map