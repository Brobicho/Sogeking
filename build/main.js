"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const CLIHandler_1 = require("./cli/CLIHandler");
const utils_1 = require("./utils");
async function main() {
    try {
        if (!process.env.RPC_URL || !process.env.WALLET_PRIVATE_KEY) {
            throw new Error('Missing required environment variables: RPC_URL, WALLET_PRIVATE_KEY');
        }
        const args = (0, CLIHandler_1.parseCommandLineArgs)(process.argv);
        switch (args.command) {
            case 'log-pools':
                await CLIHandler_1.CLIHandler.handleLogPools(args.params || []);
                break;
            case 'monitor':
                await CLIHandler_1.CLIHandler.handleMonitor(args.tokenAddress);
                break;
            case 'snipe':
                await CLIHandler_1.CLIHandler.handleSnipe();
                break;
            case 'copy':
                await CLIHandler_1.CLIHandler.handleCopy(args.walletAddress);
                break;
            default:
                await CLIHandler_1.CLIHandler.handleDefault();
                break;
        }
    }
    catch (error) {
        utils_1.logger.error('Application error', error);
        process.exit(1);
    }
}
main();
//# sourceMappingURL=main.js.map