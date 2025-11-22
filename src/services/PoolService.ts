import RaydiumSwap from '../core/RaydiumSwap';
import { LiquidityPoolKeysV4 } from 'raydium-hakiun-sdk';
import { getOrCreateAssociatedTokenAccount, TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { PublicKey } from '@solana/web3.js';
import { swapConfig } from '../config';
import { logger, waitForSpecificTime, formatTimestamp } from '../utils';
import { SOLANA_DEFAULTS } from '../constants';

export interface PoolInitResult {
  raydiumSwap: RaydiumSwap;
  poolKeys: LiquidityPoolKeysV4;
}

/**
 * Service for pool initialization and management
 */
export class PoolService {
  /**
   * Initializes pool and prepares for trading
   */
  static async initializePool(
    raydiumSwapInstance: RaydiumSwap | null = null,
    pairAddress: string = swapConfig.tokenBAddress
  ): Promise<PoolInitResult> {
    const raydiumSwap = raydiumSwapInstance || 
      new RaydiumSwap(process.env.RPC_URL!, process.env.WALLET_PRIVATE_KEY!);

    logger.info('Raydium swap initialized');

    // Wait for pool to exist
    let poolInfo = null;
    while (poolInfo === null) {
      try {
        poolInfo = await raydiumSwap.getPoolDetailsByToken(pairAddress);
      } catch (error) {
        logger.warn('Market does not exist yet, retrying in 3s...');
        await this.sleep(3000);
      }
    }

    const poolKeys = await raydiumSwap.getLiquidityPoolKeys(poolInfo);
    
    if (!poolKeys) {
      throw new Error("Couldn't find pool keys for the given token pair");
    }

    // Get pool timing information
    const poolTime = await raydiumSwap.getPoolOpenDate(poolKeys);
    const startDate = parseInt(poolTime.startTime.toString()) * 1000;
    logger.info(`Pool start date: ${formatTimestamp(startDate)}`);

    // Handle account creation if needed
    if (startDate === 0 || startDate - Date.now() > 30000) {
      logger.info('Pool starts in more than 30s, skipping account creation...');
      swapConfig.createAccount = false;
    }

    if (swapConfig.createAccount) {
      await this.createTokenAccount(raydiumSwap);
    }

    // Wait for pool to open if needed
    if (Date.now() < startDate) {
      const waitTime = (startDate - Date.now()) / 1000;
      logger.info(`Waiting for ${waitTime}s before starting swap...`);
      
      while (true) {
        try {
          await waitForSpecificTime(startDate);
          break;
        } catch (error) {
          await this.sleep(10);
        }
      }
    }

    return { raydiumSwap, poolKeys };
  }

  /**
   * Creates associated token account with retries
   */
  private static async createTokenAccount(
    raydiumSwap: RaydiumSwap,
    maxRetries: number = 25,
    timeBetweenRetries: number = SOLANA_DEFAULTS.TIMEOUT_MS
  ): Promise<void> {
    for (let i = 0; i < maxRetries; i++) {
      try {
        logger.info('Fetching/Creating associated token account...');
        
        const accountKeyPromise = getOrCreateAssociatedTokenAccount(
          raydiumSwap.connection,
          raydiumSwap.wallet.payer,
          new PublicKey(swapConfig.tokenBAddress),
          raydiumSwap.wallet.publicKey,
          true,
          'processed',
          undefined,
          TOKEN_PROGRAM_ID
        );

        const accountKey = await Promise.race([
          accountKeyPromise,
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Timeout')), timeBetweenRetries)
          ),
        ]);

        if (accountKey) {
          const account = await raydiumSwap.getAccount(
            (accountKey as any).address.toString()
          );
          
          if (account) {
            logger.success('Associated token account loaded');
            return;
          }
        }
      } catch (error) {
        logger.warn('Retrying account creation...', error);
        await this.sleep(timeBetweenRetries);
      }
    }

    throw new Error("Couldn't create associated token account");
  }

  private static sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
