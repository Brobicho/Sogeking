export declare const CLI_COMMANDS: {
    readonly LOG_POOLS: readonly ["-log-pools", "--log-pools", "-lp", "--lp"];
    readonly MONITOR: readonly ["-monitor", "--monitor", "-m", "--m"];
    readonly SNIPE: readonly ["-snipe", "--snipe", "-s", "--s"];
    readonly TOKEN: readonly ["--token", "-t", "--t"];
    readonly COPY: readonly ["--copy", "-c", "--c"];
};
export interface ParsedArgs {
    command?: string;
    tokenAddress?: string;
    walletAddress?: string;
    params?: string[];
}
export declare function parseCommandLineArgs(args: string[]): ParsedArgs;
export declare class CLIHandler {
    static handleLogPools(params: string[]): Promise<void>;
    static handleMonitor(tokenAddress?: string): Promise<void>;
    static handleSnipe(): Promise<void>;
    static handleCopy(walletAddress?: string): Promise<void>;
    static handleDefault(): Promise<void>;
}
//# sourceMappingURL=CLIHandler.d.ts.map