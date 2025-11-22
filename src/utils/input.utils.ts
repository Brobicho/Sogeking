import readline from 'readline';

/**
 * Prompts the user for input
 */
export function getUserInput(question: string): Promise<string> {
  const rl = readline.createInterface({
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

/**
 * Gets a numeric input from the user
 */
export async function getNumericInput(question: string): Promise<number> {
  const input = await getUserInput(question);
  const value = parseFloat(input);
  
  if (isNaN(value)) {
    throw new Error(`Invalid numeric input: ${input}`);
  }
  
  return value;
}

/**
 * Gets a yes/no confirmation from the user
 */
export async function getConfirmation(question: string): Promise<boolean> {
  const input = await getUserInput(`${question} (y/n): `);
  return input.toLowerCase() === 'y' || input.toLowerCase() === 'yes';
}

/**
 * Sets up keyboard listener for interactive mode
 */
export function setupKeyboardListener(
  onSpace?: () => void,
  onQuit?: () => void,
  onBuy?: () => void
): void {
  if (!process.stdin.setRawMode) {
    return;
  }

  process.stdin.setRawMode(true);
  process.stdin.resume();
  process.stdin.setEncoding('utf8');

  process.stdin.on('data', (key) => {
    const keyStr = key.toString();
    
    if (keyStr === 'q' || keyStr === 'Q') {
      if (onQuit) onQuit();
      else process.exit(0);
    }
    
    if (keyStr === ' ' && onSpace) {
      onSpace();
    }
    
    if ((keyStr === 'b' || keyStr === 'B') && onBuy) {
      onBuy();
    }
  });
}

/**
 * Cleans up keyboard listener
 */
export function cleanupKeyboardListener(): void {
  if (process.stdin.setRawMode) {
    process.stdin.setRawMode(false);
  }
  process.stdin.pause();
}
