import RaydiumSwap from '../core/RaydiumSwap';
export declare class WalletMonitorService {
    private readonly raydiumSwap;
    private readonly walletAddress;
    private tokenList;
    constructor(raydiumSwap: RaydiumSwap, walletAddress: string);
    startMonitoring(): Promise<void>;
    private handleWalletUpdate;
    private handleBuy;
    private handleSell;
}
//# sourceMappingURL=WalletMonitorService.d.ts.map