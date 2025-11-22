import { Connection, PublicKey, Keypair, Transaction, VersionedTransaction, Commitment } from '@solana/web3.js'
import {
  Liquidity,
  LiquidityPoolKeys,
  LiquidityPoolJsonInfo,
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
} from 'raydium-hakiun-sdk'
import { Wallet } from '@coral-xyz/anchor'
import bs58 from 'bs58'
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { Listeners } from './listeners';
import { MinimalMarketLayoutV3, getMinimalMarketV3 } from './markets';
import { swapConfig } from './config';

const RAYDIUM_LIQUIDITY_POOL_V4_ADDRESS = "675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8";
const WSOL_ADDRESS = "So11111111111111111111111111111111111111112";

/**
 * Class representing a Raydium Swap operation.
 */

class RaydiumSwap {
  allPoolKeysJson: LiquidityPoolJsonInfo[] = []
  connection: Connection
  wallet: Wallet
  lpDecimals: number = 5
  quoteDecimals: number = 9

  static RAYDIUM_V4_PROGRAM_ID = '675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8'

  /**
   * Create a RaydiumSwap instance.
   * @param {string} RPC_URL - The RPC URL for connecting to the Solana blockchain.
   * @param {string} WALLET_PRIVATE_KEY - The private key of the wallet in base58 format.
   */
  constructor(RPC_URL: string, WALLET_PRIVATE_KEY: string) {
    this.connection = new Connection(RPC_URL, {
      wsEndpoint: process.env.WS_ENDPOINT, commitment: 'processed'
    })
    this.wallet = new Wallet(Keypair.fromSecretKey(Uint8Array.from(bs58.decode(WALLET_PRIVATE_KEY))))
  }

  /**
   * Waits for a program to be deployed.
   * @param {string} programId - The program ID.
   */
  async waitForProgramToBeDeployed(programId: string) {
    const checkProgram = async () => {
      const programInfo = await this.connection.getAccountInfo(new PublicKey(programId));
      if (!programInfo) {
        console.log('Program not yet deployed. Checking again...');
        setTimeout(checkProgram, 5000); // Vérifie toutes les 5 secondes
      } else {
        console.log('Program deployed:', programInfo);
      }
    };
    checkProgram();
  }

  async logWallet(walletAddress: string) {
    const listener = new Listeners(this.connection)
    await listener.start({
      walletPublicKey: new PublicKey(walletAddress),
      quoteToken: Token.WSOL
    });

    return listener;
  }

  /**
 * Logs all pools with a minimum time difference. 
 * @param {number} minDiff - Minimum time difference in seconds between the current time and the pool's open date.
 * @param {number} maxDiff - Maximum time difference in seconds between the current time and the pool's open date.
 */
  async logPools(_minDiff: number = 60, _maxDiff: number = 60 * 60 * 24 * 7) {
    const listener = new Listeners(this.connection)
    await listener.start({
      walletPublicKey: this.wallet.publicKey,
      quoteToken: Token.WSOL
    });

   /* const loadingSymbols = ['\u{259B}', '\u{259C}', '\u{259F}', '\u{2599}']; // Symbols for loading effect
    let symbolIndex = 0; // Index to cycle through loading symbols

    const loadingInterval = setInterval(() => {
      process.stdout.write('\x1B[?25l');
      process.stdout.write('\r' + loadingSymbols[symbolIndex]); // Write loading symbol to console
      symbolIndex = (symbolIndex + 1) % loadingSymbols.length; // Move to next symbol
    }, 100); // Change symbol every 200 milliseconds

    const stopLoading = () => {
      clearInterval(loadingInterval); // Stop the loading interval
      process.stdout.write('\r'); // Clear loading symbol from console
    };*/

    listener.on('pool', (updatedAccountInfo) => {
     // stopLoading(); // Stop loading animation when pool event is received
      const poolState = LIQUIDITY_STATE_LAYOUT_V4.decode(updatedAccountInfo.accountInfo.data);
      let poolOpenTime = parseInt(poolState.poolOpenTime.toString());
      if (poolOpenTime.toString().length === 10) {
        poolOpenTime *= 1000;
      }

      const currentTimeInSeconds = (new Date().getTime());
      const diff = currentTimeInSeconds - poolOpenTime;

      if (/*Math.abs(diff) > minDiff && Math.abs(diff) < maxDiff && */diff < 0) {
        // const secondsLeft = poolOpenTime - currentTimeInSeconds;
        // const days = Math.floor(secondsLeft / 86400);
        // const hours = Math.floor((secondsLeft % 86400) / 3600);
        // const minutes = Math.floor((secondsLeft % 3600) / 60);
        // const seconds = secondsLeft % 60;

        const existingJson = existsSync('unchecked_tokens.json') ? JSON.parse(readFileSync('unchecked_tokens.json', 'utf-8')) : [];

        const jsonToAdd = { tokenAddress: poolState.baseMint.toString(), opensAt: poolOpenTime, scannedAt: new Date().getTime() };
        const found = existingJson.find((element: any) => element.tokenAddress === jsonToAdd.tokenAddress);

        if (!found){
          existingJson.push(jsonToAdd);
          writeFileSync('unchecked_tokens.json', JSON.stringify(existingJson));
          console.log('🚀 Token found:', poolState.baseMint.toString(), 'timestamp:', poolOpenTime, 'opensAt:', new Date(poolOpenTime).toISOString());
        }
      }
    });

    listener.on('error', (error) => {
    //  stopLoading(); // Stop loading animation in case of error
      console.error('Error occurred:', error);
    });
  }

  async getMarketFromID(marketId: string): Promise<MinimalMarketLayoutV3> {
    const market = await getMinimalMarketV3(this.connection, new PublicKey(marketId), this.connection.commitment);
    return market;
  }

  async getAccount(tokenAccountAddress: string) {
    const tokenAccount = await this.connection.getAccountInfo(new PublicKey(tokenAccountAddress));
    if (!tokenAccount) {
      console.error('Token account not found.');
      return null;
    }

    return SPL_ACCOUNT_LAYOUT.decode(Buffer.from(tokenAccount.data));
  }

  async confirmTransaction(txid: string) {
    await this.connection.confirmTransaction(txid, 'root')
  }

  async getProgramAccounts(baseMint: string, quoteMint: string) {
    const layout = LIQUIDITY_STATE_LAYOUT_V4

    return this.connection.getProgramAccounts(new PublicKey(RaydiumSwap.RAYDIUM_V4_PROGRAM_ID), {
      filters: [
        { dataSize: layout.span },
        {
          memcmp: {
            offset: layout.offsetOf('baseMint'),
            bytes: new PublicKey(baseMint).toBase58(),
          },
        },
        {
          memcmp: {
            offset: layout.offsetOf('quoteMint'),
            bytes: new PublicKey(quoteMint).toBase58(),
          },
        },
      ],
    })
  }

  async getLiquidityPoolKeys(poolInfo: any) : Promise<LiquidityPoolKeysV4 | null> {
    if (!poolInfo.marketId) {
      return null;
    }
    let market = await this.getMarket(poolInfo.marketId, poolInfo.marketProgramId);
    const req = await this.fetchProgramAccounts(poolInfo.baseMint.toString(), poolInfo.quoteMint.toString())
    let lpAddress = req[0].pubkey
    this.lpDecimals = poolInfo.baseDecimal.toNumber();
    this.quoteDecimals = poolInfo.quoteDecimal.toNumber();
    let poolData = {
      id: lpAddress, 
      baseMint: poolInfo.baseMint,
      quoteMint: poolInfo.quoteMint,
      lpMint: poolInfo.lpMint,
      baseDecimals: poolInfo.baseDecimal.toNumber(),
      quoteDecimals: poolInfo.quoteDecimal.toNumber(),
      lpDecimals: 5,
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

    return poolData as LiquidityPoolKeysV4;
  }

  /**
 * Récupère les comptes de programme qui correspondent aux mints de base et de cotation fournis.
 * @param baseMint L'adresse mint de la monnaie de base.
 * @param quoteMint L'adresse mint de la monnaie de cotation.
 * @returns Une promesse qui résout un tableau de comptes de programme.
 */
  async fetchProgramAccounts(baseMint: string, quoteMint: string) {
    //console.log('baseMint:', baseMint)
    //console.log('quoteMint:', quoteMint)
    const programId = new PublicKey(RaydiumSwap.RAYDIUM_V4_PROGRAM_ID);
    const baseMintPubkey = new PublicKey(baseMint);
    const quoteMintPubkey = new PublicKey(quoteMint);

    let filters = [
      {
        memcmp: {
          offset: LIQUIDITY_STATE_LAYOUT_V4.offsetOf('baseMint'),
          bytes: baseMintPubkey.toBase58()
        }
      },
      {
        memcmp: {
          offset: LIQUIDITY_STATE_LAYOUT_V4.offsetOf('quoteMint'),
          bytes: quoteMintPubkey.toBase58()
        }
      }
    ];

    let res = await this.connection.getProgramAccounts(programId, {
      filters: filters,
      commitment: 'processed'
    });
    
    if (res.length === 0) {
      filters = [
        {
          memcmp: {
            offset: LIQUIDITY_STATE_LAYOUT_V4.offsetOf('baseMint'),
            bytes: quoteMintPubkey.toBase58()
          }
        },
        {
          memcmp: {
            offset: LIQUIDITY_STATE_LAYOUT_V4.offsetOf('quoteMint'),
            bytes: baseMintPubkey.toBase58()
          }
        }
      ];

      res = await this.connection.getProgramAccounts(programId, {
        filters: filters,
        commitment: 'processed'
      });
    }
    return res;
  }

  async getMarket(
    pubkey: PublicKey,
    programId: PublicKey
  ) {
    const marketInfo = await this.connection.getAccountInfo(pubkey);
    if (!marketInfo) {
      throw new Error("Market information is not available.");
    }

    const decodedMarket = MARKET_STATE_LAYOUT_V3.decode(marketInfo.data);

    const marketAuthority = Market.getAssociatedAuthority({
      programId: programId,
      marketId: decodedMarket.ownAddress
    })

    return {
      pubkey: pubkey,
      marketBids: decodedMarket.bids,
      marketAsks: decodedMarket.asks,
      marketEventQueue: decodedMarket.eventQueue,
      marketBaseVault: decodedMarket.baseVault,
      marketQuoteVault: decodedMarket.quoteVault,
      marketAuthority: marketAuthority.publicKey
    }
  }

  async getTokenAmount(tokenAddress: string) {
    const userTokenAccounts = await this.getOwnerTokenAccounts()
    const tokenAccount = userTokenAccounts.find((i: any) => i.accountInfo.mint.toBase58() === tokenAddress)
    if (!tokenAccount) {
      throw new Error('Token account not found.')
    }
    return parseInt(tokenAccount.accountInfo.amount.toString())
  }

  /**
   * Retrieves the token accounts owned by a specific account.
   */
  async getTokensOwnedByAccount(accountAddress: string) {
    const userTokenAccounts = await this.connection.getTokenAccountsByOwner(new PublicKey(accountAddress), {
      programId: TOKEN_PROGRAM_ID,
    })

    let tokenAccounts = [];
    for (let i = 0; i < userTokenAccounts.value.length; i++) {
      const tokenAccount = userTokenAccounts.value[i];
      const accountInfo = SPL_ACCOUNT_LAYOUT.decode(tokenAccount.account.data);
      const amount = parseInt(accountInfo.amount.toString());
      if (amount > 0) {
        tokenAccounts.push({
          tokenAddress: accountInfo.mint.toString(),
          amount: amount,
        });
      }
    }
    return tokenAccounts;
  }

  /**
 * Retrieves token accounts owned by the wallet.
 * @async
 * @returns {Promise<TokenAccount[]>} An array of token accounts.
 */
  async getOwnerTokenAccounts() {
    const walletTokenAccount = await this.connection.getTokenAccountsByOwner(this.wallet.publicKey, {
      programId: TOKEN_PROGRAM_ID,
    })

    return walletTokenAccount.value.map((i: any) => ({
      pubkey: i.pubkey,
      programId: i.account.owner,
      accountInfo: SPL_ACCOUNT_LAYOUT.decode(i.account.data),
    }))
  }

  /**
 * Builds a swap transaction.
 * @async
 * @param {string} toToken - The mint address of the token to receive.
 * @param {number} amount - The amount of the token to swap.
 * @param {LiquidityPoolKeys} poolKeys - The liquidity pool keys.
 * @param {number} [maxLamports=100000] - The maximum lamports to use for transaction fees.
 * @param {boolean} [useVersionedTransaction=false] - Whether to use a versioned transaction.
 * @param {'in' | 'out'} [fixedSide='in'] - The fixed side of the swap ('in' or 'out').
 * @returns {Promise<Transaction | VersionedTransaction>} The constructed swap transaction.
 */
  async getSwapTransaction(
    toToken: string,
    // fromToken: string,
    amount: number,
    poolKeys: LiquidityPoolKeys,
    maxLamports: number = 100000,
    useVersionedTransaction = false,
    fixedSide: 'in' | 'out' = 'in'
  ): Promise<Transaction | VersionedTransaction> {
    const directionIn = poolKeys.quoteMint.toString() == toToken
    const { amountIn } = await this.calcAmountOut(poolKeys, amount, directionIn)
    let units = 47000
    if (!swapConfig.createAccount) {
      units = 75000
    }
    const userTokenAccounts = await this.getOwnerTokenAccounts()
    const swapTransaction = await Liquidity.makeSwapInstructionSimple({
      connection: this.connection,
      makeTxVersion: useVersionedTransaction ? 0 : 1,
      poolKeys: {
        ...poolKeys,
      },
      userKeys: {
        tokenAccounts: userTokenAccounts,
        owner: this.wallet.publicKey,
      },
      amountIn: amountIn,
      amountOut: new TokenAmount(new Token(TOKEN_PROGRAM_ID, toToken, 6), 0, false),
      fixedSide: fixedSide,
      config: {
        bypassAssociatedCheck: true,
      },
      computeBudgetConfig: {
        microLamports: maxLamports,
        units: units,
      },
    })

    const recentBlockhashForSwap = await this.connection.getLatestBlockhash()
    const instructions = swapTransaction.innerTransactions[0].instructions.filter(Boolean)
    /*
    if (useVersionedTransaction) {
      const versionedTransaction = new VersionedTransaction(
        new TransactionMessage({
          payerKey: this.wallet.publicKey,
          recentBlockhash: recentBlockhashForSwap.blockhash,
          instructions: instructions,
        }).compileToV0Message()
      )

      versionedTransaction.sign([this.wallet.payer])

      return versionedTransaction
    }*/

    return new Transaction({
      blockhash: recentBlockhashForSwap.blockhash,
      lastValidBlockHeight: recentBlockhashForSwap.lastValidBlockHeight,
      feePayer: this.wallet.publicKey,
    }).add(...instructions)
  }

  /**
 * Sends a legacy transaction.
 * @async
 * @param {Transaction} tx - The transaction to send.
 * @returns {Promise<string>} The transaction ID.
 */
  async sendLegacyTransaction(tx: Transaction, maxRetries?: number) {
    const txid = await this.connection.sendTransaction(tx, [this.wallet.payer], {
      skipPreflight: true,
      maxRetries: maxRetries,

    })

    return txid
  }

  /**
 * Sends a versioned transaction.
 * @async
 * @param {VersionedTransaction} tx - The versioned transaction to send.
 * @returns {Promise<string>} The transaction ID.
 */
  async sendVersionedTransaction(tx: VersionedTransaction, maxRetries?: number) {
    const txid = await this.connection.sendTransaction(tx, {
      //preflightCommitment: 'processed',
      skipPreflight: true,
      maxRetries: maxRetries,
    })

    return txid
  }

  async getPoolOpenDate(poolKeys: LiquidityPoolKeys) {
    return await Liquidity.fetchInfo({ connection: this.connection, poolKeys });
  }


  async getPoolDetailsByToken(tokenAddress: string) {
    const poolId = await this.getPoolID(tokenAddress);
    if (!poolId) {
      console.error('Failed to find pool ID.');
      return null;
    }

    const poolInfo = await this.getLiquidiyStateFromPoolID(poolId);
    if (!poolInfo) {
      console.error('Failed to find pool info.');
      return null;
    }

    return poolInfo;
  }
  
  async getPoolID(baseString: string): Promise<string | null> {
    let base = new PublicKey(baseString);
    const quote = new PublicKey(WSOL_ADDRESS);
    const commitment: Commitment = "processed";

    try {
      const connection = this.connection;

      // First try with base
      const baseAccounts = await connection.getProgramAccounts(new PublicKey(RAYDIUM_LIQUIDITY_POOL_V4_ADDRESS), {
        commitment,
        filters: [
          { dataSize: LIQUIDITY_STATE_LAYOUT_V4.span },
          {
            memcmp: {
              offset: LIQUIDITY_STATE_LAYOUT_V4.offsetOf("baseMint"),
              bytes: base.toBase58(),
            },
          },
          {
            memcmp: {
              offset: LIQUIDITY_STATE_LAYOUT_V4.offsetOf("quoteMint"),
              bytes: quote.toBase58(),
            },
          },
        ],
      });

      if (baseAccounts.length > 0) {
        const { pubkey } = baseAccounts[0];
        return pubkey.toString();
      }

      // If base fails, try with quote
      const quoteAccounts = await connection.getProgramAccounts(new PublicKey(RAYDIUM_LIQUIDITY_POOL_V4_ADDRESS), {
        commitment,
        filters: [
          { dataSize: LIQUIDITY_STATE_LAYOUT_V4.span },
          {
            memcmp: {
              offset: LIQUIDITY_STATE_LAYOUT_V4.offsetOf("baseMint"),
              bytes: quote.toBase58(),
            },
          },
          {
            memcmp: {
              offset: LIQUIDITY_STATE_LAYOUT_V4.offsetOf("quoteMint"),
              bytes: base.toBase58(),
            },
          },
        ],
      });

      if (quoteAccounts.length > 0) {
        const { pubkey } = quoteAccounts[0];
        return pubkey.toString();
      }

      return null;
    } catch (error) {
      console.error("Error fetching Market accounts:", error);
      return null;
    }
  }

  async getLiquidiyStateFromPoolID(poolId: string) {
    const poolPublicKey = new PublicKey(poolId);
    const accountInfo = await this.connection.getAccountInfo(poolPublicKey);
    if (!accountInfo) {
      console.error('Failed to find liquidity pool account.');
      return null;
    }

    const data = Buffer.from(accountInfo.data);
    const poolInfo = LIQUIDITY_STATE_LAYOUT_V4.decode(data);

    return poolInfo;
  }

  async getAccountFromPoolID(poolId: string) {
    const poolPublicKey = new PublicKey(poolId);
    const accountInfo = await this.connection.getAccountInfo(poolPublicKey);
    if (!accountInfo) {
      console.error('Failed to find liquidity pool account.');
      return null;
    }

    return SPL_ACCOUNT_LAYOUT.decode(Buffer.from(accountInfo.data));
    //console.log(tokenAccount.value[0].pubkey.toString())
  }
  
  /**
    * Simulates a versioned transaction.
    * @async
    * @param {VersionedTransaction} tx - The versioned transaction to simulate.
    * @returns {Promise<any>} The simulation result.
    */
  async simulateLegacyTransaction(tx: Transaction) {
    const txid = await this.connection.simulateTransaction(tx, [this.wallet.payer])

    return txid
  }

  /**
 * Simulates a versioned transaction.
 * @async
 * @param {VersionedTransaction} tx - The versioned transaction to simulate.
 * @returns {Promise<any>} The simulation result.
 */
  async simulateVersionedTransaction(tx: VersionedTransaction) {
    const txid = await this.connection.simulateTransaction(tx)

    return txid
  }

  /**
 * Gets a token account by owner and mint address.
 * @param {string} mint - The mint address of the token.
 * @returns {TokenAccount} The token account.
 */
  async getTokenAccountByOwnerAndMint(mint: string) {
    const tokenAccount = (await this.getOwnerTokenAccounts()).find((i: any) => i.accountInfo.mint.toBase58() === mint)
    if (!tokenAccount) {
      throw new Error('Token account not found.')
    }

    return tokenAccount
  }


  /**
   * Gets the price of a liquidity pool.
   * @async
   * @param {LiquidityPoolKeys} poolKeys - The liquidity pool keys.
   * @returns {Promise<number>} The price of the liquidity pool.
   */
  async getPrice(poolKeys: LiquidityPoolKeys) {
    const poolInfo = await Liquidity.fetchInfo({ connection: this.connection, poolKeys })
    const price = Liquidity.getRate(poolInfo)
    return price
  }

  /**
   * Calculates the amount out for a swap.
   * @async
   * @param {LiquidityPoolKeys} poolKeys - The liquidity pool keys.
   * @param {number} rawAmountIn - The raw amount of the input token.
   * @param {boolean} swapInDirection - The direction of the swap (true for in, false for out).
   * @returns {Promise<Object>} The swap calculation result.
   */
  async calcAmountOut(poolKeys: LiquidityPoolKeys, rawAmountIn: number, swapInDirection: boolean) {
    const poolInfo = await Liquidity.fetchInfo({ connection: this.connection, poolKeys })

    let currencyInMint = poolKeys.baseMint
    let currencyInDecimals = poolInfo.baseDecimals
    let currencyOutMint = poolKeys.quoteMint
    let currencyOutDecimals = poolInfo.quoteDecimals

    if (!swapInDirection) {
      currencyInMint = poolKeys.quoteMint
      currencyInDecimals = poolInfo.quoteDecimals
      currencyOutMint = poolKeys.baseMint
      currencyOutDecimals = poolInfo.baseDecimals
    }

    const currencyIn = new Token(TOKEN_PROGRAM_ID, currencyInMint, currencyInDecimals)
    const amountIn = new TokenAmount(currencyIn, rawAmountIn, false)
    const currencyOut = new Token(TOKEN_PROGRAM_ID, currencyOutMint, currencyOutDecimals)
    const slippage = new Percent(10000, 100) // 5% slippage

    const { amountOut, currentPrice, executionPrice, priceImpact, fee } = Liquidity.computeAmountOut({
      poolKeys,
      poolInfo,
      amountIn,
      currencyOut,
      slippage,
    })
    
    return {
      amountIn,
      amountOut,
      minAmountOut: new TokenAmount(currencyOut, Number(1), false),
      currentPrice,
      executionPrice,
      priceImpact,
      fee,
    }
  }

}

export default RaydiumSwap
