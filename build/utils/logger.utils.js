"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = exports.Logger = exports.LogLevel = void 0;
exports.clearConsole = clearConsole;
const constants_1 = require("../constants");
var LogLevel;
(function (LogLevel) {
    LogLevel[LogLevel["DEBUG"] = 0] = "DEBUG";
    LogLevel[LogLevel["INFO"] = 1] = "INFO";
    LogLevel[LogLevel["WARN"] = 2] = "WARN";
    LogLevel[LogLevel["ERROR"] = 3] = "ERROR";
})(LogLevel || (exports.LogLevel = LogLevel = {}));
class Logger {
    constructor(level = LogLevel.INFO) {
        this.level = level;
    }
    setLevel(level) {
        this.level = level;
    }
    debug(message, ...args) {
        if (this.level <= LogLevel.DEBUG) {
            console.log(`[DEBUG] ${message}`, ...args);
        }
    }
    info(message, ...args) {
        if (this.level <= LogLevel.INFO) {
            console.log(`[INFO] ${message}`, ...args);
        }
    }
    warn(message, ...args) {
        if (this.level <= LogLevel.WARN) {
            console.warn(`[WARN] ${message}`, ...args);
        }
    }
    error(message, ...args) {
        if (this.level <= LogLevel.ERROR) {
            console.error(`[ERROR] ${message}`, ...args);
        }
    }
    success(message, ...args) {
        if (this.level <= LogLevel.INFO) {
            console.log(`${constants_1.CONSOLE_COLORS.GREEN}✓${constants_1.CONSOLE_COLORS.RESET} ${message}`, ...args);
        }
    }
    failure(message, ...args) {
        if (this.level <= LogLevel.ERROR) {
            console.error(`${constants_1.CONSOLE_COLORS.RED}✗${constants_1.CONSOLE_COLORS.RESET} ${message}`, ...args);
        }
    }
}
exports.Logger = Logger;
exports.logger = new Logger();
function clearConsole() {
    console.clear();
}
//# sourceMappingURL=logger.utils.js.map