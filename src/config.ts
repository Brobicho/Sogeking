import { SwapConfig, SwapOutConfig } from './types';
import { SOLANA_ADDRESSES } from './constants';

/**
 * Default swap configuration
 */
export const DEFAULT_SWAP_CONFIG: SwapConfig = {
  executeSwap: true,
  useVersionedTransaction: false,
  tokenAAmount: 0.03,
  tokenAAddress: SOLANA_ADDRESSES.WSOL,
  tokenBAddress: '5XT9LspYr932BjDXuYpAa9VjsdH12P3zrR5r1Xezt9v7',
  maxLamports: 15_000_000,
  direction: 'in',
  liquidityFile: 'raydium-pools.json',
  maxRetries: 0,
  instantSell: true,
  showInterface: true,
  takeProfit: 0.45,
  stopLoss: 0.60,
  createAccount: false,
  snipeMode: false,
  tresholdLossBuy: 6,
  tresholdResetTime: 3000,
  noBuy: true,
};

/**
 * Default swap out configuration
 */
export const DEFAULT_SWAP_OUT_CONFIG: SwapOutConfig = {
  executeSwap: true,
  useVersionedTransaction: false,
  tokenAAddress: 'su7YDnAjx3gAmUN4jJrxivBcVDEheNRkPGMmXPHVBkN',
  tokenBAddress: SOLANA_ADDRESSES.WSOL,
  maxLamports: 10_000_000,
  direction: 'in',
  liquidityFile: 'raydium-pools.json',
  maxRetries: 0,
};

/**
 * Mutable swap configuration (for runtime modifications)
 */
export const swapConfig: SwapConfig = { ...DEFAULT_SWAP_CONFIG };

/**
 * Mutable swap out configuration (for runtime modifications)
 */
export const swapOut: SwapOutConfig = { ...DEFAULT_SWAP_OUT_CONFIG };

/**
 * Validates and updates swap configuration
 */
export function updateSwapConfig(updates: Partial<SwapConfig>): void {
  Object.assign(swapConfig, updates);
}

/**
 * Validates and updates swap out configuration
 */
export function updateSwapOutConfig(updates: Partial<SwapOutConfig>): void {
  Object.assign(swapOut, updates);
}

/**
 * Resets swap configuration to defaults
 */
export function resetSwapConfig(): void {
  Object.assign(swapConfig, DEFAULT_SWAP_CONFIG);
}

/**
 * Resets swap out configuration to defaults
 */
export function resetSwapOutConfig(): void {
  Object.assign(swapOut, DEFAULT_SWAP_OUT_CONFIG);
}
