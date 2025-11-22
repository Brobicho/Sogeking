/**
 * Solana blockchain constants
 */

export const SOLANA_ADDRESSES = {
  WSOL: 'So11111111111111111111111111111111111111112',
  USDC: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
} as const;

export const SOLANA_DEFAULTS = {
  COMMITMENT: 'processed' as const,
  MAX_RETRIES: 20,
  TIMEOUT_MS: 15000,
} as const;

export const LAMPORTS_PER_SOL = 1_000_000_000;

export const TOKEN_DECIMALS = {
  SOL: 9,
  USDC: 6,
} as const;
