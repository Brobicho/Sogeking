"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RaydiumSwap = void 0;
const web3_js_1 = require("@solana/web3.js");
const raydium_hakiun_sdk_1 = require("raydium-hakiun-sdk");
const anchor_1 = require("@coral-xyz/anchor");
const bs58_1 = __importDefault(require("bs58"));
const listeners_1 = require("../listeners");
const constants_1 = require("../constants");
const utils_1 = require("../utils");
const fs_1 = require("fs");
class RaydiumSwap {
    constructor(rpcUrl, walletPrivateKey) {
        this.lpDecimals = constants_1.RAYDIUM_DEFAULTS.LP_DECIMALS;
        this.quoteDecimals = 9;
        this.connection = new web3_js_1.Connection(rpcUrl, {
            wsEndpoint: process.env.WS_ENDPOINT,
            commitment: constants_1.SOLANA_DEFAULTS.COMMITMENT,
        });
        this.wallet = new anchor_1.Wallet(web3_js_1.Keypair.fromSecretKey(Uint8Array.from(bs58_1.default.decode(walletPrivateKey))));
        utils_1.logger.debug('RaydiumSwap initialized', {
            wallet: this.wallet.publicKey.toString(),
            rpc: rpcUrl,
        });
    }
    async getOwnerTokenAccounts() {
        try {
            const walletTokenAccount = await this.connection.getTokenAccountsByOwner(this.wallet.publicKey, { programId: raydium_hakiun_sdk_1.TOKEN_PROGRAM_ID });
            return walletTokenAccount.value.map((account) => ({
                pubkey: account.pubkey,
                programId: account.account.owner,
                accountInfo: raydium_hakiun_sdk_1.SPL_ACCOUNT_LAYOUT.decode(account.account.data),
            }));
        }
        catch (error) {
            utils_1.logger.error('Failed to get owner token accounts', error);
            throw new Error(`Failed to get token accounts: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    async getTokenAmount(tokenAddress) {
        const userTokenAccounts = await this.getOwnerTokenAccounts();
        const tokenAccount = userTokenAccounts.find((account) => account.accountInfo.mint.toBase58() === tokenAddress);
        if (!tokenAccount) {
            throw new Error(`Token account not found for: ${tokenAddress}`);
        }
        return parseInt(tokenAccount.accountInfo.amount.toString());
    }
    async getTokensOwnedByAccount(accountAddress) {
        try {
            const userTokenAccounts = await this.connection.getTokenAccountsByOwner(new web3_js_1.PublicKey(accountAddress), { programId: raydium_hakiun_sdk_1.TOKEN_PROGRAM_ID });
            const tokenAccounts = [];
            for (const tokenAccount of userTokenAccounts.value) {
                const accountInfo = raydium_hakiun_sdk_1.SPL_ACCOUNT_LAYOUT.decode(tokenAccount.account.data);
                const amount = parseInt(accountInfo.amount.toString());
                if (amount > 0) {
                    tokenAccounts.push({
                        tokenAddress: accountInfo.mint.toString(),
                        amount,
                    });
                }
            }
            return tokenAccounts;
        }
        catch (error) {
            utils_1.logger.error('Failed to get tokens owned by account', error);
            throw new Error(`Failed to get tokens: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    async getTokenAccountByOwnerAndMint(mint) {
        const tokenAccount = (await this.getOwnerTokenAccounts()).find((account) => account.accountInfo.mint.toBase58() === mint);
        if (!tokenAccount) {
            throw new Error(`Token account not found for mint: ${mint}`);
        }
        return tokenAccount;
    }
    async getAccount(tokenAccountAddress) {
        const tokenAccount = await this.connection.getAccountInfo(new web3_js_1.PublicKey(tokenAccountAddress));
        if (!tokenAccount) {
            utils_1.logger.warn('Token account not found', { address: tokenAccountAddress });
            return null;
        }
        return raydium_hakiun_sdk_1.SPL_ACCOUNT_LAYOUT.decode(Buffer.from(tokenAccount.data));
    }
    async getPoolID(baseString) {
        const base = new web3_js_1.PublicKey(baseString);
        const quote = new web3_js_1.PublicKey(constants_1.SOLANA_ADDRESSES.WSOL);
        try {
            const baseAccounts = await this.connection.getProgramAccounts(new web3_js_1.PublicKey(constants_1.RAYDIUM_ADDRESSES.LIQUIDITY_POOL_V4), {
                commitment: constants_1.SOLANA_DEFAULTS.COMMITMENT,
                filters: [
                    { dataSize: raydium_hakiun_sdk_1.LIQUIDITY_STATE_LAYOUT_V4.span },
                    {
                        memcmp: {
                            offset: raydium_hakiun_sdk_1.LIQUIDITY_STATE_LAYOUT_V4.offsetOf('baseMint'),
                            bytes: base.toBase58(),
                        },
                    },
                    {
                        memcmp: {
                            offset: raydium_hakiun_sdk_1.LIQUIDITY_STATE_LAYOUT_V4.offsetOf('quoteMint'),
                            bytes: quote.toBase58(),
                        },
                    },
                ],
            });
            if (baseAccounts.length > 0) {
                return baseAccounts[0].pubkey.toString();
            }
            const quoteAccounts = await this.connection.getProgramAccounts(new web3_js_1.PublicKey(constants_1.RAYDIUM_ADDRESSES.LIQUIDITY_POOL_V4), {
                commitment: constants_1.SOLANA_DEFAULTS.COMMITMENT,
                filters: [
                    { dataSize: raydium_hakiun_sdk_1.LIQUIDITY_STATE_LAYOUT_V4.span },
                    {
                        memcmp: {
                            offset: raydium_hakiun_sdk_1.LIQUIDITY_STATE_LAYOUT_V4.offsetOf('baseMint'),
                            bytes: quote.toBase58(),
                        },
                    },
                    {
                        memcmp: {
                            offset: raydium_hakiun_sdk_1.LIQUIDITY_STATE_LAYOUT_V4.offsetOf('quoteMint'),
                            bytes: base.toBase58(),
                        },
                    },
                ],
            });
            if (quoteAccounts.length > 0) {
                return quoteAccounts[0].pubkey.toString();
            }
            return null;
        }
        catch (error) {
            utils_1.logger.error('Error fetching pool ID', error);
            return null;
        }
    }
    async getPoolDetailsByToken(tokenAddress) {
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
    async getLiquidityStateFromPoolID(poolId) {
        const poolPublicKey = new web3_js_1.PublicKey(poolId);
        const accountInfo = await this.connection.getAccountInfo(poolPublicKey);
        if (!accountInfo) {
            utils_1.logger.error('Failed to find liquidity pool account', { poolId });
            return null;
        }
        const data = Buffer.from(accountInfo.data);
        return raydium_hakiun_sdk_1.LIQUIDITY_STATE_LAYOUT_V4.decode(data);
    }
    async fetchProgramAccounts(baseMint, quoteMint) {
        const programId = new web3_js_1.PublicKey(constants_1.RAYDIUM_ADDRESSES.LIQUIDITY_POOL_V4);
        const baseMintPubkey = new web3_js_1.PublicKey(baseMint);
        const quoteMintPubkey = new web3_js_1.PublicKey(quoteMint);
        let filters = [
            {
                memcmp: {
                    offset: raydium_hakiun_sdk_1.LIQUIDITY_STATE_LAYOUT_V4.offsetOf('baseMint'),
                    bytes: baseMintPubkey.toBase58(),
                },
            },
            {
                memcmp: {
                    offset: raydium_hakiun_sdk_1.LIQUIDITY_STATE_LAYOUT_V4.offsetOf('quoteMint'),
                    bytes: quoteMintPubkey.toBase58(),
                },
            },
        ];
        let accounts = await this.connection.getProgramAccounts(programId, {
            filters,
            commitment: constants_1.SOLANA_DEFAULTS.COMMITMENT,
        });
        if (accounts.length === 0) {
            filters = [
                {
                    memcmp: {
                        offset: raydium_hakiun_sdk_1.LIQUIDITY_STATE_LAYOUT_V4.offsetOf('baseMint'),
                        bytes: quoteMintPubkey.toBase58(),
                    },
                },
                {
                    memcmp: {
                        offset: raydium_hakiun_sdk_1.LIQUIDITY_STATE_LAYOUT_V4.offsetOf('quoteMint'),
                        bytes: baseMintPubkey.toBase58(),
                    },
                },
            ];
            accounts = await this.connection.getProgramAccounts(programId, {
                filters,
                commitment: constants_1.SOLANA_DEFAULTS.COMMITMENT,
            });
        }
        return accounts;
    }
    async getMarket(pubkey, programId) {
        const marketInfo = await this.connection.getAccountInfo(pubkey);
        if (!marketInfo) {
            throw new Error('Market information is not available');
        }
        const decodedMarket = raydium_hakiun_sdk_1.MARKET_STATE_LAYOUT_V3.decode(marketInfo.data);
        const marketAuthority = raydium_hakiun_sdk_1.Market.getAssociatedAuthority({
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
    async getLiquidityPoolKeys(poolInfo) {
        if (!poolInfo.marketId) {
            return null;
        }
        const market = await this.getMarket(poolInfo.marketId, poolInfo.marketProgramId);
        const programAccounts = await this.fetchProgramAccounts(poolInfo.baseMint.toString(), poolInfo.quoteMint.toString());
        const lpAddress = programAccounts[0].pubkey;
        this.lpDecimals = poolInfo.baseDecimal.toNumber();
        this.quoteDecimals = poolInfo.quoteDecimal.toNumber();
        const poolData = {
            id: lpAddress,
            baseMint: poolInfo.baseMint,
            quoteMint: poolInfo.quoteMint,
            lpMint: poolInfo.lpMint,
            baseDecimals: poolInfo.baseDecimal.toNumber(),
            quoteDecimals: poolInfo.quoteDecimal.toNumber(),
            lpDecimals: constants_1.RAYDIUM_DEFAULTS.LP_DECIMALS,
            version: 4,
            programId: raydium_hakiun_sdk_1.MAINNET_PROGRAM_ID.AmmV4,
            authority: raydium_hakiun_sdk_1.Liquidity.getAssociatedAuthority({
                programId: raydium_hakiun_sdk_1.MAINNET_PROGRAM_ID.AmmV4,
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
            lookupTableAccount: web3_js_1.PublicKey.default,
        };
        return poolData;
    }
    async getPoolOpenDate(poolKeys) {
        return await raydium_hakiun_sdk_1.Liquidity.fetchInfo({
            connection: this.connection,
            poolKeys
        });
    }
    async getPrice(poolKeys) {
        const poolInfo = await raydium_hakiun_sdk_1.Liquidity.fetchInfo({
            connection: this.connection,
            poolKeys
        });
        return raydium_hakiun_sdk_1.Liquidity.getRate(poolInfo);
    }
    async calcAmountOut(poolKeys, rawAmountIn, swapInDirection) {
        const poolInfo = await raydium_hakiun_sdk_1.Liquidity.fetchInfo({
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
        const currencyIn = new raydium_hakiun_sdk_1.Token(raydium_hakiun_sdk_1.TOKEN_PROGRAM_ID, currencyInMint, currencyInDecimals);
        const amountIn = new raydium_hakiun_sdk_1.TokenAmount(currencyIn, rawAmountIn, false);
        const currencyOut = new raydium_hakiun_sdk_1.Token(raydium_hakiun_sdk_1.TOKEN_PROGRAM_ID, currencyOutMint, currencyOutDecimals);
        const slippage = new raydium_hakiun_sdk_1.Percent(constants_1.RAYDIUM_DEFAULTS.SLIPPAGE_PERCENT, constants_1.RAYDIUM_DEFAULTS.SLIPPAGE_BASE);
        const result = raydium_hakiun_sdk_1.Liquidity.computeAmountOut({
            poolKeys,
            poolInfo,
            amountIn,
            currencyOut,
            slippage,
        });
        return {
            amountIn,
            amountOut: result.amountOut,
            minAmountOut: new raydium_hakiun_sdk_1.TokenAmount(currencyOut, Number(1), false),
            currentPrice: result.currentPrice,
            executionPrice: result.executionPrice,
            priceImpact: result.priceImpact,
            fee: result.fee,
        };
    }
    async getSwapTransaction(toToken, amount, poolKeys, maxLamports = 100000, useVersionedTransaction = false, fixedSide = 'in') {
        const directionIn = poolKeys.quoteMint.toString() === toToken;
        const { minAmountOut: _minAmountOut, amountIn } = await this.calcAmountOut(poolKeys, amount, directionIn);
        const units = fixedSide === 'in'
            ? constants_1.COMPUTE_UNIT_LIMITS.WITH_ACCOUNT_CREATION
            : constants_1.COMPUTE_UNIT_LIMITS.WITHOUT_ACCOUNT_CREATION;
        const userTokenAccounts = await this.getOwnerTokenAccounts();
        const swapTransaction = await raydium_hakiun_sdk_1.Liquidity.makeSwapInstructionSimple({
            connection: this.connection,
            makeTxVersion: useVersionedTransaction ? 0 : 1,
            poolKeys: { ...poolKeys },
            userKeys: {
                tokenAccounts: userTokenAccounts,
                owner: this.wallet.publicKey,
            },
            amountIn,
            amountOut: new raydium_hakiun_sdk_1.TokenAmount(new raydium_hakiun_sdk_1.Token(raydium_hakiun_sdk_1.TOKEN_PROGRAM_ID, toToken, 6), 0, false),
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
        return new web3_js_1.Transaction({
            blockhash: recentBlockhash.blockhash,
            lastValidBlockHeight: recentBlockhash.lastValidBlockHeight,
            feePayer: this.wallet.publicKey,
        }).add(...instructions);
    }
    async sendLegacyTransaction(tx, maxRetries = constants_1.SOLANA_DEFAULTS.MAX_RETRIES) {
        try {
            const txid = await this.connection.sendTransaction(tx, [this.wallet.payer], {
                skipPreflight: true,
                maxRetries,
            });
            utils_1.logger.debug('Transaction sent', { txid });
            return txid;
        }
        catch (error) {
            utils_1.logger.error('Failed to send transaction', error);
            throw new Error(`Transaction failed: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    async sendVersionedTransaction(tx, maxRetries = constants_1.SOLANA_DEFAULTS.MAX_RETRIES) {
        try {
            const txid = await this.connection.sendTransaction(tx, {
                skipPreflight: true,
                maxRetries,
            });
            utils_1.logger.debug('Versioned transaction sent', { txid });
            return txid;
        }
        catch (error) {
            utils_1.logger.error('Failed to send versioned transaction', error);
            throw new Error(`Transaction failed: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    async logWallet(walletAddress) {
        const listener = new listeners_1.Listeners(this.connection);
        await listener.start({
            walletPublicKey: new web3_js_1.PublicKey(walletAddress),
            quoteToken: raydium_hakiun_sdk_1.Token.WSOL,
        });
        return listener;
    }
    async logPools(_minDiff = 60, _maxDiff = 60 * 60 * 24 * 7) {
        const listener = new listeners_1.Listeners(this.connection);
        await listener.start({
            walletPublicKey: this.wallet.publicKey,
            quoteToken: raydium_hakiun_sdk_1.Token.WSOL,
        });
        listener.on('pool', (updatedAccountInfo) => {
            const poolState = raydium_hakiun_sdk_1.LIQUIDITY_STATE_LAYOUT_V4.decode(updatedAccountInfo.accountInfo.data);
            let poolOpenTime = parseInt(poolState.poolOpenTime.toString());
            if (poolOpenTime.toString().length === 10) {
                poolOpenTime *= 1000;
            }
            const currentTime = Date.now();
            const diff = currentTime - poolOpenTime;
            if (diff < 0) {
                const existingJson = (0, fs_1.existsSync)('unchecked_tokens.json')
                    ? JSON.parse((0, fs_1.readFileSync)('unchecked_tokens.json', 'utf-8'))
                    : [];
                const jsonToAdd = {
                    tokenAddress: poolState.baseMint.toString(),
                    opensAt: poolOpenTime,
                    scannedAt: currentTime,
                };
                const found = existingJson.find((element) => element.tokenAddress === jsonToAdd.tokenAddress);
                if (!found) {
                    existingJson.push(jsonToAdd);
                    (0, fs_1.writeFileSync)('unchecked_tokens.json', JSON.stringify(existingJson, null, 2));
                    utils_1.logger.info('🚀 Token found:', {
                        token: poolState.baseMint.toString(),
                        opensAt: new Date(poolOpenTime).toISOString(),
                    });
                }
            }
        });
        listener.on('error', (error) => {
            utils_1.logger.error('Listener error', error);
        });
    }
}
exports.RaydiumSwap = RaydiumSwap;
exports.default = RaydiumSwap;
//# sourceMappingURL=RaydiumSwap.js.map