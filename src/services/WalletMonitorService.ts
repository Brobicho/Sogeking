import RaydiumSwap from '../core/RaydiumSwap';
import { Transaction } from '@solana/web3.js';
import { LiquidityPoolKeysV4, WSOL } from 'raydium-hakiun-sdk';
import { AccountLayout } from '@solana/spl-token';
import { swapConfig, swapOut } from '../config';
import { logger, formatSolscanTokenUrl, formatSolscanTxUrl, formatDexscreenerUrl } from '../utils';
import { OwnedToken } from '../types';

/**
 * Service for wallet monitoring and copy trading
 */
export class WalletMonitorService {
  private tokenList: OwnedToken[] = [];

  constructor(
    private readonly raydiumSwap: RaydiumSwap,
    private readonly walletAddress: string
  ) {}

  /**
   * Starts monitoring a wallet for trades
   */
  async startMonitoring(): Promise<void> {
    this.tokenList = await this.raydiumSwap.getTokensOwnedByAccount(this.walletAddress);
    
    const listener = await this.raydiumSwap.logWallet(this.walletAddress);
    logger.info(`Listening to wallet: ${this.walletAddress}...`);

    listener.on('wallet', async (updatedAccountInfo: any) => {
      await this.handleWalletUpdate(updatedAccountInfo);
    });

    listener.on('error', (error: unknown) => {
      logger.error('Wallet listener error', error);
    });
  }

  /**
   * Handles wallet update events
   */
  private async handleWalletUpdate(updatedAccountInfo: any): Promise<void> {
    try {
      const account = AccountLayout.decode(updatedAccountInfo.accountInfo.data);
      const tokenAddress = account.mint.toString();
      const newAmount = parseInt(account.amount.toString());

      const program = await this.raydiumSwap.fetchProgramAccounts(tokenAddress, WSOL.mint);
      const pairAddress = program[0].pubkey.toString();

      logger.debug('Wallet update detected', {
        pair: pairAddress,
        token: tokenAddress,
        amount: newAmount,
      });

      const poolInfo = await this.raydiumSwap.getPoolDetailsByToken(tokenAddress);
      const poolKeys = await this.raydiumSwap.getLiquidityPoolKeys(poolInfo);

      if (!poolKeys) {
        logger.warn('Pool keys not found, skipping...');
        return;
      }

      const existingToken = this.tokenList.find((t) => t.tokenAddress === tokenAddress);
      const oldAmount = existingToken?.amount;

      if (!existingToken && newAmount > 0) {
        // New buy detected
        await this.handleBuy(tokenAddress, pairAddress, poolKeys);
        this.tokenList.push({ tokenAddress, amount: newAmount });
      } else if (existingToken && oldAmount && newAmount < oldAmount) {
        // Sell detected
        await this.handleSell(tokenAddress, poolKeys);
        existingToken.amount = newAmount;
      } else if (existingToken) {
        existingToken.amount = newAmount;
      }
    } catch (error) {
      logger.error('Error handling wallet update', error);
    }
  }

  /**
   * Handles buy transaction when detected
   */
  private async handleBuy(
    tokenAddress: string,
    pairAddress: string,
    poolKeys: LiquidityPoolKeysV4
  ): Promise<void> {
    logger.info('New token detected', {
      token: tokenAddress,
      time: new Date().toISOString(),
    });
    console.log(formatSolscanTokenUrl(pairAddress));
    logger.info('Sending buy transaction...');

    const txBuy = await this.raydiumSwap.getSwapTransaction(
      tokenAddress,
      swapConfig.tokenAAmount,
      poolKeys,
      swapConfig.maxLamports,
      false,
      swapConfig.direction
    );

    const _txId = await this.raydiumSwap.sendLegacyTransaction(txBuy as Transaction, 20);
    
    logger.success('Buy transaction sent', { time: new Date().toISOString() });
    console.log(formatSolscanTxUrl(_txId));
  }

  /**
   * Handles sell transaction when detected
   */
  private async handleSell(
    tokenAddress: string,
    poolKeys: LiquidityPoolKeysV4
  ): Promise<void> {
    try {
      const myAmount = await this.raydiumSwap.getTokenAmount(tokenAddress);
      
      if (!myAmount || myAmount === 0) {
        logger.warn('Amount is 0, skipping sell...');
        return;
      }

      let multiplier = 1;
      if (this.raydiumSwap.quoteDecimals < 9) {
        multiplier = 10 ** (9 - this.raydiumSwap.quoteDecimals);
      }

      logger.info('Sell detected', { time: new Date().toISOString() });
      logger.info('Sending sell transaction...');

      const txSell = await this.raydiumSwap.getSwapTransaction(
        swapConfig.tokenAAddress,
        (myAmount / 10 ** this.raydiumSwap.lpDecimals) * multiplier,
        poolKeys,
        swapOut.maxLamports,
        false,
        swapOut.direction
      );

      const _txId = await this.raydiumSwap.sendLegacyTransaction(txSell as Transaction, 20);
      
      logger.success('Sell transaction sent', { time: new Date().toISOString() });
      console.log(formatSolscanTxUrl(_txId));
      console.log(formatDexscreenerUrl(
        tokenAddress,
        'Ajyj2VA2F6s32q6Q3Yt7zwrbekJ9Qr8L6UyNFL7psKLf'
      ));
    } catch (error) {
      logger.error('Error while trying to sell', error);
    }
  }
}
