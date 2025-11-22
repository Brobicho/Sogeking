import RaydiumSwap from '../core/RaydiumSwap';
import { swapConfig, updateSwapConfig } from '../config';
import { SwapService } from '../services/SwapService';
import { WalletMonitorService } from '../services/WalletMonitorService';
import { logger, getNumericInput } from '../utils';

/**
 * CLI command definitions
 */
export const CLI_COMMANDS = {
  LOG_POOLS: ['-log-pools', '--log-pools', '-lp', '--lp'],
  MONITOR: ['-monitor', '--monitor', '-m', '--m'],
  SNIPE: ['-snipe', '--snipe', '-s', '--s'],
  TOKEN: ['--token', '-t', '--t'],
  COPY: ['--copy', '-c', '--c'],
} as const;

/**
 * Parsed command line arguments
 */
export interface ParsedArgs {
  command?: string;
  tokenAddress?: string;
  walletAddress?: string;
  params?: string[];
}

/**
 * Parses command line arguments
 */
export function parseCommandLineArgs(args: string[]): ParsedArgs {
  const result: ParsedArgs = {
    params: [],
  };

  for (let i = 2; i < args.length; i++) {
    const arg = args[i];

    if ((CLI_COMMANDS.TOKEN as readonly string[]).includes(arg)) {
      result.tokenAddress = args[++i];
    } else if ((CLI_COMMANDS.LOG_POOLS as readonly string[]).includes(arg)) {
      result.command = 'log-pools';
    } else if ((CLI_COMMANDS.MONITOR as readonly string[]).includes(arg)) {
      result.command = 'monitor';
    } else if ((CLI_COMMANDS.SNIPE as readonly string[]).includes(arg)) {
      result.command = 'snipe';
    } else if ((CLI_COMMANDS.COPY as readonly string[]).includes(arg)) {
      result.command = 'copy';
      result.walletAddress = args[++i];
    } else {
      result.params?.push(arg);
    }
  }

  return result;
}

/**
 * CLI command handlers
 */
export class CLIHandler {
  /**
   * Handles the log-pools command
   */
  static async handleLogPools(params: string[]): Promise<void> {
    const minDiff = params[0] ? parseInt(params[0]) : 50;
    const maxDiff = params[1] ? parseInt(params[1]) : 60 * 60 * 24 * 8;

    const raydiumSwap = new RaydiumSwap(
      process.env.RPC_URL!,
      process.env.WALLET_PRIVATE_KEY!
    );

    logger.info('Logging pools', { minDiff, maxDiff });
    await raydiumSwap.logPools(minDiff, maxDiff);
  }

  /**
   * Handles the monitor command
   */
  static async handleMonitor(tokenAddress?: string): Promise<void> {
    if (tokenAddress) {
      updateSwapConfig({ tokenBAddress: tokenAddress });
    }

    logger.info('Monitoring token', { token: swapConfig.tokenBAddress });
    await SwapService.monitorAndTrade();
  }

  /**
   * Handles the snipe command
   */
  static async handleSnipe(): Promise<void> {
    updateSwapConfig({
      showInterface: false,
      createAccount: true,
      snipeMode: true,
    });

    await this.handleDefault();
  }

  /**
   * Handles the copy trading command
   */
  static async handleCopy(walletAddress?: string): Promise<void> {
    if (!walletAddress) {
      logger.error('Please provide the wallet address to copy');
      process.exit(1);
    }

    updateSwapConfig({
      createAccount: false,
      showInterface: false,
    });

    const raydiumSwap = new RaydiumSwap(
      process.env.RPC_URL!,
      process.env.WALLET_PRIVATE_KEY!
    );

    const walletMonitor = new WalletMonitorService(raydiumSwap, walletAddress);
    await walletMonitor.startMonitoring();
  }

  /**
   * Handles the default swap command
   */
  static async handleDefault(): Promise<void> {
    try {
      const solAmount = await getNumericInput('Enter amount(SOL): ');

      if (solAmount > 0) {
        updateSwapConfig({ tokenAAmount: Math.round(solAmount * 100000) / 100000 });
      }

      await SwapService.executeSwap();
    } catch (error) {
      logger.error('Failed to execute swap', error);
      process.exit(1);
    }
  }
}
