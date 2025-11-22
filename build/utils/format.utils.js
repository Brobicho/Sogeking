"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatPercentage = formatPercentage;
exports.formatColoredPercentage = formatColoredPercentage;
exports.formatSolAmount = formatSolAmount;
exports.formatTokenAmount = formatTokenAmount;
exports.truncateAddress = truncateAddress;
exports.formatSolscanTxUrl = formatSolscanTxUrl;
exports.formatSolscanTokenUrl = formatSolscanTokenUrl;
exports.formatDexscreenerUrl = formatDexscreenerUrl;
const constants_1 = require("../constants");
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
    return maker ? `${baseUrl}?maker=${maker}` : baseUrl;
}
//# sourceMappingURL=format.utils.js.map