"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SwapService = void 0;
const config_1 = require("../config");
const utils_1 = require("../utils");
const constants_1 = require("../constants");
const PoolService_1 = require("./PoolService");
const PriceMonitorService_1 = require("./PriceMonitorService");
class SwapService {
    static async executeSwap() {
        const { raydiumSwap, poolKeys } = await PoolService_1.PoolService.initializePool();
        let pressToBuy = false;
        let initialPrice = 0;
        if (config_1.swapConfig.showInterface) {
            const price = await raydiumSwap.getPrice(poolKeys);
            initialPrice = parseFloat(price.toSignificant(15));
            (0, utils_1.setupKeyboardListener)(undefined, () => process.exit(0), () => { pressToBuy = true; });
        }
        while (config_1.swapConfig.showInterface && !pressToBuy) {
            try {
                const price = await raydiumSwap.getPrice(poolKeys);
                const currentPrice = parseFloat(price.toSignificant(15));
                const actualPercent = ((currentPrice - initialPrice) / initialPrice) * 100;
                (0, utils_1.clearConsole)();
                console.log('Press "b" to buy');
                console.log('Press "Q" to exit\n');
                console.log(`Actual percent: ${(0, utils_1.formatPercentage)(actualPercent)}`);
                await this.sleep(constants_1.REFRESH_INTERVALS.PRICE_CHECK_MS);
            }
            catch (error) {
                await this.sleep(constants_1.REFRESH_INTERVALS.RETRY_MS);
            }
        }
        try {
            const txBuy = await raydiumSwap.getSwapTransaction(config_1.swapConfig.tokenBAddress, config_1.swapConfig.tokenAAmount, poolKeys, config_1.swapConfig.maxLamports, false, config_1.swapConfig.direction);
            await raydiumSwap.sendLegacyTransaction(txBuy, 20);
            if (config_1.swapConfig.showInterface) {
                utils_1.logger.success('Swap sent', { time: new Date().toISOString() });
            }
        }
        catch (error) {
            utils_1.logger.error('Swap failed', error);
            throw error;
        }
        const priceMonitor = new PriceMonitorService_1.PriceMonitorService(raydiumSwap, poolKeys);
        if (config_1.swapConfig.showInterface) {
            (0, utils_1.setupKeyboardListener)(() => priceMonitor.enableManualSell(), () => process.exit(0));
        }
        await priceMonitor.watchPriceAndSell();
    }
    static async monitorAndTrade() {
        const { raydiumSwap, poolKeys } = await PoolService_1.PoolService.initializePool();
        let pressToBuy = false;
        let bought = false;
        let initialPrice = 0;
        let topNegPercent = 0;
        let topPosPercent = 0;
        const startTime = new Date().toISOString();
        const price = await raydiumSwap.getPrice(poolKeys);
        initialPrice = parseFloat(price.toSignificant(15));
        let lastResetTime = Date.now();
        while (!bought && !config_1.swapConfig.noBuy) {
            try {
                const price = await raydiumSwap.getPrice(poolKeys);
                const currentPrice = parseFloat(price.toSignificant(15));
                if (initialPrice === 0) {
                    initialPrice = currentPrice;
                }
                if (Date.now() - lastResetTime > config_1.swapConfig.tresholdResetTime) {
                    initialPrice = currentPrice;
                    lastResetTime = Date.now();
                }
                const actualPercent = ((currentPrice - initialPrice) / initialPrice) * 100;
                topNegPercent = Math.min(topNegPercent, actualPercent);
                topPosPercent = Math.max(topPosPercent, actualPercent);
                (0, utils_1.clearConsole)();
                console.log('Start time:', startTime);
                console.log(`Actual percent: ${(0, utils_1.formatPercentage)(actualPercent)}`);
                console.log(`Top neg percent: ${(0, utils_1.formatPercentage)(topNegPercent)}`);
                console.log(`Top pos percent: ${(0, utils_1.formatPercentage)(topPosPercent)}`);
                console.log('Diff %Price:', Math.abs(actualPercent));
                if (actualPercent < 0 && Math.abs(actualPercent) > config_1.swapConfig.tresholdLossBuy) {
                    pressToBuy = true;
                }
                if (pressToBuy) {
                    const txBuy = await raydiumSwap.getSwapTransaction(config_1.swapConfig.tokenBAddress, config_1.swapConfig.tokenAAmount, poolKeys, config_1.swapConfig.maxLamports, false, config_1.swapConfig.direction);
                    await raydiumSwap.sendLegacyTransaction(txBuy, 20);
                    bought = true;
                    break;
                }
                await this.sleep(constants_1.REFRESH_INTERVALS.PRICE_CHECK_MS);
            }
            catch (error) {
                await this.sleep(constants_1.REFRESH_INTERVALS.RETRY_MS);
            }
        }
        const priceMonitor = new PriceMonitorService_1.PriceMonitorService(raydiumSwap, poolKeys);
        await priceMonitor.watchPriceAndSell();
    }
    static sleep(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
}
exports.SwapService = SwapService;
//# sourceMappingURL=SwapService.js.map