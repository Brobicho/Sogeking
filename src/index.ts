import RaydiumSwap from './RaydiumSwap';
import { Transaction, PublicKey } from '@solana/web3.js';
import 'dotenv/config';
import { swapConfig, swapOut } from './config'; // Import the swap configuration for swap in
import readline from 'readline';
import { LiquidityPoolKeysV4, TOKEN_PROGRAM_ID, WSOL} from 'raydium-hakiun-sdk'
import { AccountLayout, getOrCreateAssociatedTokenAccount } from '@solana/spl-token';
import { formatDexscreenerUrl } from './utils/format.utils';

/**
 * Prompts the user for input.
 * @param {string} question The question to ask the user.
 * @returns {Promise<string>} The user's input.
 */
function getUserInput(question: any) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise(resolve => {
    rl.question(question, (input) => {
      rl.close();
      resolve(input);
    });
  });
}

/**
 * Waits for a specific time to be reached.
 * @param {number} startDate The start date in milliseconds.
 */
const waitForSpecificTime = async (startDate: number) => {
  return new Promise<void>((resolve) => {
    const wait = () => {
      const currentTime = Date.now();

      if (currentTime >= startDate) {
        // console.log('\nReached time, proceeding with swap...');
        resolve();
      } else {
        //const remainingTime = startDate - currentTime;
        //console.log(`Waiting: ${remainingTime} ms remaining\r`); 
        setTimeout(wait, 1);
      }
    };
    wait();
  });
};

/**
 * Watches the price of a token and sells it when the price reaches a certain threshold.
 * @param {RaydiumSwap} raydiumSwap RaydiumSwap instance.
 * @param {LiquidityPoolKeysV4} poolKeys Liquidity pool keys.
 * @returns {Promise<void>}
 */
async function watchPriceAndSell(raydiumSwap: any, poolKeys: any) 
{
  let initialPrice = 0;
  let amount = 0;
  let stopLoss = swapConfig.stopLoss;
  let takeProfit = swapConfig.takeProfit;
  let currentPrice = 0;
  let lossThreshold = 0;
  let profitThreshold = 0;
  let PressToSell = false;
  let sellRetries = 0;
 
  if (swapConfig.showInterface) {
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.setEncoding('utf8');
    
    process.stdin.on('data', (key) => {
      
      if (key.toString() === 'q') {
        process.exit();
      }
      if (key.toString() === ' ') {
        PressToSell = true;
      }
    });

  }
  while (true) 
  {
    try {
      let price = await raydiumSwap.getPrice(poolKeys);

      if (initialPrice === 0 && lossThreshold === 0 && profitThreshold === 0) {
        initialPrice = Number(price.toSignificant(15));
        lossThreshold = initialPrice * (1 - stopLoss);
        profitThreshold = initialPrice * (1 + takeProfit);
      }
      currentPrice = Number(price.toSignificant(15));

      if (swapConfig.showInterface) {
        const neededPercent = (((profitThreshold * 100) / currentPrice) - 100).toFixed(1) + '%';
        const lossPercent = (100 - ((lossThreshold * 100) / currentPrice)).toFixed(1) + '%';
        const actualPercent = ((currentPrice - initialPrice) / initialPrice * 100).toFixed(1) + '%';
        
        console.clear();
        console.log('Press "Space" to sell');
        console.log('Press "Q" to exit\n');
        actualPercent.includes('-') ? console.log('Actual:', '\x1b[31m' + actualPercent + '\x1b[0m')
          : console.log('Actual:', '\x1b[32m' + actualPercent + '\x1b[0m');

        console.log('TP in:', neededPercent);
        console.log('SL in:', lossPercent);
      }
      if (swapConfig.instantSell || (currentPrice < lossThreshold) || currentPrice > profitThreshold || PressToSell) 
      {
        currentPrice < lossThreshold ? console.log('🔴 SL Triggered !') : console.log('🟢 TP Triggered !');
        const time = new Date().toISOString();

        while (amount === undefined || amount === null || amount === 0) {
          amount = await raydiumSwap.getTokenAmount(swapConfig.tokenBAddress); 
        }
        let multiplier = 1;
        if (raydiumSwap.quoteDecimals < 9) {
          multiplier = 10 ** (9 - raydiumSwap.quoteDecimals);
        }

        const txSellPromise = await raydiumSwap.getSwapTransaction(
          swapConfig.tokenAAddress,
          amount / (10 ** raydiumSwap.lpDecimals) * multiplier,
          poolKeys,
          swapOut.maxLamports,
          false,
          swapOut.direction
        );

        const txidSellPromise = await raydiumSwap.sendLegacyTransaction(txSellPromise as Transaction, 20);
        //console.log(`txBuy: https://solscan.io/tx/${txidBuyPromise}`);
        console.log(`txSell: https://solscan.io/tx/${txidSellPromise}`);
        console.log(formatDexscreenerUrl(swapConfig.tokenBAddress));
        PressToSell = false;
        sellRetries++;
        if (currentPrice < lossThreshold) {
          console.log('Stop loss triggered at ' + new Date(time).toISOString());
        }
        if (currentPrice > profitThreshold) {
          console.log('Take profit triggered at ' + new Date(time).toISOString());
        }
        console.log('Sell transaction sent at:', new Date(time).toISOString());
        
        while (PressToSell === false && sellRetries < 5) {
          await new Promise(resolve => setTimeout(resolve, 1200));
        }
        continue;
      }
      await new Promise(resolve => setTimeout(resolve, 10));
    }
    catch (error) {
      //console.log('Error:', error);
      await new Promise(resolve => setTimeout(resolve, 10));
    }
  }
}

/**
 * Fetches or creates an associated token account with retries.
 * @param {RaydiumSwap} raydiumSwap RaydiumSwap instance.
 * @param {number} maxRetries Maximum number of retries.
 * @param {number} timeBetweenRetries Time between retries in milliseconds.
 * @returns {Promise<string>} The token account address.
 */
async function fetchTokenAccountWithRetry(raydiumSwap: any, maxRetries = 25, timeBetweenRetries = 15000) 
{
  let tokenAccountAddress = '';

  for (let i = 0; i < maxRetries; i++) {
    try {
      console.log('Fetching/Creating associated token account...');
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
        new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), timeBetweenRetries))
      ]);

      if (accountKey) {
        tokenAccountAddress = (accountKey as any).address.toString();
        break; 
      }
    } catch (error) {
      console.error('Retrying...');
    }
  }

  return tokenAccountAddress;
}

/**
 * Initializes the RaydiumSwap class and retrieves the pool keys.
 */
const init = async (raydiumSwapInstance: any = null, pairAddress = swapConfig.tokenBAddress) => {
  
  let raydiumSwap = raydiumSwapInstance;
  if (!raydiumSwapInstance) {
    raydiumSwap = new RaydiumSwap(process.env.RPC_URL || '', process.env.WALLET_PRIVATE_KEY || '');
  }

  console.log(`Raydium swap initialized`);
  let poolInfo = null;

  while (poolInfo === null) {
    try {
      poolInfo = await raydiumSwap.getPoolDetailsByToken(pairAddress);
    }
    catch (error) {
      console.log('\rMarket does not exist yet, retrying in 3s...');
      await new Promise(resolve => setTimeout(resolve, 3000));
      continue;
    }
  }

  const poolKeys = await raydiumSwap.getLiquidityPoolKeys(poolInfo) as LiquidityPoolKeysV4;
  //console.log(`Pool keys created: ${JSON.stringify(poolKeys)}`);

  const poolTime = await raydiumSwap.getPoolOpenDate(poolKeys);
  const startDate = parseInt(poolTime.startTime.toString()) * 1000;
  console.log(`Pool start date: ${new Date(startDate).toISOString()}`);

  if (!poolKeys) {
    throw new Error("Couldn't find pool keys for the given token pair.")
  }
  
  let account = null;
  let tokenAccountAddress = '';

  if (startDate == 0 || (startDate - new Date().getTime() > 30000)) {
    console.log('pool starts in less than 30s, skipping account creation...')
    swapConfig.createAccount = false;
  }

  if (swapConfig.createAccount) 
  {
    while (true) {
    
      try {
        tokenAccountAddress = await fetchTokenAccountWithRetry(raydiumSwap, 20, 15000);

        if (!tokenAccountAddress || tokenAccountAddress === '') {
          throw new Error("Couldn't find or create associated token account.");
        }

        account = await raydiumSwap.getAccount(tokenAccountAddress);

        if (account !== undefined && account !== null) {
          break;
        }
      }
      catch (error) {
        await new Promise(resolve => setTimeout(resolve, 15000));
        continue;
      }
    }
    console.log('Associated token account loaded');
  }
  
  if (new Date().getTime() < startDate) {
    console.log(`Pool start date: ${new Date(startDate).toISOString()}`);
    console.log(`Waiting for ${(startDate - new Date().getTime()) / 1000}s before starting swap...`);
    
    while (true) 
    {
      try {
        await waitForSpecificTime(startDate);
        break;
      }
      catch (error) {
        await new Promise(resolve => setTimeout(resolve, 10));
        continue;
      } 
    }
  }

  return {raydiumSwap, poolKeys};
}

/**
 * Listen to specific wallet
 * @param {string} walletAddress The wallet address to log.
 */
async function logWallet(walletAddress: string) {
  swapConfig.createAccount = false;
  swapConfig.showInterface = false;
  const raydiumSwap = new RaydiumSwap(process.env.RPC_URL || '', process.env.WALLET_PRIVATE_KEY || '');
  const listener = await raydiumSwap.logWallet(walletAddress);
  let initialTokenList = await raydiumSwap.getTokensOwnedByAccount(walletAddress);
  console.log(`Listenning to wallet: ${walletAddress}...`);
 
  listener.on('wallet', async (updatedAccountInfo) => 
  {
    const account = AccountLayout.decode(updatedAccountInfo.accountInfo.data);
    let tokenAddress = account.mint.toString();
    let acctAmount = parseInt(account.amount.toString());
    let newToken = false;

    let program = await raydiumSwap.fetchProgramAccounts(tokenAddress, WSOL.mint);
   // if (program[0] !== undefined && program[0].pubkey !== undefined) {
    let pairAddress = program[0].pubkey.toString();
    let oldAmount = initialTokenList.find((t) => t.tokenAddress === tokenAddress)?.amount;

    console.log('Pair:', pairAddress);
    console.log('token:', tokenAddress)
    console.log('old amount:', oldAmount);
    console.log('new amount:', acctAmount);

    try {
      let poolInfo = await raydiumSwap.getPoolDetailsByToken(tokenAddress);
      let poolKeys = await raydiumSwap.getLiquidityPoolKeys(poolInfo) as LiquidityPoolKeysV4;

      if (poolKeys === null || poolKeys === undefined) {
        console.log('Pool keys not found, skipping...');
        return;
      }
      
      let token = initialTokenList.find((t) => t.tokenAddress === tokenAddress);
      if (token === undefined) {
        token = {
          tokenAddress: tokenAddress,
          amount: acctAmount
        };
        initialTokenList.push(token);
        newToken = true;
      } else {
        token.amount = acctAmount;
      }

      if (newToken && acctAmount > 0) {
        console.log('new token detected at:', new Date().toISOString(), 'token:', tokenAddress);
        console.log(`https://solscan.io/token/${pairAddress}`);
        console.log('sending buy transaction...')
        let txBuyPromise = await raydiumSwap.getSwapTransaction(
          tokenAddress,
          swapConfig.tokenAAmount,
          poolKeys,
          swapConfig.maxLamports,
          false,
          swapConfig.direction
        );
        let txIdBuyPromise = await raydiumSwap.sendLegacyTransaction(txBuyPromise as Transaction, 20);
        console.log('Buy transaction sent at:', new Date().toISOString());
        console.log(`https://solscan.io/tx/${txIdBuyPromise}`);
      }

      if (oldAmount !== undefined && oldAmount !== null && acctAmount < oldAmount) {
        try {
          const myAmount = await raydiumSwap.getTokenAmount(tokenAddress);
          if (myAmount === undefined || myAmount === null || myAmount === 0) {
            console.log('Amount is 0, skipping sell...');
            return;
          }
          let multiplier = 1;
          if (raydiumSwap.quoteDecimals < 9) {
            multiplier = 10 ** (9 - raydiumSwap.quoteDecimals);
          }
          console.log('Sell detected at:', new Date().toISOString(), 'pair:', pairAddress);
          console.log('sending sell transaction...');
          let txSellPromise = await raydiumSwap.getSwapTransaction(
            swapConfig.tokenAAddress,
            myAmount / (10 ** raydiumSwap.lpDecimals) * multiplier,
            poolKeys,
            swapOut.maxLamports,
            false,
            swapOut.direction
          );
          await raydiumSwap.sendLegacyTransaction(txSellPromise as Transaction, 20);
          console.log('Sell transaction sent at:', new Date().toISOString());
          console.log(formatDexscreenerUrl(tokenAddress));
          }
        catch (error) {
          console.log('Error while trying to sell:', error);
        }  
      }
    }
    catch (error) {
      console.log('Error:', error);
    }
  //}
  });

  listener.on('error', (error) => {
    console.error('Error occurred:', error);
  });
}

/**
 * Logs all pools with a minimum time difference
 * @param {number} minDiff Minimum time difference in seconds between the current time and the pool's open date.
 * @param {number} maxDiff Maximum time difference in seconds between the current time and the pool's open date.
 */
async function logPools(minDiff: number = 60, maxDiff: number = 60 * 60 * 24 * 7) {
  const raydiumSwap = new RaydiumSwap(process.env.RPC_URL || '', process.env.WALLET_PRIVATE_KEY || '');
  await raydiumSwap.logPools(minDiff, maxDiff);
}

/**
 * Monitors the price of a token and executes a swap when the price reaches a certain threshold.
 */
const monitor = async () => {

  const {raydiumSwap, poolKeys} = await init();

  let PressToBuy = false;
  let sold = false;
  let initialPrice = 0;
  let actualPercent = '';
  let s = new Date().toISOString();
  let topNegPercent = 0;
  let topPosPercent = 0;

  const price = await raydiumSwap.getPrice(poolKeys);
  initialPrice = parseFloat(price.toSignificant(15));
  let lastInitialPriceTimestamp = new Date().getTime();

  while (true) 
  {
    if (sold) {
      break;
    }
    while (PressToBuy === false && swapConfig.noBuy == false) 
    {
      try {
        const price = await raydiumSwap.getPrice(poolKeys);
        let currentPrice = parseFloat(price.toSignificant(15))
        if (initialPrice === 0) {
          initialPrice = currentPrice;
        }

        if (new Date().getTime() - lastInitialPriceTimestamp > swapConfig.tresholdResetTime) {
          initialPrice = currentPrice;
          lastInitialPriceTimestamp = new Date().getTime();
        }

        actualPercent = (((currentPrice - initialPrice) / initialPrice) * 100).toFixed(1);
          if (topNegPercent > parseFloat(actualPercent)) {
            topNegPercent = parseFloat(actualPercent);
          }
          if (topPosPercent < parseFloat(actualPercent)) {
            topPosPercent = parseFloat(actualPercent);
          }
        console.clear();
        console.log('start time:', s);
        console.log('Actual percent:', actualPercent + '%')
        console.log('Top neg percent:', topNegPercent + '%')
        console.log('Top pos percent:', topPosPercent + '%')
        console.log('diff %Price:', Math.abs(parseFloat(actualPercent)));
        if (actualPercent.includes('-') && Math.abs(parseFloat(actualPercent)) > swapConfig.tresholdLossBuy) {
          PressToBuy = true;
        }
        else {
          await new Promise(resolve => setTimeout(resolve, 20));
        }
      }
      catch (error) {
        await new Promise(resolve => setTimeout(resolve, 10));
      }
    }
    if (swapConfig.noBuy == false) {
      try {
        const txBuyPromise = await raydiumSwap.getSwapTransaction(
          swapConfig.tokenBAddress,
          swapConfig.tokenAAmount,
          poolKeys,
          swapConfig.maxLamports,
          false,
          swapConfig.direction
        );
        await raydiumSwap.sendLegacyTransaction(txBuyPromise as Transaction, 20);

        PressToBuy = false;
        sold = true;
      }
      catch (error) {
        continue;
      }
    }
    await watchPriceAndSell(raydiumSwap, poolKeys);
  }
}

/**
 * Buys a token
 */
const swap = async () => {

  const {raydiumSwap, poolKeys} = await init();
  let PressToBuy = false;
  let bought = false;
  let initialPrice = 0;

  if (swapConfig.showInterface)
  {
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.setEncoding('utf8');
    
    process.stdin.on('data', (key) => {
      if (key.toString() === 'b') {
        PressToBuy = true;
      }
      if (key.toString() === 'q') {
        process.exit();
      }
    });

    const price = await raydiumSwap.getPrice(poolKeys);
    initialPrice = parseFloat(price.toSignificant(15))
  }

  while (true) 
  {
    if (bought) {
      break;
    }
    while (swapConfig.showInterface && PressToBuy === false) 
    {
      try {
        const price = await raydiumSwap.getPrice(poolKeys);
        let currentPrice = parseFloat(price.toSignificant(15))
        console.clear();
        console.log('Press "b" to buy');
        console.log('Press "Q" to exit\n');
        console.log('Actual percent:', ((currentPrice - initialPrice) / initialPrice * 100).toFixed(1) + '%');
        await new Promise(resolve => setTimeout(resolve, 20));
      }
      catch (error) {
        await new Promise(resolve => setTimeout(resolve, 10));
      }
    }
    try {
      const txBuyPromise = await raydiumSwap.getSwapTransaction(
        swapConfig.tokenBAddress,
        swapConfig.tokenAAmount,
        poolKeys,
        swapConfig.maxLamports,
        false,
        swapConfig.direction
      );
      await raydiumSwap.sendLegacyTransaction(txBuyPromise as Transaction, 20);
      if (swapConfig.showInterface) {
        console.log('swap sent at:', new Date().toISOString());
      }
      PressToBuy = false;
      bought = true;
      //console.log(`txBuy: https://solscan.io/tx/${txidBuyPromise}`);
      //require('open')(`https://solscan.io/tx/${txidBuyPromise}`);
      break;
    }
    catch (error) {
      continue;
    }
  }
  //await new Promise(resolve => setTimeout(resolve, 2300));
  await watchPriceAndSell(raydiumSwap, poolKeys);
};

const COMMANDS = {
  LOG_POOLS: ['-log-pools','--log-pools', '-lp', '--lp'],
  MONITOR: ['-monitor', '--monitor', '-m', '--m'],
  SNIPE: ['-snipe', '--snipe', '-s', '--s'],
  TOKEN: ['--token', '-t', '--t'],
  COPY: ['--copy', '-c', '--c'],
};

async function main() {
  if (process.argv.length > 2) {
    const command = process.argv[2];
    if (COMMANDS.TOKEN.includes(command)) {
      swapConfig.tokenBAddress = process.argv[3];
    }
    if (COMMANDS.LOG_POOLS.includes(command)) {
      await handleLogPools();
    }
    else if (COMMANDS.MONITOR.includes(command)) {
      await handleMonitor();
    }
    else if (COMMANDS.SNIPE.includes(command)) {
      swapConfig.snipeMode = true;
      await handleDefault();
    }
    else if (COMMANDS.COPY.includes(command)) {
      await handleCopy();
    }
  } 
  else {
    await handleDefault();
  }
}

async function handleCopy() {
  if (process.argv.length < 3) {
    console.log('Please provide the wallet address to copy');
    return;
  }
  await logWallet(process.argv[3]);
}

async function handleLogPools() {
  let minDiff = 50;
  let maxDiff = 60 * 60 * 24 * 8;
  if (process.argv.length > 3) {
    minDiff = parseInt(process.argv[3]);
  }
  if (process.argv.length > 4) {
    maxDiff = parseInt(process.argv[4]);
  }
  await logPools(minDiff, maxDiff);
}

async function handleMonitor() {
  if (process.argv.length > 3) {
    swapConfig.tokenBAddress = process.argv[3];
  }
  console.log('Monitoring token:', swapConfig.tokenBAddress);
  await monitor();
}

async function handleDefault() {
  const solAmount = await getUserInput('Enter amount(SOL): ') as number;
   /*const buyFee: number = await getUserInput('Enter buy fee amount(SOL): ') as number;
    const sellFee: number = await getUserInput('Enter sell fee amount(SOL): ') as number;
    swapConfig.maxLamports = buyFee * 1000000000
    swapOut.maxLamports = sellFee * 1000000000*/
  if (swapConfig.snipeMode) {
    swapConfig.showInterface = false;
    swapConfig.createAccount = true;
  }
  if (solAmount != 0) {
    swapConfig.tokenAAmount = Math.round(solAmount * 100000) / 100000;
  }
  await swap();
}

main();

