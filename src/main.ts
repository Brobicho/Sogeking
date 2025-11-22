import 'dotenv/config';
import { parseCommandLineArgs, CLIHandler } from './cli/CLIHandler';
import { logger } from './utils';

/**
 * Main entry point for the Raydium swap bot
 */
async function main(): Promise<void> {
  try {
    // Validate environment variables
    if (!process.env.RPC_URL || !process.env.WALLET_PRIVATE_KEY) {
      throw new Error('Missing required environment variables: RPC_URL, WALLET_PRIVATE_KEY');
    }

    const args = parseCommandLineArgs(process.argv);

    // Route to appropriate command handler
    switch (args.command) {
      case 'log-pools':
        await CLIHandler.handleLogPools(args.params || []);
        break;

      case 'monitor':
        await CLIHandler.handleMonitor(args.tokenAddress);
        break;

      case 'snipe':
        await CLIHandler.handleSnipe();
        break;

      case 'copy':
        await CLIHandler.handleCopy(args.walletAddress);
        break;

      default:
        await CLIHandler.handleDefault();
        break;
    }
  } catch (error) {
    logger.error('Application error', error);
    process.exit(1);
  }
}

// Run the application
main();
