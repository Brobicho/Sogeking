![Build](https://img.shields.io/badge/build-passing-brightgreen?style=for-the-badge) 
![Status](https://img.shields.io/badge/status-operational-brightgreen?style=for-the-badge)
![Updates](https://img.shields.io/badge/updates-on--hold-orange?style=for-the-badge)
![License](https://img.shields.io/badge/license-free-blue?style=for-the-badge)

# Sogeking - AIO Raydium Trading Bot

AIO Solana trading bot for Raydium DEX with advanced features such as price monitoring, copy trading and automated sniping.

## 🚀 Features

- **Automated Swapping**: Execute token swaps on Raydium with configurable parameters
- **Price Monitoring**: Real-time price tracking with take-profit and stop-loss
- **Copy Trading**: Monitor and copy trades from specific wallets
- **Pool Sniping**: Automatically trade new token launches
- **Pool Discovery**: Scan and log upcoming pool launches
- **Interactive Mode**: Manual trading with keyboard controls
- **Robust Error Handling**: Comprehensive error handling and retry mechanisms

## 📋 Prerequisites

- Node.js >= 20.18.0
- Solana wallet with SOL for gas fees
- RPC endpoint (Helius for example)

## 🛠️ Installation

1. Clone the repository:
```
git clone <repository-url>
cd sogeking
```

2. Install dependencies:
```
npm install
```

3. Set up environment variables:
```
cp .env.example .env
```

Edit `.env` and add your configuration:
```
RPC_URL=https://your-rpc-endpoint
WS_ENDPOINT=wss://your-websocket-endpoint (optional)
WALLET_PRIVATE_KEY=your-base58-private-key
```

## 📖 Usage

### Basic Swap
Execute a simple token swap:
```
npm start
```

### Monitor Mode
Monitor a token's price and execute trades based on thresholds:
```
npm run monitor <token-address>
# or
npm start -- --monitor <token-address>
```

### Snipe Mode
Automatically buy and sell new token launches:
```
npm run snipe
# or
npm start -- --snipe
```

### Copy Trading
Copy trades from a specific wallet:
```
npm run copy <wallet-address>
# or
npm start -- --copy <wallet-address>
```

### Pool Discovery
Log upcoming pool launches:
```
npm run log-pools
# or
npm start -- --log-pools [minDiff] [maxDiff]
```

## 🎮 Interactive Controls

When running in interactive mode:
- **Space**: Trigger manual sell
- **B**: Trigger manual buy
- **Q**: Exit the program

## ⚙️ Configuration

Edit `src/config.ts` to customize:

```
{
  tokenAAmount: 0.03,        // Amount of SOL to swap
  takeProfit: 0.45,          // Take profit threshold (45%)
  stopLoss: 0.60,            // Stop loss threshold (60%)
  maxLamports: 15_000_000,   // Priority fee in micro-lamports
  showInterface: true,       // Enable/disable interactive UI
  // ... more options
}
```

## 🧪 Development

### Build
```
npm run build
```

### Run Production Build
```
npm run start:prod
```

### Type Checking
```
npm run type-check
```

### Linting
```
npm run lint        # Check for issues
npm run lint:fix    # Fix issues automatically
```

### Formatting
```
npm run format       # Format code
npm run format:check # Check formatting
```


## 📄 License

(c)opyleft Brobicho [2024] - Free to use, distribute and commercialize.