import {
  LIQUIDITY_STATE_LAYOUT_V4,
  MAINNET_PROGRAM_ID,
  Token,
} from 'raydium-hakiun-sdk';
import { Connection, PublicKey } from '@solana/web3.js';
import { EventEmitter } from 'events';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { ListenerConfig } from './types';
import { logger } from './utils';

const TOKEN_ACCOUNT_SIZE = 165;
const OWNER_OFFSET = 32;

/**
 * Event listener for Raydium pools and wallet changes
 */
export class Listeners extends EventEmitter {
  private subscriptions: number[] = [];

  constructor(private readonly connection: Connection) {
    super();
  }

  /**
   * Starts listening to pool and wallet events
   */
  public async start(config: ListenerConfig): Promise<void> {
    try {
      const raydiumSubscription = await this.subscribeToRaydiumPools(config);
      const walletSubscription = await this.subscribeToWalletChanges(config);

      this.subscriptions.push(raydiumSubscription);
      this.subscriptions.push(walletSubscription);

      logger.debug('Listeners started successfully');
    } catch (error) {
      logger.error('Failed to start listeners', error);
      throw error;
    }
  }

  /**
   * Subscribes to Raydium pool account changes
   */
  private async subscribeToRaydiumPools(config: {
    quoteToken: Token;
  }): Promise<number> {
    return this.connection.onProgramAccountChange(
      MAINNET_PROGRAM_ID.AmmV4,
      async (updatedAccountInfo: any) => {
        this.emit('pool', updatedAccountInfo);
      },
      this.connection.commitment,
      [
        { dataSize: LIQUIDITY_STATE_LAYOUT_V4.span },
        {
          memcmp: {
            offset: LIQUIDITY_STATE_LAYOUT_V4.offsetOf('quoteMint'),
            bytes: config.quoteToken.mint.toBase58(),
          },
        },
        {
          memcmp: {
            offset: LIQUIDITY_STATE_LAYOUT_V4.offsetOf('marketProgramId'),
            bytes: MAINNET_PROGRAM_ID.OPENBOOK_MARKET.toBase58(),
          },
        },
      ]
    );
  }

  /**
   * Subscribes to wallet token account changes
   */
  private async subscribeToWalletChanges(config: {
    walletPublicKey: PublicKey;
  }): Promise<number> {
    return this.connection.onProgramAccountChange(
      TOKEN_PROGRAM_ID,
      async (updatedAccountInfo: any) => {
        this.emit('wallet', updatedAccountInfo);
      },
      this.connection.commitment,
      [
        { dataSize: TOKEN_ACCOUNT_SIZE },
        {
          memcmp: {
            offset: OWNER_OFFSET,
            bytes: config.walletPublicKey.toBase58(),
          },
        },
      ]
    );
  }

  /**
   * Stops all listeners and cleans up subscriptions
   */
  public async stop(): Promise<void> {
    for (let i = this.subscriptions.length - 1; i >= 0; i--) {
      const subscription = this.subscriptions[i];
      try {
        await this.connection.removeAccountChangeListener(subscription);
        this.subscriptions.splice(i, 1);
      } catch (error) {
        logger.error(`Failed to remove subscription ${subscription}`, error);
      }
    }
    logger.debug('All listeners stopped');
  }
}
