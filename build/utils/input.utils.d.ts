export declare function getUserInput(question: string): Promise<string>;
export declare function getNumericInput(question: string): Promise<number>;
export declare function getConfirmation(question: string): Promise<boolean>;
export declare function setupKeyboardListener(onSpace?: () => void, onQuit?: () => void, onBuy?: () => void): void;
export declare function cleanupKeyboardListener(): void;
//# sourceMappingURL=input.utils.d.ts.map