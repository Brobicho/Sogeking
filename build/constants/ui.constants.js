"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UI_MESSAGES = exports.REFRESH_INTERVALS = exports.LOADING_SYMBOLS = exports.CONSOLE_COLORS = void 0;
exports.CONSOLE_COLORS = {
    RESET: '\x1b[0m',
    RED: '\x1b[31m',
    GREEN: '\x1b[32m',
};
exports.LOADING_SYMBOLS = ['\u{259B}', '\u{259C}', '\u{259F}', '\u{2599}'];
exports.REFRESH_INTERVALS = {
    PRICE_CHECK_MS: 10,
    RETRY_MS: 1000,
    LOADING_ANIMATION_MS: 100,
    SELL_RETRY_DELAY_MS: 1200,
};
exports.UI_MESSAGES = {
    PRESS_SPACE_SELL: 'Press "Space" to sell',
    PRESS_B_BUY: 'Press "b" to buy',
    PRESS_Q_EXIT: 'Press "Q" to exit',
};
//# sourceMappingURL=ui.constants.js.map