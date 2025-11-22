"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CLIHandler = exports.CLI_COMMANDS = void 0;
exports.parseCommandLineArgs = parseCommandLineArgs;
const RaydiumSwap_1 = __importDefault(require("../core/RaydiumSwap"));
const config_1 = require("../config");
const SwapService_1 = require("../services/SwapService");
const WalletMonitorService_1 = require("../services/WalletMonitorService");
const utils_1 = require("../utils");
exports.CLI_COMMANDS = {
    LOG_POOLS: ['-log-pools', '--log-pools', '-lp', '--lp'],
    MONITOR: ['-monitor', '--monitor', '-m', '--m'],
    SNIPE: ['-snipe', '--snipe', '-s', '--s'],
    TOKEN: ['--token', '-t', '--t'],
    COPY: ['--copy', '-c', '--c'],
};
function parseCommandLineArgs(args) {
    const result = {
        params: [],
    };
    for (let i = 2; i < args.length; i++) {
        const arg = args[i];
        if (exports.CLI_COMMANDS.TOKEN.includes(arg)) {
            result.tokenAddress = args[++i];
        }
        else if (exports.CLI_COMMANDS.LOG_POOLS.includes(arg)) {
            result.command = 'log-pools';
        }
        else if (exports.CLI_COMMANDS.MONITOR.includes(arg)) {
            result.command = 'monitor';
        }
        else if (exports.CLI_COMMANDS.SNIPE.includes(arg)) {
            result.command = 'snipe';
        }
        else if (exports.CLI_COMMANDS.COPY.includes(arg)) {
            result.command = 'copy';
            result.walletAddress = args[++i];
        }
        else {
            result.params?.push(arg);
        }
    }
    return result;
}
class CLIHandler {
    static async handleLogPools(params) {
        const minDiff = params[0] ? parseInt(params[0]) : 50;
        const maxDiff = params[1] ? parseInt(params[1]) : 60 * 60 * 24 * 8;
        const raydiumSwap = new RaydiumSwap_1.default(process.env.RPC_URL, process.env.WALLET_PRIVATE_KEY);
        utils_1.logger.info('Logging pools', { minDiff, maxDiff });
        await raydiumSwap.logPools(minDiff, maxDiff);
    }
    static async handleMonitor(tokenAddress) {
        if (tokenAddress) {
            (0, config_1.updateSwapConfig)({ tokenBAddress: tokenAddress });
        }
        utils_1.logger.info('Monitoring token', { token: config_1.swapConfig.tokenBAddress });
        await SwapService_1.SwapService.monitorAndTrade();
    }
    static async handleSnipe() {
        (0, config_1.updateSwapConfig)({
            showInterface: false,
            createAccount: true,
            snipeMode: true,
        });
        await this.handleDefault();
    }
    static async handleCopy(walletAddress) {
        if (!walletAddress) {
            utils_1.logger.error('Please provide the wallet address to copy');
            process.exit(1);
        }
        (0, config_1.updateSwapConfig)({
            createAccount: false,
            showInterface: false,
        });
        const raydiumSwap = new RaydiumSwap_1.default(process.env.RPC_URL, process.env.WALLET_PRIVATE_KEY);
        const walletMonitor = new WalletMonitorService_1.WalletMonitorService(raydiumSwap, walletAddress);
        await walletMonitor.startMonitoring();
    }
    static async handleDefault() {
        try {
            const solAmount = await (0, utils_1.getNumericInput)('Enter amount(SOL): ');
            if (solAmount > 0) {
                (0, config_1.updateSwapConfig)({ tokenAAmount: Math.round(solAmount * 100000) / 100000 });
            }
            await SwapService_1.SwapService.executeSwap();
        }
        catch (error) {
            utils_1.logger.error('Failed to execute swap', error);
            process.exit(1);
        }
    }
}
exports.CLIHandler = CLIHandler;
//# sourceMappingURL=CLIHandler.js.map