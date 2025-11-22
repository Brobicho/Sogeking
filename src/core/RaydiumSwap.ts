import { Connection, PublicKey, Keypair, Transaction, VersionedTransaction } from '@solana/web3.js';
import {
  Liquidity,
  LiquidityPoolKeys,
  Token,
  TokenAmount,
  TOKEN_PROGRAM_ID,
  Percent,
  SPL_ACCOUNT_LAYOUT,
  LIQUIDITY_STATE_LAYOUT_V4,
  MARKET_STATE_LAYOUT_V3,
  Market,
  MAINNET_PROGRAM_ID,
  LiquidityPoolKeysV4,
} from 'raydium-hakiun-sdk';
import { Wallet } from '@coral-xyz/anchor';
import bs58 from 'bs58';
import { Listeners } from '../listeners';
import { 
  RAYDIUM_ADDRESSES, 
  SOLANA_ADDRESSES, 
  SOLANA_DEFAULTS,
  RAYDIUM_DEFAULTS,
  COMPUTE_UNIT_LIMITS 
} from '../constants';
import { 
  TokenAccount, 
  OwnedToken, 
  MarketInfo, 
  SwapResult 
} from '../types';
import { logger } from '../utils';
import { existsSync, readFileSync, writeFileSync } from 'fs';

/**
 * RaydiumSwap class for interacting with Raydium DEX
 */
export class RaydiumSwap {
  public readonly connection: Connection;
  public readonly wallet: Wallet;
  public lpDecimals: number = RAYDIUM_DEFAULTS.LP_DECIMALS;
  public quoteDecimals: number = 9;

  constructor(rpcUrl: string, walletPrivateKey: string) {
    this.connection = new Connection(rpcUrl, {
      wsEndpoint: process.env.WS_ENDPOINT,
      commitment: SOLANA_DEFAULTS.COMMITMENT,
    });
    
    this.wallet = new Wallet(
      Keypair.fromSecretKey(Uint8Array.from(bs58.decode(walletPrivateKey)))
    );
    
    logger.debug('RaydiumSwap initialized', {
      wallet: this.wallet.publicKey.toString(),
      rpc: rpcUrl,
    });
  }

  // ==================== Wallet & Token Operations ====================

  /**
   * Retrieves token accounts owned by the wallet
   */
  async getOwnerTokenAccounts(): Promise<TokenAccount[]> {
    try {
      const walletTokenAccount = await this.connection.getTokenAccountsByOwner(
        this.wallet.publicKey,
        { programId: TOKEN_PROGRAM_ID }
      );

      return walletTokenAccount.value.map((account: any) => ({
        pubkey: account.pubkey,
        programId: account.account.owner,
        accountInfo: SPL_ACCOUNT_LAYOUT.decode(account.account.data),
      }));
    } catch (error) {
      logger.error('Failed to get owner token accounts', error);
      throw new Error(`Failed to get token accounts: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Gets the token amount for a specific token address
   */
  async getTokenAmount(tokenAddress: string): Promise<number> {
    const userTokenAccounts = await this.getOwnerTokenAccounts();
    const tokenAccount = userTokenAccounts.find(
      (account) => account.accountInfo.mint.toBase58() === tokenAddress
    );

    if (!tokenAccount) {
      throw new Error(`Token account not found for: ${tokenAddress}`);
    }

    return parseInt(tokenAccount.accountInfo.amount.toString());
  }

  /**
   * Retrieves tokens owned by a specific account
   */
  async getTokensOwnedByAccount(accountAddress: string): Promise<OwnedToken[]> {
    try {
      const userTokenAccounts = await this.connection.getTokenAccountsByOwner(
        new PublicKey(accountAddress),
        { programId: TOKEN_PROGRAM_ID }
      );

      const tokenAccounts: OwnedToken[] = [];
      
      for (const tokenAccount of userTokenAccounts.value) {
        const accountInfo = SPL_ACCOUNT_LAYOUT.decode(tokenAccount.account.data);
        const amount = parseInt(accountInfo.amount.toString());
        
        if (amount > 0) {
          tokenAccounts.push({
            tokenAddress: accountInfo.mint.toString(),
            amount,
          });
        }
      }

      return tokenAccounts;
    } catch (error) {
      logger.error('Failed to get tokens owned by account', error);
      throw new Error(`Failed to get tokens: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Gets a token account by mint address
   */
  async getTokenAccountByOwnerAndMint(mint: string): Promise<TokenAccount> {
    const tokenAccount = (await this.getOwnerTokenAccounts()).find(
      (account) => account.accountInfo.mint.toBase58() === mint
    );

    if (!tokenAccount) {
      throw new Error(`Token account not found for mint: ${mint}`);
    }

    return tokenAccount;
  }

  /**
   * Gets account info by address
   */
  async getAccount(tokenAccountAddress: string) {
    const tokenAccount = await this.connection.getAccountInfo(
      new PublicKey(tokenAccountAddress)
    );

    if (!tokenAccount) {
      logger.warn('Token account not found', { address: tokenAccountAddress });
      return null;
    }

    return SPL_ACCOUNT_LAYOUT.decode(Buffer.from(tokenAccount.data));
  }

  // ==================== Pool & Market Operations ====================

  /**
   * Gets pool ID from token address
   */
  async getPoolID(baseString: string): Promise<string | null> {
    const base = new PublicKey(baseString);
    const quote = new PublicKey(SOLANA_ADDRESSES.WSOL);

    try {
      // Try with base/quote
      const baseAccounts = await this.connection.getProgramAccounts(
        new PublicKey(RAYDIUM_ADDRESSES.LIQUIDITY_POOL_V4),
        {
          commitment: SOLANA_DEFAULTS.COMMITMENT,
          filters: [
            { dataSize: LIQUIDITY_STATE_LAYOUT_V4.span },
            {
              memcmp: {
                offset: LIQUIDITY_STATE_LAYOUT_V4.offsetOf('baseMint'),
                bytes: base.toBase58(),
              },
            },
            {
              memcmp: {
                offset: LIQUIDITY_STATE_LAYOUT_V4.offsetOf('quoteMint'),
                bytes: quote.toBase58(),
              },
            },
          ],
        }
      );

      if (baseAccounts.length > 0) {
        return baseAccounts[0].pubkey.toString();
      }

      // Try with quote/base
      const quoteAccounts = await this.connection.getProgramAccounts(
        new PublicKey(RAYDIUM_ADDRESSES.LIQUIDITY_POOL_V4),
        {
          commitment: SOLANA_DEFAULTS.COMMITMENT,
          filters: [
            { dataSize: LIQUIDITY_STATE_LAYOUT_V4.span },
            {
              memcmp: {
                offset: LIQUIDITY_STATE_LAYOUT_V4.offsetOf('baseMint'),
                bytes: quote.toBase58(),
              },
            },
            {
              memcmp: {
                offset: LIQUIDITY_STATE_LAYOUT_V4.offsetOf('quoteMint'),
                bytes: base.toBase58(),
              },
            },
          ],
        }
      );

      if (quoteAccounts.length > 0) {
        return quoteAccounts[0].pubkey.toString();
      }

      return null;
    } catch (error) {
      logger.error('Error fetching pool ID', error);
      return null;
    }
  }

  /**
   * Gets pool details by token address
   */
  async getPoolDetailsByToken(tokenAddress: string): Promise<any> {
    const poolId = await this.getPoolID(tokenAddress);
    
    if (!poolId) {
      throw new Error('Failed to find pool ID');
    }

    const poolInfo = await this.getLiquidityStateFromPoolID(poolId);
    
    if (!poolInfo) {
      throw new Error('Failed to find pool info');
    }

    return poolInfo;
  }

  /**
   * Gets liquidity state from pool ID
   */
  async getLiquidityStateFromPoolID(poolId: string) {
    const poolPublicKey = new PublicKey(poolId);
    const accountInfo = await this.connection.getAccountInfo(poolPublicKey);
    
    if (!accountInfo) {
      logger.error('Failed to find liquidity pool account', { poolId });
      return null;
    }

    const data = Buffer.from(accountInfo.data);
    return LIQUIDITY_STATE_LAYOUT_V4.decode(data);
  }

  /**
   * Fetches program accounts for base and quote mints
   */
  async fetchProgramAccounts(baseMint: string, quoteMint: string) {
    const programId = new PublicKey(RAYDIUM_ADDRESSES.LIQUIDITY_POOL_V4);
    const baseMintPubkey = new PublicKey(baseMint);
    const quoteMintPubkey = new PublicKey(quoteMint);

    let filters = [
      {
        memcmp: {
          offset: LIQUIDITY_STATE_LAYOUT_V4.offsetOf('baseMint'),
          bytes: baseMintPubkey.toBase58(),
        },
      },
      {
        memcmp: {
          offset: LIQUIDITY_STATE_LAYOUT_V4.offsetOf('quoteMint'),
          bytes: quoteMintPubkey.toBase58(),
        },
      },
    ];

    let accounts = await this.connection.getProgramAccounts(programId, {
      filters,
      commitment: SOLANA_DEFAULTS.COMMITMENT,
    });

    if (accounts.length === 0) {
      // Try reversed
      filters = [
        {
          memcmp: {
            offset: LIQUIDITY_STATE_LAYOUT_V4.offsetOf('baseMint'),
            bytes: quoteMintPubkey.toBase58(),
          },
        },
        {
          memcmp: {
            offset: LIQUIDITY_STATE_LAYOUT_V4.offsetOf('quoteMint'),
            bytes: baseMintPubkey.toBase58(),
          },
        },
      ];

      accounts = await this.connection.getProgramAccounts(programId, {
        filters,
        commitment: SOLANA_DEFAULTS.COMMITMENT,
      });
    }

    return accounts;
  }

  /**
   * Gets market information
   */
  async getMarket(pubkey: PublicKey, programId: PublicKey): Promise<MarketInfo> {
    const marketInfo = await this.connection.getAccountInfo(pubkey);
    
    if (!marketInfo) {
      throw new Error('Market information is not available');
    }

    const decodedMarket = MARKET_STATE_LAYOUT_V3.decode(marketInfo.data);
    const marketAuthority = Market.getAssociatedAuthority({
      programId,
      marketId: decodedMarket.ownAddress,
    });

    return {
      pubkey,
      marketBids: decodedMarket.bids,
      marketAsks: decodedMarket.asks,
      marketEventQueue: decodedMarket.eventQueue,
      marketBaseVault: decodedMarket.baseVault,
      marketQuoteVault: decodedMarket.quoteVault,
      marketAuthority: marketAuthority.publicKey,
    };
  }

  /**
   * Gets liquidity pool keys
   */
  async getLiquidityPoolKeys(poolInfo: any): Promise<LiquidityPoolKeysV4 | null> {
    if (!poolInfo.marketId) {
      return null;
    }

    const market = await this.getMarket(poolInfo.marketId, poolInfo.marketProgramId);
    const programAccounts = await this.fetchProgramAccounts(
      poolInfo.baseMint.toString(),
      poolInfo.quoteMint.toString()
    );
    
    const lpAddress = programAccounts[0].pubkey;
    this.lpDecimals = poolInfo.baseDecimal.toNumber();
    this.quoteDecimals = poolInfo.quoteDecimal.toNumber();

    const poolData: LiquidityPoolKeysV4 = {
      id: lpAddress,
      baseMint: poolInfo.baseMint,
      quoteMint: poolInfo.quoteMint,
      lpMint: poolInfo.lpMint,
      baseDecimals: poolInfo.baseDecimal.toNumber(),
      quoteDecimals: poolInfo.quoteDecimal.toNumber(),
      lpDecimals: RAYDIUM_DEFAULTS.LP_DECIMALS,
      version: 4,
      programId: MAINNET_PROGRAM_ID.AmmV4,
      authority: Liquidity.getAssociatedAuthority({
        programId: MAINNET_PROGRAM_ID.AmmV4,
      }).publicKey,
      openOrders: poolInfo.openOrders,
      targetOrders: poolInfo.targetOrders,
      baseVault: poolInfo.baseVault,
      quoteVault: poolInfo.quoteVault,
      marketVersion: 3,
      marketProgramId: poolInfo.marketProgramId,
      marketId: poolInfo.marketId,
      marketAuthority: market.marketAuthority,
      marketBaseVault: market.marketBaseVault,
      marketQuoteVault: market.marketQuoteVault,
      marketBids: market.marketBids,
      marketAsks: market.marketAsks,
      marketEventQueue: market.marketEventQueue,
      withdrawQueue: poolInfo.withdrawQueue,
      lpVault: poolInfo.lpVault,
      lookupTableAccount: PublicKey.default,
    };

    return poolData;
  }

  /**
   * Gets pool open date
   */
  async getPoolOpenDate(poolKeys: LiquidityPoolKeys) {
    return await Liquidity.fetchInfo({ 
      connection: this.connection, 
      poolKeys 
    });
  }

  /**
   * Gets current price of a liquidity pool
   */
  async getPrice(poolKeys: LiquidityPoolKeys) {
    const poolInfo = await Liquidity.fetchInfo({ 
      connection: this.connection, 
      poolKeys 
    });
    return Liquidity.getRate(poolInfo);
  }

  // ==================== Swap Operations ====================

  /**
   * Calculates the amount out for a swap
   */
  async calcAmountOut(
    poolKeys: LiquidityPoolKeys,
    rawAmountIn: number,
    swapInDirection: boolean
  ): Promise<SwapResult> {
    const poolInfo = await Liquidity.fetchInfo({ 
      connection: this.connection, 
      poolKeys 
    });

    let currencyInMint = poolKeys.baseMint;
    let currencyInDecimals = poolInfo.baseDecimals;
    let currencyOutMint = poolKeys.quoteMint;
    let currencyOutDecimals = poolInfo.quoteDecimals;

    if (!swapInDirection) {
      currencyInMint = poolKeys.quoteMint;
      currencyInDecimals = poolInfo.quoteDecimals;
      currencyOutMint = poolKeys.baseMint;
      currencyOutDecimals = poolInfo.baseDecimals;
    }

    const currencyIn = new Token(TOKEN_PROGRAM_ID, currencyInMint, currencyInDecimals);
    const amountIn = new TokenAmount(currencyIn, rawAmountIn, false);
    const currencyOut = new Token(TOKEN_PROGRAM_ID, currencyOutMint, currencyOutDecimals);
    const slippage = new Percent(
      RAYDIUM_DEFAULTS.SLIPPAGE_PERCENT, 
      RAYDIUM_DEFAULTS.SLIPPAGE_BASE
    );

    const result = Liquidity.computeAmountOut({
      poolKeys,
      poolInfo,
      amountIn,
      currencyOut,
      slippage,
    });

    return {
      amountIn,
      amountOut: result.amountOut as TokenAmount,
      minAmountOut: new TokenAmount(currencyOut, Number(1), false),
      currentPrice: result.currentPrice,
      executionPrice: result.executionPrice,
      priceImpact: result.priceImpact,
      fee: result.fee,
    };
  }

  /**
   * Builds a swap transaction
   */
  async getSwapTransaction(
    toToken: string,
    amount: number,
    poolKeys: LiquidityPoolKeys,
    maxLamports: number = 100000,
    useVersionedTransaction = false,
    fixedSide: 'in' | 'out' = 'in'
  ): Promise<Transaction | VersionedTransaction> {
    const directionIn = poolKeys.quoteMint.toString() === toToken;
    const { minAmountOut: _minAmountOut, amountIn } = await this.calcAmountOut(
      poolKeys,
      amount,
      directionIn
    );

    const units = fixedSide === 'in' 
      ? COMPUTE_UNIT_LIMITS.WITH_ACCOUNT_CREATION
      : COMPUTE_UNIT_LIMITS.WITHOUT_ACCOUNT_CREATION;

    const userTokenAccounts = await this.getOwnerTokenAccounts();
    
    const swapTransaction = await Liquidity.makeSwapInstructionSimple({
      connection: this.connection,
      makeTxVersion: useVersionedTransaction ? 0 : 1,
      poolKeys: { ...poolKeys },
      userKeys: {
        tokenAccounts: userTokenAccounts,
        owner: this.wallet.publicKey,
      },
      amountIn,
      amountOut: new TokenAmount(new Token(TOKEN_PROGRAM_ID, toToken, 6), 0, false),
      fixedSide,
      config: {
        bypassAssociatedCheck: true,
      },
      computeBudgetConfig: {
        microLamports: maxLamports,
        units,
      },
    });

    const recentBlockhash = await this.connection.getLatestBlockhash();
    const instructions = swapTransaction.innerTransactions[0].instructions.filter(Boolean);

    return new Transaction({
      blockhash: recentBlockhash.blockhash,
      lastValidBlockHeight: recentBlockhash.lastValidBlockHeight,
      feePayer: this.wallet.publicKey,
    }).add(...instructions);
  }

  /**
   * Sends a legacy transaction
   */
  async sendLegacyTransaction(
    tx: Transaction,
    maxRetries: number = SOLANA_DEFAULTS.MAX_RETRIES
  ): Promise<string> {
    try {
      const txid = await this.connection.sendTransaction(
        tx,
        [this.wallet.payer],
        {
          skipPreflight: true,
          maxRetries,
        }
      );

      logger.debug('Transaction sent', { txid });
      return txid;
    } catch (error) {
      logger.error('Failed to send transaction', error);
      throw new Error(`Transaction failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Sends a versioned transaction
   */
  async sendVersionedTransaction(
    tx: VersionedTransaction,
    maxRetries: number = SOLANA_DEFAULTS.MAX_RETRIES
  ): Promise<string> {
    try {
      const txid = await this.connection.sendTransaction(tx, {
        skipPreflight: true,
        maxRetries,
      });

      logger.debug('Versioned transaction sent', { txid });
      return txid;
    } catch (error) {
      logger.error('Failed to send versioned transaction', error);
      throw new Error(`Transaction failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // ==================== Listener Operations ====================

  /**
   * Creates a wallet listener
   */
  async logWallet(walletAddress: string): Promise<Listeners> {
    const listener = new Listeners(this.connection);
    await listener.start({
      walletPublicKey: new PublicKey(walletAddress),
      quoteToken: Token.WSOL,
    });

    return listener;
  }

  /**
   * Logs all pools within a time range
   */
  async logPools(
    _minDiff: number = 60,
    _maxDiff: number = 60 * 60 * 24 * 7
  ): Promise<void> {
    const listener = new Listeners(this.connection);
    await listener.start({
      walletPublicKey: this.wallet.publicKey,
      quoteToken: Token.WSOL,
    });

    listener.on('pool', (updatedAccountInfo) => {
      const poolState = LIQUIDITY_STATE_LAYOUT_V4.decode(updatedAccountInfo.accountInfo.data);
      let poolOpenTime = parseInt(poolState.poolOpenTime.toString());
      
      if (poolOpenTime.toString().length === 10) {
        poolOpenTime *= 1000;
      }

      const currentTime = Date.now();
      const diff = currentTime - poolOpenTime;

      if (diff < 0) {
        const existingJson = existsSync('unchecked_tokens.json')
          ? JSON.parse(readFileSync('unchecked_tokens.json', 'utf-8'))
          : [];

        const jsonToAdd = {
          tokenAddress: poolState.baseMint.toString(),
          opensAt: poolOpenTime,
          scannedAt: currentTime,
        };

        const found = existingJson.find(
          (element: any) => element.tokenAddress === jsonToAdd.tokenAddress
        );

        if (!found) {
          existingJson.push(jsonToAdd);
          writeFileSync('unchecked_tokens.json', JSON.stringify(existingJson, null, 2));
          logger.info('🚀 Token found:', {
            token: poolState.baseMint.toString(),
            opensAt: new Date(poolOpenTime).toISOString(),
          });
        }
      }
    });

    listener.on('error', (error) => {
      logger.error('Listener error', error);
    });
  }
}

export default RaydiumSwap;
