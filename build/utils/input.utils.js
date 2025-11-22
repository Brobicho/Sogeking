"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUserInput = getUserInput;
exports.getNumericInput = getNumericInput;
exports.getConfirmation = getConfirmation;
exports.setupKeyboardListener = setupKeyboardListener;
exports.cleanupKeyboardListener = cleanupKeyboardListener;
const readline_1 = __importDefault(require("readline"));
function getUserInput(question) {
    const rl = readline_1.default.createInterface({
        input: process.stdin,
        output: process.stdout,
    });
    return new Promise((resolve) => {
        rl.question(question, (input) => {
            rl.close();
            resolve(input);
        });
    });
}
async function getNumericInput(question) {
    const input = await getUserInput(question);
    const value = parseFloat(input);
    if (isNaN(value)) {
        throw new Error(`Invalid numeric input: ${input}`);
    }
    return value;
}
async function getConfirmation(question) {
    const input = await getUserInput(`${question} (y/n): `);
    return input.toLowerCase() === 'y' || input.toLowerCase() === 'yes';
}
function setupKeyboardListener(onSpace, onQuit, onBuy) {
    if (!process.stdin.setRawMode) {
        return;
    }
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (key) => {
        const keyStr = key.toString();
        if (keyStr === 'q' || keyStr === 'Q') {
            if (onQuit)
                onQuit();
            else
                process.exit(0);
        }
        if (keyStr === ' ' && onSpace) {
            onSpace();
        }
        if ((keyStr === 'b' || keyStr === 'B') && onBuy) {
            onBuy();
        }
    });
}
function cleanupKeyboardListener() {
    if (process.stdin.setRawMode) {
        process.stdin.setRawMode(false);
    }
    process.stdin.pause();
}
//# sourceMappingURL=input.utils.js.map