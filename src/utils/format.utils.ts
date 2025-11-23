import { CONSOLE_COLORS } from '../constants';
import { Keypair } from '@solana/web3.js';
import bs58 from 'bs58';

/**
 * Gets the public key from a private key (base58 encoded)
 */
export function getPublicKeyFromPrivateKey(privateKey: string): string {
  try {
    const keypair = Keypair.fromSecretKey(Uint8Array.from(bs58.decode(privateKey)));
    return keypair.publicKey.toString();
  } catch (error) {
    throw new Error(`Failed to derive public key from private key: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Gets the wallet address from environment variable
 */
export function getWalletAddress(): string {
  const privateKey = process.env.WALLET_PRIVATE_KEY;
  if (!privateKey) {
    throw new Error('WALLET_PRIVATE_KEY not found in environment variables');
  }
  return getPublicKeyFromPrivateKey(privateKey);
}

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
 * Formats a Dexscreener URL with maker parameter automatically set to wallet address
 */
export function formatDexscreenerUrl(tokenAddress: string, maker?: string): string {
  const baseUrl = `https://dexscreener.com/solana/${tokenAddress}`;
  const makerAddress = maker || getWalletAddress();
  return `${baseUrl}?maker=${makerAddress}`;
}
