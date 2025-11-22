"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.swapOut = exports.swapConfig = exports.DEFAULT_SWAP_OUT_CONFIG = exports.DEFAULT_SWAP_CONFIG = void 0;
exports.updateSwapConfig = updateSwapConfig;
exports.updateSwapOutConfig = updateSwapOutConfig;
exports.resetSwapConfig = resetSwapConfig;
exports.resetSwapOutConfig = resetSwapOutConfig;
const constants_1 = require("./constants");
exports.DEFAULT_SWAP_CONFIG = {
    executeSwap: true,
    useVersionedTransaction: false,
    tokenAAmount: 0.03,
    tokenAAddress: constants_1.SOLANA_ADDRESSES.WSOL,
    tokenBAddress: '5XT9LspYr932BjDXuYpAa9VjsdH12P3zrR5r1Xezt9v7',
    maxLamports: 15000000,
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
exports.DEFAULT_SWAP_OUT_CONFIG = {
    executeSwap: true,
    useVersionedTransaction: false,
    tokenAAddress: 'su7YDnAjx3gAmUN4jJrxivBcVDEheNRkPGMmXPHVBkN',
    tokenBAddress: constants_1.SOLANA_ADDRESSES.WSOL,
    maxLamports: 10000000,
    direction: 'in',
    liquidityFile: 'raydium-pools.json',
    maxRetries: 0,
};
exports.swapConfig = { ...exports.DEFAULT_SWAP_CONFIG };
exports.swapOut = { ...exports.DEFAULT_SWAP_OUT_CONFIG };
function updateSwapConfig(updates) {
    Object.assign(exports.swapConfig, updates);
}
function updateSwapOutConfig(updates) {
    Object.assign(exports.swapOut, updates);
}
function resetSwapConfig() {
    Object.assign(exports.swapConfig, exports.DEFAULT_SWAP_CONFIG);
}
function resetSwapOutConfig() {
    Object.assign(exports.swapOut, exports.DEFAULT_SWAP_OUT_CONFIG);
}
//# sourceMappingURL=config.js.map