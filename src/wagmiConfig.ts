import { http, createConfig, webSocket } from 'wagmi'
import { base } from 'wagmi/chains'
import { farcasterMiniApp as miniAppConnector } from '@farcaster/miniapp-wagmi-connector'

// Monad testnet chain definition
const monadTestnet = {
  id: 10143, // Monad testnet chain ID
  name: 'Monad Testnet',
  network: 'monad-testnet',
  nativeCurrency: {
    decimals: 18,
    name: 'Monad',
    symbol: 'MON',
  },
  rpcUrls: {
    public: { 
      http: ['https://monad-testnet.g.alchemy.com/v2/EXk1VtDVCaeNBRAWsi7WA'],
      webSocket: ['wss://monad-testnet.g.alchemy.com/v2/EXk1VtDVCaeNBRAWsi7WA']
    },
    default: { 
      http: ['https://monad-testnet.g.alchemy.com/v2/EXk1VtDVCaeNBRAWsi7WA'],
      webSocket: ['wss://monad-testnet.g.alchemy.com/v2/EXk1VtDVCaeNBRAWsi7WA']
    },
  },
  blockExplorers: {
    default: { name: 'Monad Explorer', url: 'https://explorer.testnet.monad.xyz' },
  },
} as const;

// Check if we're in Farcaster miniapp environment
const isFarcasterMiniapp = typeof window !== 'undefined' && 
  (window.location.hostname.includes('farcaster') || 
   window.location.hostname.includes('warpcast') ||
   window.navigator.userAgent.includes('Farcaster'));

export const config = createConfig({
  chains: [base, monadTestnet],
  transports: {
    [base.id]: http(),
    [monadTestnet.id]: isFarcasterMiniapp ? http('https://monad-testnet.g.alchemy.com/v2/EXk1VtDVCaeNBRAWsi7WA') : webSocket('wss://monad-testnet.g.alchemy.com/v2/EXk1VtDVCaeNBRAWsi7WA'),
  },
  connectors: [
    miniAppConnector()
  ],
}) 