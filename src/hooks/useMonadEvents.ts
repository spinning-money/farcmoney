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
        console.log('🚀 Immediate spin result received:', eventData);
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
        console.log('🚀 Monad WebSocket bağlantısı kuruluyor... (Attempt:', reconnectAttempts + 1, ')');
        ws = new WebSocket('wss://monad-testnet.g.alchemy.com/v2/EXk1VtDVCaeNBRAWsi7WA');
        
        ws.onopen = () => {
          console.log('✅ Monad WebSocket bağlantısı kuruldu');
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
          console.log('📡 SpinResult event dinlemeye başlandı');
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            console.log('📨 WebSocket mesajı alındı:', data);
            
            // Subscription confirmation check
            if (data.id === 1 && data.result) {
              console.log('✅ Subscription aktif, subscription ID:', data.result);
              return;
            }
            
            if (data.method === 'eth_subscription' && data.params?.result) {
              const logData = data.params.result;
              console.log('🎯 Log event yakalandı:', logData);
              console.log('🔍 Event address:', logData.address);
              console.log('🔍 Event topics:', logData.topics);
              console.log('🔍 Expected address:', MONAD_CONTRACT_ADDRESS);
              console.log('🔍 Expected topic:', '0x923a28d8c9438f25c933f709149b09e8d419b32b13fe24f5e61ee52c0d1b437a');
              
              // Event verilerini decode et
              const eventData = decodeSpinResultEvent(logData);
              if (eventData) {
                console.log('🔍 Decoded event data:', eventData);
                console.log('🔍 Event player:', eventData.player.toLowerCase());
                console.log('🔍 Current address:', address.toLowerCase());
                
                if (eventData.player.toLowerCase() === address.toLowerCase()) {
                  console.log('🎉 Kullanıcı için SpinResult bulundu:', eventData);
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
          console.log('🔌 WebSocket bağlantısı kapandı');
          setIsListening(false);
          
          // Exponential backoff ile yeniden bağlanmayı dene
          if (reconnectAttempts < maxReconnectAttempts && address) {
            const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 10000); // Max 10 seconds
            reconnectAttempts++;
            console.log(`🔄 WebSocket yeniden bağlanmaya çalışılıyor... (${reconnectAttempts}/${maxReconnectAttempts}) - ${delay}ms sonra`);
            setTimeout(() => {
              connectWebSocket();
            }, delay);
          } else if (reconnectAttempts >= maxReconnectAttempts) {
            console.log('⚠️ WebSocket yeniden bağlanma denemeleri tükendi, fallback polling kullanılacak');
            // Fallback: Manual polling for events
            startFallbackPolling();
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
        console.log('🔌 WebSocket bağlantısı kapatılıyor...');
        ws.close();
        setIsListening(false);
      }
    };
  }, [address]);

  // Fallback polling for events when WebSocket fails
  const startFallbackPolling = useCallback(() => {
    console.log('🔄 Fallback polling başlatılıyor...');
    
    const pollForEvents = async () => {
      try {
        const response = await fetch('https://monad-testnet.g.alchemy.com/v2/EXk1VtDVCaeNBRAWsi7WA', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0',
            method: 'eth_getLogs',
            params: [{
              address: MONAD_CONTRACT_ADDRESS.toLowerCase(),
              topics: ['0x923a28d8c9438f25c933f709149b09e8d419b32b13fe24f5e61ee52c0d1b437a'],
              fromBlock: 'latest',
              toBlock: 'latest'
            }],
            id: 1
          })
        });
        
        const data = await response.json();
        if (data.result && data.result.length > 0) {
          console.log('🔍 Fallback polling found events:', data.result.length);
          data.result.forEach((log: any) => {
            const eventData = decodeSpinResultEvent(log);
            if (eventData && eventData.player.toLowerCase() === address?.toLowerCase()) {
              console.log('🎉 Fallback polling found user event:', eventData);
              setLatestSpinResult(eventData);
              setRecentEvents(prev => [eventData, ...prev.slice(0, 9)]);
            }
          });
        }
      } catch (error) {
        console.error('❌ Fallback polling error:', error);
      }
    };
    
    // Poll every 3 seconds
    const interval = setInterval(pollForEvents, 3000);
    
    // Clean up after 2 minutes
    setTimeout(() => {
      clearInterval(interval);
      console.log('⏰ Fallback polling stopped');
    }, 120000);
  }, [address]);

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
    console.log('🧹 Clearing latest spin result...');
    setLatestSpinResult(null);
    // Force clear multiple times to ensure it's cleared
    setTimeout(() => {
      setLatestSpinResult(null);
      console.log('🧹 First clear attempt');
    }, 25);
    setTimeout(() => {
      setLatestSpinResult(null);
      console.log('🧹 Second clear attempt');
    }, 75);
    setTimeout(() => {
      setLatestSpinResult(null);
      console.log('🧹 Third clear attempt');
    }, 150);
  }, []);

  return {
    recentEvents,
    latestSpinResult,
    isListening,
    clearLatestSpinResult,
    setRecentEvents,
  };
}; 