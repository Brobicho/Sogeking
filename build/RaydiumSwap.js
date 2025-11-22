"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const web3_js_1 = require("@solana/web3.js");
const raydium_hakiun_sdk_1 = require("raydium-hakiun-sdk");
const anchor_1 = require("@coral-xyz/anchor");
const bs58_1 = __importDefault(require("bs58"));
const fs_1 = require("fs");
const listeners_1 = require("./listeners");
const markets_1 = require("./markets");
const config_1 = require("./config");
const RAYDIUM_LIQUIDITY_POOL_V4_ADDRESS = "675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8";
const WSOL_ADDRESS = "So11111111111111111111111111111111111111112";
class RaydiumSwap {
    constructor(RPC_URL, WALLET_PRIVATE_KEY) {
        this.allPoolKeysJson = [];
        this.lpDecimals = 5;
        this.quoteDecimals = 9;
        this.connection = new web3_js_1.Connection(RPC_URL, {
            wsEndpoint: process.env.WS_ENDPOINT, commitment: 'processed'
        });
        this.wallet = new anchor_1.Wallet(web3_js_1.Keypair.fromSecretKey(Uint8Array.from(bs58_1.default.decode(WALLET_PRIVATE_KEY))));
    }
    async waitForProgramToBeDeployed(programId) {
        const checkProgram = async () => {
            const programInfo = await this.connection.getAccountInfo(new web3_js_1.PublicKey(programId));
            if (!programInfo) {
                console.log('Program not yet deployed. Checking again...');
                setTimeout(checkProgram, 5000);
            }
            else {
                console.log('Program deployed:', programInfo);
            }
        };
        checkProgram();
    }
    async logWallet(walletAddress) {
        const listener = new listeners_1.Listeners(this.connection);
        await listener.start({
            walletPublicKey: new web3_js_1.PublicKey(walletAddress),
            quoteToken: raydium_hakiun_sdk_1.Token.WSOL
        });
        return listener;
    }
    async logPools(_minDiff = 60, _maxDiff = 60 * 60 * 24 * 7) {
        const listener = new listeners_1.Listeners(this.connection);
        await listener.start({
            walletPublicKey: this.wallet.publicKey,
            quoteToken: raydium_hakiun_sdk_1.Token.WSOL
        });
        listener.on('pool', (updatedAccountInfo) => {
            const poolState = raydium_hakiun_sdk_1.LIQUIDITY_STATE_LAYOUT_V4.decode(updatedAccountInfo.accountInfo.data);
            let poolOpenTime = parseInt(poolState.poolOpenTime.toString());
            if (poolOpenTime.toString().length === 10) {
                poolOpenTime *= 1000;
            }
            const currentTimeInSeconds = (new Date().getTime());
            const diff = currentTimeInSeconds - poolOpenTime;
            if (diff < 0) {
                const existingJson = (0, fs_1.existsSync)('unchecked_tokens.json') ? JSON.parse((0, fs_1.readFileSync)('unchecked_tokens.json', 'utf-8')) : [];
                const jsonToAdd = { tokenAddress: poolState.baseMint.toString(), opensAt: poolOpenTime, scannedAt: new Date().getTime() };
                const found = existingJson.find((element) => element.tokenAddress === jsonToAdd.tokenAddress);
                if (!found) {
                    existingJson.push(jsonToAdd);
                    (0, fs_1.writeFileSync)('unchecked_tokens.json', JSON.stringify(existingJson));
                    console.log('🚀 Token found:', poolState.baseMint.toString(), 'timestamp:', poolOpenTime, 'opensAt:', new Date(poolOpenTime).toISOString());
                }
            }
        });
        listener.on('error', (error) => {
            console.error('Error occurred:', error);
        });
    }
    async getMarketFromID(marketId) {
        const market = await (0, markets_1.getMinimalMarketV3)(this.connection, new web3_js_1.PublicKey(marketId), this.connection.commitment);
        return market;
    }
    async getAccount(tokenAccountAddress) {
        const tokenAccount = await this.connection.getAccountInfo(new web3_js_1.PublicKey(tokenAccountAddress));
        if (!tokenAccount) {
            console.error('Token account not found.');
            return null;
        }
        return raydium_hakiun_sdk_1.SPL_ACCOUNT_LAYOUT.decode(Buffer.from(tokenAccount.data));
    }
    async confirmTransaction(txid) {
        await this.connection.confirmTransaction(txid, 'root');
    }
    async getProgramAccounts(baseMint, quoteMint) {
        const layout = raydium_hakiun_sdk_1.LIQUIDITY_STATE_LAYOUT_V4;
        return this.connection.getProgramAccounts(new web3_js_1.PublicKey(RaydiumSwap.RAYDIUM_V4_PROGRAM_ID), {
            filters: [
                { dataSize: layout.span },
                {
                    memcmp: {
                        offset: layout.offsetOf('baseMint'),
                        bytes: new web3_js_1.PublicKey(baseMint).toBase58(),
                    },
                },
                {
                    memcmp: {
                        offset: layout.offsetOf('quoteMint'),
                        bytes: new web3_js_1.PublicKey(quoteMint).toBase58(),
                    },
                },
            ],
        });
    }
    async getLiquidityPoolKeys(poolInfo) {
        if (!poolInfo.marketId) {
            return null;
        }
        let market = await this.getMarket(poolInfo.marketId, poolInfo.marketProgramId);
        const req = await this.fetchProgramAccounts(poolInfo.baseMint.toString(), poolInfo.quoteMint.toString());
        let lpAddress = req[0].pubkey;
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
    async fetchProgramAccounts(baseMint, quoteMint) {
        const programId = new web3_js_1.PublicKey(RaydiumSwap.RAYDIUM_V4_PROGRAM_ID);
        const baseMintPubkey = new web3_js_1.PublicKey(baseMint);
        const quoteMintPubkey = new web3_js_1.PublicKey(quoteMint);
        let filters = [
            {
                memcmp: {
                    offset: raydium_hakiun_sdk_1.LIQUIDITY_STATE_LAYOUT_V4.offsetOf('baseMint'),
                    bytes: baseMintPubkey.toBase58()
                }
            },
            {
                memcmp: {
                    offset: raydium_hakiun_sdk_1.LIQUIDITY_STATE_LAYOUT_V4.offsetOf('quoteMint'),
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
                        offset: raydium_hakiun_sdk_1.LIQUIDITY_STATE_LAYOUT_V4.offsetOf('baseMint'),
                        bytes: quoteMintPubkey.toBase58()
                    }
                },
                {
                    memcmp: {
                        offset: raydium_hakiun_sdk_1.LIQUIDITY_STATE_LAYOUT_V4.offsetOf('quoteMint'),
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
    async getMarket(pubkey, programId) {
        const marketInfo = await this.connection.getAccountInfo(pubkey);
        if (!marketInfo) {
            throw new Error("Market information is not available.");
        }
        const decodedMarket = raydium_hakiun_sdk_1.MARKET_STATE_LAYOUT_V3.decode(marketInfo.data);
        const marketAuthority = raydium_hakiun_sdk_1.Market.getAssociatedAuthority({
            programId: programId,
            marketId: decodedMarket.ownAddress
        });
        return {
            pubkey: pubkey,
            marketBids: decodedMarket.bids,
            marketAsks: decodedMarket.asks,
            marketEventQueue: decodedMarket.eventQueue,
            marketBaseVault: decodedMarket.baseVault,
            marketQuoteVault: decodedMarket.quoteVault,
            marketAuthority: marketAuthority.publicKey
        };
    }
    async getTokenAmount(tokenAddress) {
        const userTokenAccounts = await this.getOwnerTokenAccounts();
        const tokenAccount = userTokenAccounts.find((i) => i.accountInfo.mint.toBase58() === tokenAddress);
        if (!tokenAccount) {
            throw new Error('Token account not found.');
        }
        return parseInt(tokenAccount.accountInfo.amount.toString());
    }
    async getTokensOwnedByAccount(accountAddress) {
        const userTokenAccounts = await this.connection.getTokenAccountsByOwner(new web3_js_1.PublicKey(accountAddress), {
            programId: raydium_hakiun_sdk_1.TOKEN_PROGRAM_ID,
        });
        let tokenAccounts = [];
        for (let i = 0; i < userTokenAccounts.value.length; i++) {
            const tokenAccount = userTokenAccounts.value[i];
            const accountInfo = raydium_hakiun_sdk_1.SPL_ACCOUNT_LAYOUT.decode(tokenAccount.account.data);
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
    async getOwnerTokenAccounts() {
        const walletTokenAccount = await this.connection.getTokenAccountsByOwner(this.wallet.publicKey, {
            programId: raydium_hakiun_sdk_1.TOKEN_PROGRAM_ID,
        });
        return walletTokenAccount.value.map((i) => ({
            pubkey: i.pubkey,
            programId: i.account.owner,
            accountInfo: raydium_hakiun_sdk_1.SPL_ACCOUNT_LAYOUT.decode(i.account.data),
        }));
    }
    async getSwapTransaction(toToken, amount, poolKeys, maxLamports = 100000, useVersionedTransaction = false, fixedSide = 'in') {
        const directionIn = poolKeys.quoteMint.toString() == toToken;
        const { amountIn } = await this.calcAmountOut(poolKeys, amount, directionIn);
        let units = 47000;
        if (!config_1.swapConfig.createAccount) {
            units = 75000;
        }
        const userTokenAccounts = await this.getOwnerTokenAccounts();
        const swapTransaction = await raydium_hakiun_sdk_1.Liquidity.makeSwapInstructionSimple({
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
            amountOut: new raydium_hakiun_sdk_1.TokenAmount(new raydium_hakiun_sdk_1.Token(raydium_hakiun_sdk_1.TOKEN_PROGRAM_ID, toToken, 6), 0, false),
            fixedSide: fixedSide,
            config: {
                bypassAssociatedCheck: true,
            },
            computeBudgetConfig: {
                microLamports: maxLamports,
                units: units,
            },
        });
        const recentBlockhashForSwap = await this.connection.getLatestBlockhash();
        const instructions = swapTransaction.innerTransactions[0].instructions.filter(Boolean);
        return new web3_js_1.Transaction({
            blockhash: recentBlockhashForSwap.blockhash,
            lastValidBlockHeight: recentBlockhashForSwap.lastValidBlockHeight,
            feePayer: this.wallet.publicKey,
        }).add(...instructions);
    }
    async sendLegacyTransaction(tx, maxRetries) {
        const txid = await this.connection.sendTransaction(tx, [this.wallet.payer], {
            skipPreflight: true,
            maxRetries: maxRetries,
        });
        return txid;
    }
    async sendVersionedTransaction(tx, maxRetries) {
        const txid = await this.connection.sendTransaction(tx, {
            skipPreflight: true,
            maxRetries: maxRetries,
        });
        return txid;
    }
    async getPoolOpenDate(poolKeys) {
        return await raydium_hakiun_sdk_1.Liquidity.fetchInfo({ connection: this.connection, poolKeys });
    }
    async getPoolDetailsByToken(tokenAddress) {
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
    async getPoolID(baseString) {
        let base = new web3_js_1.PublicKey(baseString);
        const quote = new web3_js_1.PublicKey(WSOL_ADDRESS);
        const commitment = "processed";
        try {
            const connection = this.connection;
            const baseAccounts = await connection.getProgramAccounts(new web3_js_1.PublicKey(RAYDIUM_LIQUIDITY_POOL_V4_ADDRESS), {
                commitment,
                filters: [
                    { dataSize: raydium_hakiun_sdk_1.LIQUIDITY_STATE_LAYOUT_V4.span },
                    {
                        memcmp: {
                            offset: raydium_hakiun_sdk_1.LIQUIDITY_STATE_LAYOUT_V4.offsetOf("baseMint"),
                            bytes: base.toBase58(),
                        },
                    },
                    {
                        memcmp: {
                            offset: raydium_hakiun_sdk_1.LIQUIDITY_STATE_LAYOUT_V4.offsetOf("quoteMint"),
                            bytes: quote.toBase58(),
                        },
                    },
                ],
            });
            if (baseAccounts.length > 0) {
                const { pubkey } = baseAccounts[0];
                return pubkey.toString();
            }
            const quoteAccounts = await connection.getProgramAccounts(new web3_js_1.PublicKey(RAYDIUM_LIQUIDITY_POOL_V4_ADDRESS), {
                commitment,
                filters: [
                    { dataSize: raydium_hakiun_sdk_1.LIQUIDITY_STATE_LAYOUT_V4.span },
                    {
                        memcmp: {
                            offset: raydium_hakiun_sdk_1.LIQUIDITY_STATE_LAYOUT_V4.offsetOf("baseMint"),
                            bytes: quote.toBase58(),
                        },
                    },
                    {
                        memcmp: {
                            offset: raydium_hakiun_sdk_1.LIQUIDITY_STATE_LAYOUT_V4.offsetOf("quoteMint"),
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
        }
        catch (error) {
            console.error("Error fetching Market accounts:", error);
            return null;
        }
    }
    async getLiquidiyStateFromPoolID(poolId) {
        const poolPublicKey = new web3_js_1.PublicKey(poolId);
        const accountInfo = await this.connection.getAccountInfo(poolPublicKey);
        if (!accountInfo) {
            console.error('Failed to find liquidity pool account.');
            return null;
        }
        const data = Buffer.from(accountInfo.data);
        const poolInfo = raydium_hakiun_sdk_1.LIQUIDITY_STATE_LAYOUT_V4.decode(data);
        return poolInfo;
    }
    async getAccountFromPoolID(poolId) {
        const poolPublicKey = new web3_js_1.PublicKey(poolId);
        const accountInfo = await this.connection.getAccountInfo(poolPublicKey);
        if (!accountInfo) {
            console.error('Failed to find liquidity pool account.');
            return null;
        }
        return raydium_hakiun_sdk_1.SPL_ACCOUNT_LAYOUT.decode(Buffer.from(accountInfo.data));
    }
    async simulateLegacyTransaction(tx) {
        const txid = await this.connection.simulateTransaction(tx, [this.wallet.payer]);
        return txid;
    }
    async simulateVersionedTransaction(tx) {
        const txid = await this.connection.simulateTransaction(tx);
        return txid;
    }
    async getTokenAccountByOwnerAndMint(mint) {
        const tokenAccount = (await this.getOwnerTokenAccounts()).find((i) => i.accountInfo.mint.toBase58() === mint);
        if (!tokenAccount) {
            throw new Error('Token account not found.');
        }
        return tokenAccount;
    }
    async getPrice(poolKeys) {
        const poolInfo = await raydium_hakiun_sdk_1.Liquidity.fetchInfo({ connection: this.connection, poolKeys });
        const price = raydium_hakiun_sdk_1.Liquidity.getRate(poolInfo);
        return price;
    }
    async calcAmountOut(poolKeys, rawAmountIn, swapInDirection) {
        const poolInfo = await raydium_hakiun_sdk_1.Liquidity.fetchInfo({ connection: this.connection, poolKeys });
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
        const slippage = new raydium_hakiun_sdk_1.Percent(10000, 100);
        const { amountOut, currentPrice, executionPrice, priceImpact, fee } = raydium_hakiun_sdk_1.Liquidity.computeAmountOut({
            poolKeys,
            poolInfo,
            amountIn,
            currencyOut,
            slippage,
        });
        return {
            amountIn,
            amountOut,
            minAmountOut: new raydium_hakiun_sdk_1.TokenAmount(currencyOut, Number(1), false),
            currentPrice,
            executionPrice,
            priceImpact,
            fee,
        };
    }
}
RaydiumSwap.RAYDIUM_V4_PROGRAM_ID = '675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8';
exports.default = RaydiumSwap;
//# sourceMappingURL=RaydiumSwap.js.map