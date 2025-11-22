import { Connection } from '@solana/web3.js';
import { EventEmitter } from 'events';
import { ListenerConfig } from './types';
export declare class Listeners extends EventEmitter {
    private readonly connection;
    private subscriptions;
    constructor(connection: Connection);
    start(config: ListenerConfig): Promise<void>;
    private subscribeToRaydiumPools;
    private subscribeToWalletChanges;
    stop(): Promise<void>;
}
//# sourceMappingURL=listeners.d.ts.map