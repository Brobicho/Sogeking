/**
 * Raydium protocol constants
 */

export const RAYDIUM_ADDRESSES = {
  LIQUIDITY_POOL_V4: '675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8',
} as const;

export const RAYDIUM_DEFAULTS = {
  LP_DECIMALS: 5,
  SLIPPAGE_PERCENT: 10000, // 100x slippage
  SLIPPAGE_BASE: 100,
} as const;

export const COMPUTE_UNIT_LIMITS = {
  WITH_ACCOUNT_CREATION: 47000,
  WITHOUT_ACCOUNT_CREATION: 75000,
} as const;
