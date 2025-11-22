"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PriceMonitorService = void 0;
const config_1 = require("../config");
const utils_1 = require("../utils");
const constants_1 = require("../constants");
class PriceMonitorService {
    constructor(raydiumSwap, poolKeys) {
        this.raydiumSwap = raydiumSwap;
        this.poolKeys = poolKeys;
        this.initialPrice = 0;
        this.lossThreshold = 0;
        this.profitThreshold = 0;
        this.shouldSell = false;
        this.sellRetries = 0;
    }
    enableManualSell() {
        this.shouldSell = true;
    }
    async watchPriceAndSell() {
        while (true) {
            try {
                const price = await this.raydiumSwap.getPrice(this.poolKeys);
                const currentPrice = Number(price.toSignificant(15));
                if (this.initialPrice === 0) {
                    this.initialPrice = currentPrice;
                    this.lossThreshold = this.initialPrice * (1 - config_1.swapConfig.stopLoss);
                    this.profitThreshold = this.initialPrice * (1 + config_1.swapConfig.takeProfit);
                }
                if (config_1.swapConfig.showInterface) {
                    this.displayPriceInterface(currentPrice);
                }
                const shouldExecuteSell = config_1.swapConfig.instantSell ||
                    currentPrice < this.lossThreshold ||
                    currentPrice > this.profitThreshold ||
                    this.shouldSell;
                if (shouldExecuteSell) {
                    await this.executeSell(currentPrice);
                    if (this.sellRetries >= 5) {
                        break;
                    }
                }
                await this.sleep(constants_1.REFRESH_INTERVALS.PRICE_CHECK_MS);
            }
            catch (error) {
                utils_1.logger.error('Price monitoring error', error);
                await this.sleep(constants_1.REFRESH_INTERVALS.PRICE_CHECK_MS);
            }
        }
    }
    displayPriceInterface(currentPrice) {
        const actualPercent = ((currentPrice - this.initialPrice) / this.initialPrice) * 100;
        const neededPercent = ((this.profitThreshold * 100) / currentPrice - 100).toFixed(1);
        const lossPercent = (100 - (this.lossThreshold * 100) / currentPrice).toFixed(1);
        (0, utils_1.clearConsole)();
        console.log(constants_1.UI_MESSAGES.PRESS_SPACE_SELL);
        console.log(constants_1.UI_MESSAGES.PRESS_Q_EXIT + '\n');
        console.log('Actual:', (0, utils_1.formatColoredPercentage)(actualPercent));
        console.log(`TP in: ${neededPercent}%`);
        console.log(`SL in: ${lossPercent}%`);
    }
    async executeSell(currentPrice) {
        const triggerType = currentPrice < this.lossThreshold ? '🔴 SL' : '🟢 TP';
        utils_1.logger.info(`${triggerType} Triggered!`);
        let amount = 0;
        while (amount === 0) {
            amount = await this.raydiumSwap.getTokenAmount(config_1.swapConfig.tokenBAddress);
        }
        let multiplier = 1;
        if (this.raydiumSwap.quoteDecimals < 9) {
            multiplier = 10 ** (9 - this.raydiumSwap.quoteDecimals);
        }
        const txSell = await this.raydiumSwap.getSwapTransaction(config_1.swapConfig.tokenAAddress, (amount / 10 ** this.raydiumSwap.lpDecimals) * multiplier, this.poolKeys, config_1.swapOut.maxLamports, false, config_1.swapOut.direction);
        const txid = await this.raydiumSwap.sendLegacyTransaction(txSell, 20);
        utils_1.logger.success('Sell transaction sent');
        console.log((0, utils_1.formatSolscanTxUrl)(txid));
        console.log((0, utils_1.formatDexscreenerUrl)(config_1.swapConfig.tokenBAddress, 'Ajyj2VA2F6s32q6Q3Yt7zwrbekJ9Qr8L6UyNFL7psKLf'));
        this.shouldSell = false;
        this.sellRetries++;
        if (this.sellRetries < 5) {
            await this.sleep(constants_1.REFRESH_INTERVALS.SELL_RETRY_DELAY_MS);
        }
    }
    sleep(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
}
exports.PriceMonitorService = PriceMonitorService;
//# sourceMappingURL=PriceMonitorService.js.map