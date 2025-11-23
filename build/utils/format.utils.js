"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPublicKeyFromPrivateKey = getPublicKeyFromPrivateKey;
exports.getWalletAddress = getWalletAddress;
exports.formatPercentage = formatPercentage;
exports.formatColoredPercentage = formatColoredPercentage;
exports.formatSolAmount = formatSolAmount;
exports.formatTokenAmount = formatTokenAmount;
exports.truncateAddress = truncateAddress;
exports.formatSolscanTxUrl = formatSolscanTxUrl;
exports.formatSolscanTokenUrl = formatSolscanTokenUrl;
exports.formatDexscreenerUrl = formatDexscreenerUrl;
const constants_1 = require("../constants");
const web3_js_1 = require("@solana/web3.js");
const bs58_1 = __importDefault(require("bs58"));
function getPublicKeyFromPrivateKey(privateKey) {
    try {
        const keypair = web3_js_1.Keypair.fromSecretKey(Uint8Array.from(bs58_1.default.decode(privateKey)));
        return keypair.publicKey.toString();
    }
    catch (error) {
        throw new Error(`Failed to derive public key from private key: ${error instanceof Error ? error.message : String(error)}`);
    }
}
function getWalletAddress() {
    const privateKey = process.env.WALLET_PRIVATE_KEY;
    if (!privateKey) {
        throw new Error('WALLET_PRIVATE_KEY not found in environment variables');
    }
    return getPublicKeyFromPrivateKey(privateKey);
}
function formatPercentage(value, decimals = 1) {
    return `${value.toFixed(decimals)}%`;
}
function formatColoredPercentage(value, decimals = 1) {
    const formatted = formatPercentage(value, decimals);
    const color = value < 0 ? constants_1.CONSOLE_COLORS.RED : constants_1.CONSOLE_COLORS.GREEN;
    return `${color}${formatted}${constants_1.CONSOLE_COLORS.RESET}`;
}
function formatSolAmount(lamports) {
    return `${(lamports / 1000000000).toFixed(6)} SOL`;
}
function formatTokenAmount(amount, decimals) {
    return `${(amount / Math.pow(10, decimals)).toFixed(decimals)}`;
}
function truncateAddress(address, startChars = 4, endChars = 4) {
    if (address.length <= startChars + endChars) {
        return address;
    }
    return `${address.slice(0, startChars)}...${address.slice(-endChars)}`;
}
function formatSolscanTxUrl(txId) {
    return `https://solscan.io/tx/${txId}`;
}
function formatSolscanTokenUrl(tokenAddress) {
    return `https://solscan.io/token/${tokenAddress}`;
}
function formatDexscreenerUrl(tokenAddress, maker) {
    const baseUrl = `https://dexscreener.com/solana/${tokenAddress}`;
    const makerAddress = maker || getWalletAddress();
    return `${baseUrl}?maker=${makerAddress}`;
}
//# sourceMappingURL=format.utils.js.map