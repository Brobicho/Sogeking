const swapConfig = {
  executeSwap: true, // Send tx when true, simulate tx when false
  useVersionedTransaction: false,
  tokenAAmount: 0.03, // Swap 0.1 SOL for USDT in this example
  tokenAAddress: "So11111111111111111111111111111111111111112", // Token to swap for the other, SOL in this case
  tokenBAddress: "5XT9LspYr932BjDXuYpAa9VjsdH12P3zrR5r1Xezt9v7", // USDC address
  maxLamports: 15000000,// Micro lamports for priority fee
  direction: "in" as "in" | "in", // Swap direction: 'in' or 'out'
  liquidityFile: "raydium-pools.json",
  maxRetries: 0,
  instantSell: true,
  showInterface: true, // whether to show the interface or not (useful for sniping)
  takeProfit: 0.45, // Take profit percentage
  stopLoss: 0.60, // Stop loss percentage
  createAccount: false, // Create a new account before swapping
  snipeMode: false, // Snipe mode: disable showInterface, enables createAccount and instantly buys
  tresholdLossBuy: 6, // Treshold loss percentage to buy
  tresholdResetTime: 3000, // Treshold time to reset the treshold loss in ms
  noBuy: true, // Disable buying
};

const swapOut = {
  executeSwap: true, // Send tx when true, simulate tx when false
  useVersionedTransaction: false,
  tokenAAddress: "su7YDnAjx3gAmUN4jJrxivBcVDEheNRkPGMmXPHVBkN", // Token to swap for the other, SOL in this case
  tokenBAddress: "So11111111111111111111111111111111111111112", // USDC address
  maxLamports: 10000000,// Micro lamports for priority fee
  direction: "in" as "in" | "in", // Swap direction: 'in' or 'out'
  liquidityFile: "raydium-pools.json",
  maxRetries: 0,
};

