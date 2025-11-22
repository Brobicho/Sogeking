import { CONSOLE_COLORS } from '../constants';

/**
 * Formats a percentage value with color
 */
export function formatPercentage(value: number, decimals: number = 1): string {
  return `${value.toFixed(decimals)}%`;
}

/**
 * Formats a colored percentage
 */
export function formatColoredPercentage(value: number, decimals: number = 1): string {
  const formatted = formatPercentage(value, decimals);
  const color = value < 0 ? CONSOLE_COLORS.RED : CONSOLE_COLORS.GREEN;
  return `${color}${formatted}${CONSOLE_COLORS.RESET}`;
}

/**
 * Formats a SOL amount
 */
export function formatSolAmount(lamports: number): string {
  return `${(lamports / 1_000_000_000).toFixed(6)} SOL`;
}

/**
 * Formats a token amount with decimals
 */
export function formatTokenAmount(amount: number, decimals: number): string {
  return `${(amount / Math.pow(10, decimals)).toFixed(decimals)}`;
}

/**
 * Truncates a string in the middle (useful for addresses)
 */
export function truncateAddress(address: string, startChars: number = 4, endChars: number = 4): string {
  if (address.length <= startChars + endChars) {
    return address;
  }
  return `${address.slice(0, startChars)}...${address.slice(-endChars)}`;
}

/**
 * Formats a Solscan URL for a transaction
 */
export function formatSolscanTxUrl(txId: string): string {
  return `https://solscan.io/tx/${txId}`;
}

/**
 * Formats a Solscan URL for a token
 */
export function formatSolscanTokenUrl(tokenAddress: string): string {
  return `https://solscan.io/token/${tokenAddress}`;
}

/**
 * Formats a Dexscreener URL
 */
export function formatDexscreenerUrl(tokenAddress: string, maker?: string): string {
  const baseUrl = `https://dexscreener.com/solana/${tokenAddress}`;
  return maker ? `${baseUrl}?maker=${maker}` : baseUrl;
}
