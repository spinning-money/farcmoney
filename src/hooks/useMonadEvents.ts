import { useEffect, useState, useCallback } from 'react';
import { useAccount } from 'wagmi';
import { MONAD_CONTRACT_ADDRESS, SpinAndWinMonadABI } from '../contracts/SpinAndWinMonad';
import { formatEther } from 'viem';

export interface MonadSpinEvent {
  player: string;
  reward: string;
  jpReward: string;
  prizeIndex: number;
  timestamp: number;
  transactionHash: string;
}

export const useMonadEvents = () => {
  const { address } = useAccount();
  const [recentEvents, setRecentEvents] = useState<MonadSpinEvent[]>([]);
  const [latestSpinResult, setLatestSpinResult] = useState<MonadSpinEvent | null>(null);
  const [isListening, setIsListening] = useState(false);

  // Listen for immediate results from transaction polling
  useEffect(() => {
    if (!address) return;
    
    const handleImmediateResult = (event: CustomEvent) => {
      const eventData = event.detail;
      if (eventData && eventData.player.toLowerCase() === address.toLowerCase()) {
        setLatestSpinResult(eventData);
        setRecentEvents(prev => [eventData, ...prev.slice(0, 9)]);
      }
    };
    
    window.addEventListener('monadSpinResult', handleImmediateResult as EventListener);
    
    return () => {
      window.removeEventListener('monadSpinResult', handleImmediateResult as EventListener);
    };
  }, [address]);

  // WebSocket connection for real-time events (fallback)
  useEffect(() => {
    if (!address) return;

    let ws: WebSocket | null = null;
    let reconnectAttempts = 0;
    const maxReconnectAttempts = 5;
    
    const connectWebSocket = () => {
      try {
        ws = new WebSocket('wss://monad-testnet.g.alchemy.com/v2/EXk1VtDVCaeNBRAWsi7WA');
        
        ws.onopen = () => {
          setIsListening(true);
          reconnectAttempts = 0; // Reset reconnect attempts on successful connection
          
          // SpinResult event'ini dinle
          const subscribeMessage = {
            jsonrpc: '2.0',
            id: 1,
            method: 'eth_subscribe',
            params: [
              'logs',
              {
                address: MONAD_CONTRACT_ADDRESS.toLowerCase(),
                topics: [
                  '0x923a28d8c9438f25c933f709149b09e8d419b32b13fe24f5e61ee52c0d1b437a' // SpinResult event signature hash
                ]
              }
            ]
          };
          
          ws?.send(JSON.stringify(subscribeMessage));
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            
            // Subscription confirmation check
            if (data.id === 1 && data.result) {
              return;
            }
            
            if (data.method === 'eth_subscription' && data.params?.result) {
              const logData = data.params.result;
              
              // Event verilerini decode et
              const eventData = decodeSpinResultEvent(logData);
              if (eventData) {
                if (eventData.player.toLowerCase() === address.toLowerCase()) {
                  setLatestSpinResult(eventData);
                  setRecentEvents(prev => [eventData, ...prev.slice(0, 9)]); // Son 10 event'i tut
                }
              }
            }
          } catch (error) {
            console.error('❌ WebSocket mesajı parse edilemedi:', error);
          }
        };

        ws.onerror = (error) => {
          console.error('❌ WebSocket hatası:', error);
          setIsListening(false);
        };

        ws.onclose = () => {
          setIsListening(false);
          
          // Exponential backoff ile yeniden bağlanmayı dene
          if (reconnectAttempts < maxReconnectAttempts && address) {
            const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 10000); // Max 10 seconds
            reconnectAttempts++;
            setTimeout(() => {
              connectWebSocket();
            }, delay);
          } else if (reconnectAttempts >= maxReconnectAttempts) {
            console.log('⚠️ WebSocket yeniden bağlanma denemeleri tükendi');
          }
        };
        
      } catch (error) {
        console.error('❌ WebSocket bağlantı hatası:', error);
        setIsListening(false);
      }
    };

    connectWebSocket();

    return () => {
      if (ws) {
        ws.close();
        setIsListening(false);
      }
    };
  }, [address]);

  // WebSocket handles events automatically, no need for fallback polling

  // Event verilerini decode etme fonksiyonu
  const decodeSpinResultEvent = (logData: any): MonadSpinEvent | null => {
    try {
      // SpinResult(address indexed player, uint256 reward, uint256 jpReward, uint8 prizeIndex)
      const topics = logData.topics;
      const data = logData.data;
      
      if (topics.length < 2) return null;
      
      // Player address (topic 1)
      const player = '0x' + topics[1].slice(26); // Son 20 byte
      
      // Data kısmından reward, jpReward, prizeIndex'i çıkar
      const dataBytes = data.slice(2); // '0x' prefix'ini kaldır
      const reward = BigInt('0x' + dataBytes.slice(0, 64));
      const jpReward = BigInt('0x' + dataBytes.slice(64, 128));
      const prizeIndex = parseInt(dataBytes.slice(128, 192), 16);
      
      return {
        player,
        reward: formatEther(reward),
        jpReward: formatEther(jpReward),
        prizeIndex,
        timestamp: Date.now(),
        transactionHash: logData.transactionHash || ''
      };
    } catch (error) {
      console.error('❌ Event decode hatası:', error);
      return null;
    }
  };

  // Latest spin result'ı temizleme fonksiyonu
  const clearLatestSpinResult = useCallback(() => {
    setLatestSpinResult(null);
  }, []);

  return {
    recentEvents,
    latestSpinResult,
    isListening,
    clearLatestSpinResult,
    setRecentEvents,
  };
}; 