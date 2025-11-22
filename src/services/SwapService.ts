import { Transaction } from '@solana/web3.js';
import { swapConfig } from '../config';
import { logger, clearConsole, formatPercentage, setupKeyboardListener } from '../utils';
import { REFRESH_INTERVALS } from '../constants';
import { PoolService } from './PoolService';
import { PriceMonitorService } from './PriceMonitorService';

/**
 * Service for executing swaps and monitoring
 */
export class SwapService {
  /**
   * Executes a simple swap with optional interface
   */
  static async executeSwap(): Promise<void> {
    const { raydiumSwap, poolKeys } = await PoolService.initializePool();
    
    let pressToBuy = false;
    let initialPrice = 0;

    if (swapConfig.showInterface) {
      const price = await raydiumSwap.getPrice(poolKeys);
      initialPrice = parseFloat(price.toSignificant(15));

      setupKeyboardListener(
        undefined,
        () => process.exit(0),
        () => { pressToBuy = true; }
      );
    }

    // Wait for buy signal
    while (swapConfig.showInterface && !pressToBuy) {
      try {
        const price = await raydiumSwap.getPrice(poolKeys);
        const currentPrice = parseFloat(price.toSignificant(15));
        const actualPercent = ((currentPrice - initialPrice) / initialPrice) * 100;

        clearConsole();
        console.log('Press "b" to buy');
        console.log('Press "Q" to exit\n');
        console.log(`Actual percent: ${formatPercentage(actualPercent)}`);
        
        await this.sleep(REFRESH_INTERVALS.PRICE_CHECK_MS);
      } catch (error) {
        await this.sleep(REFRESH_INTERVALS.RETRY_MS);
      }
    }

    // Execute buy
    try {
      const txBuy = await raydiumSwap.getSwapTransaction(
        swapConfig.tokenBAddress,
        swapConfig.tokenAAmount,
        poolKeys,
        swapConfig.maxLamports,
        false,
        swapConfig.direction
      );

      await raydiumSwap.sendLegacyTransaction(txBuy as Transaction, 20);
      
      if (swapConfig.showInterface) {
        logger.success('Swap sent', { time: new Date().toISOString() });
      }
    } catch (error) {
      logger.error('Swap failed', error);
      throw error;
    }

    // Start price monitoring for sell
    const priceMonitor = new PriceMonitorService(raydiumSwap, poolKeys);
    
    if (swapConfig.showInterface) {
      setupKeyboardListener(
        () => priceMonitor.enableManualSell(),
        () => process.exit(0)
      );
    }

    await priceMonitor.watchPriceAndSell();
  }

  /**
   * Monitors price and executes buy on dip, then sells on target
   */
  static async monitorAndTrade(): Promise<void> {
    const { raydiumSwap, poolKeys } = await PoolService.initializePool();

    let pressToBuy = false;
    let bought = false;
    let initialPrice = 0;
    let topNegPercent = 0;
    let topPosPercent = 0;
    const startTime = new Date().toISOString();

    const price = await raydiumSwap.getPrice(poolKeys);
    initialPrice = parseFloat(price.toSignificant(15));
    let lastResetTime = Date.now();

    // Monitor for buy opportunity
    while (!bought && !swapConfig.noBuy) {
      try {
        const price = await raydiumSwap.getPrice(poolKeys);
        const currentPrice = parseFloat(price.toSignificant(15));

        if (initialPrice === 0) {
          initialPrice = currentPrice;
        }

        if (Date.now() - lastResetTime > swapConfig.tresholdResetTime) {
          initialPrice = currentPrice;
          lastResetTime = Date.now();
        }

        const actualPercent = ((currentPrice - initialPrice) / initialPrice) * 100;
        topNegPercent = Math.min(topNegPercent, actualPercent);
        topPosPercent = Math.max(topPosPercent, actualPercent);

        clearConsole();
        console.log('Start time:', startTime);
        console.log(`Actual percent: ${formatPercentage(actualPercent)}`);
        console.log(`Top neg percent: ${formatPercentage(topNegPercent)}`);
        console.log(`Top pos percent: ${formatPercentage(topPosPercent)}`);
        console.log('Diff %Price:', Math.abs(actualPercent));

        if (actualPercent < 0 && Math.abs(actualPercent) > swapConfig.tresholdLossBuy) {
          pressToBuy = true;
        }

        if (pressToBuy) {
          const txBuy = await raydiumSwap.getSwapTransaction(
            swapConfig.tokenBAddress,
            swapConfig.tokenAAmount,
            poolKeys,
            swapConfig.maxLamports,
            false,
            swapConfig.direction
          );

          await raydiumSwap.sendLegacyTransaction(txBuy as Transaction, 20);
          bought = true;
          break;
        }

        await this.sleep(REFRESH_INTERVALS.PRICE_CHECK_MS);
      } catch (error) {
        await this.sleep(REFRESH_INTERVALS.RETRY_MS);
      }
    }

    // Start monitoring for sell
    const priceMonitor = new PriceMonitorService(raydiumSwap, poolKeys);
    await priceMonitor.watchPriceAndSell();
  }

  private static sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
