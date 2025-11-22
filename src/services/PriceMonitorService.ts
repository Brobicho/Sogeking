import RaydiumSwap from '../core/RaydiumSwap';
import { Transaction } from '@solana/web3.js';
import { LiquidityPoolKeysV4 } from 'raydium-hakiun-sdk';
import { swapConfig, swapOut } from '../config';
import { logger, clearConsole, formatColoredPercentage, formatSolscanTxUrl, formatDexscreenerUrl } from '../utils';
import { UI_MESSAGES, REFRESH_INTERVALS } from '../constants';

/**
 * Service for handling price monitoring and sell operations
 */
export class PriceMonitorService {
  private initialPrice: number = 0;
  private lossThreshold: number = 0;
  private profitThreshold: number = 0;
  private shouldSell: boolean = false;
  private sellRetries: number = 0;

  constructor(
    private readonly raydiumSwap: RaydiumSwap,
    private readonly poolKeys: LiquidityPoolKeysV4
  ) {}

  /**
   * Enables manual sell trigger
   */
  enableManualSell(): void {
    this.shouldSell = true;
  }

  /**
   * Monitors price and executes sell when conditions are met
   */
  async watchPriceAndSell(): Promise<void> {
    while (true) {
      try {
        const price = await this.raydiumSwap.getPrice(this.poolKeys);
        const currentPrice = Number(price.toSignificant(15));

        if (this.initialPrice === 0) {
          this.initialPrice = currentPrice;
          this.lossThreshold = this.initialPrice * (1 - swapConfig.stopLoss);
          this.profitThreshold = this.initialPrice * (1 + swapConfig.takeProfit);
        }

        if (swapConfig.showInterface) {
          this.displayPriceInterface(currentPrice);
        }

        const shouldExecuteSell =
          swapConfig.instantSell ||
          currentPrice < this.lossThreshold ||
          currentPrice > this.profitThreshold ||
          this.shouldSell;

        if (shouldExecuteSell) {
          await this.executeSell(currentPrice);
          
          if (this.sellRetries >= 5) {
            break;
          }
        }

        await this.sleep(REFRESH_INTERVALS.PRICE_CHECK_MS);
      } catch (error) {
        logger.error('Price monitoring error', error);
        await this.sleep(REFRESH_INTERVALS.PRICE_CHECK_MS);
      }
    }
  }

  /**
   * Displays price monitoring interface
   */
  private displayPriceInterface(currentPrice: number): void {
    const actualPercent = ((currentPrice - this.initialPrice) / this.initialPrice) * 100;
    const neededPercent = ((this.profitThreshold * 100) / currentPrice - 100).toFixed(1);
    const lossPercent = (100 - (this.lossThreshold * 100) / currentPrice).toFixed(1);

    clearConsole();
    console.log(UI_MESSAGES.PRESS_SPACE_SELL);
    console.log(UI_MESSAGES.PRESS_Q_EXIT + '\n');
    console.log('Actual:', formatColoredPercentage(actualPercent));
    console.log(`TP in: ${neededPercent}%`);
    console.log(`SL in: ${lossPercent}%`);
  }

  /**
   * Executes the sell transaction
   */
  private async executeSell(currentPrice: number): Promise<void> {
    const triggerType = currentPrice < this.lossThreshold ? '🔴 SL' : '🟢 TP';
    logger.info(`${triggerType} Triggered!`);

    let amount = 0;
    while (amount === 0) {
      amount = await this.raydiumSwap.getTokenAmount(swapConfig.tokenBAddress);
    }

    let multiplier = 1;
    if (this.raydiumSwap.quoteDecimals < 9) {
      multiplier = 10 ** (9 - this.raydiumSwap.quoteDecimals);
    }

    const txSell = await this.raydiumSwap.getSwapTransaction(
      swapConfig.tokenAAddress,
      (amount / 10 ** this.raydiumSwap.lpDecimals) * multiplier,
      this.poolKeys,
      swapOut.maxLamports,
      false,
      swapOut.direction
    );

    const txid = await this.raydiumSwap.sendLegacyTransaction(txSell as Transaction, 20);
    
    logger.success('Sell transaction sent');
    console.log(formatSolscanTxUrl(txid));
    console.log(formatDexscreenerUrl(
      swapConfig.tokenBAddress,
      'Ajyj2VA2F6s32q6Q3Yt7zwrbekJ9Qr8L6UyNFL7psKLf'
    ));

    this.shouldSell = false;
    this.sellRetries++;

    if (this.sellRetries < 5) {
      await this.sleep(REFRESH_INTERVALS.SELL_RETRY_DELAY_MS);
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
