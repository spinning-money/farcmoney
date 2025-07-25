import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { useFarcaster } from './hooks/useFarcaster';
import { useMonad } from './hooks/useMonad';
import { useSpinEvents } from './hooks/useSpinEvents';
import { useMonadEvents } from './hooks/useMonadEvents';
import { useFarcasterWallet } from './hooks/useFarcasterWallet';
import { useChainId } from 'wagmi';
import SpinWheel from './components/SpinWheel';
import GameButtons from './components/GameButtons';
import ShareButton from './components/ShareButton';
import SharePage from './components/SharePage';
import GameInfo from './components/GameInfo';
import NetworkSelector from './components/NetworkSelector';

function MainApp() {
  const [activeNetwork, setActiveNetwork] = useState<'base' | 'monad'>('base');
  const chainId = useChainId();
  
  // Initialize Farcaster wallet detection
  const { 
    address, 
    isConnected, 
    isFarcasterEnvironment, 
    connectFarcaster 
  } = useFarcasterWallet();
  
  // Initialize hooks for both networks (always active)
  const baseHook = useFarcaster();
  const monadHook = useMonad();
  const monadEvents = useMonadEvents();
  
  // Base network state
  const [baseSpinning, setBaseSpinning] = useState(false);
  const { spinState: baseSpinState, startSpin: baseStartSpin, setSpinState: setBaseSpinState } = useSpinEvents(address, () => {
    console.log('🔄 Refreshing Base user data...');
  });
  
  // Monad network state
  const [monadSpinning, setMonadSpinning] = useState(false);
  const [monadSpinState, setMonadSpinState] = useState({
    isSpinning: false,
    targetAngle: 0,
    prizeIndex: undefined,
    resultReceived: false,
    currentRotation: 0
  });
  
  // Get current network data
  const currentHook = activeNetwork === 'base' ? baseHook : monadHook;
  const {
    isLoading,
    prizePool,
    jackpotPool,
    spinPrice,
    isPaused,
    userData,
    spin,
    claim,
    refreshData,
  } = currentHook;
  
  // Update Monad spin state when result is received
  useEffect(() => {
    if (activeNetwork === 'monad' && monadEvents.latestSpinResult) {
      console.log('🎯 Updating Monad spin state with result:', monadEvents.latestSpinResult);
      setMonadSpinState(prev => ({
        ...prev,
        prizeIndex: monadEvents.latestSpinResult.prizeIndex,
        resultReceived: true
      }));
      
      // Refresh Monad contract data when result is received
      if (refreshData) {
        console.log('🔄 Refreshing Monad data after spin result...');
        setTimeout(() => {
          refreshData();
        }, 2000); // 2 saniye sonra refresh et (transaction'ın onaylanması için)
      }
    }
  }, [monadEvents.latestSpinResult, activeNetwork, refreshData]);
  
  // Check if wallet is on correct network
  const isOnCorrectNetwork = () => {
    if (activeNetwork === 'base') {
      return chainId === 8453;
    } else if (activeNetwork === 'monad') {
      return chainId === 10143;
    }
    return false;
  };
  

  
  // Create enhanced spin function
  const enhancedSpin = async () => {
    console.log(`🎯 Enhanced spin called for: ${activeNetwork}`);
    
    if (activeNetwork === 'base') {
      // Base network - use Base state
      console.log('🎯 Base spin başlatılıyor...');
      setBaseSpinState({
        isSpinning: false,
        targetAngle: 0,
        prizeIndex: undefined,
        resultReceived: false
      });
      
      baseStartSpin();
      
      try {
        await spin();
        console.log('✅ Base spin transaction sent successfully');
      } catch (error) {
        console.error('❌ Base spin transaction failed:', error);
        setBaseSpinState(prev => ({
          ...prev,
          isSpinning: false,
          resultReceived: false
        }));
      }
    } else {
      // Monad network - use Monad state
      console.log('🎯 Monad spin başlatılıyor...');
      // Clear previous result before starting new spin
      monadEvents.clearLatestSpinResult();
      setMonadSpinState({
        isSpinning: true,
        targetAngle: 0,
        prizeIndex: undefined,
        resultReceived: false,
        currentRotation: 0
      });
      setMonadSpinning(true);
      console.log('🎯 monadSpinning set to true');
      
      try {
        await spin();
        console.log('✅ Monad spin transaction sent successfully');
      } catch (error) {
        console.error('❌ Monad spin transaction failed:', error);
        setMonadSpinning(false);
        setMonadSpinState(prev => ({
          ...prev,
          isSpinning: false
        }));
      }
    }
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-[#181A20] to-[#232946] flex flex-col items-center justify-start pb-8 pt-safe-top">
      {/* Üst Bilgi */}
      <div className="w-full flex flex-col items-center pt-8 pb-4 px-4 relative">
        <h1
          className="text-4xl sm:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-green-300 to-blue-400 drop-shadow-lg text-center tracking-tight"
          style={{ letterSpacing: '0.01em' }}
        >
          Spinning Money
        </h1>
        <div
          className="mt-2 text-lg sm:text-xl font-semibold text-blue-200/90 bg-white/5 rounded-xl px-4 py-2 shadow-sm flex items-center gap-2 backdrop-blur-sm"
          style={{ letterSpacing: '0.02em' }}
        >
          <span className="text-green-300 font-bold">Spin</span>
          <span className="mx-1 text-blue-200">•</span>
          <span className="text-yellow-200 font-bold">Win</span>
          <span className="mx-1 text-blue-200">•</span>
          <span className="text-pink-200 font-bold">Claim</span>
          <span className="hidden sm:inline text-blue-300">|</span>
          <span className="text-blue-100/80 hidden sm:inline">Provably fair crypto gaming.</span>
        </div>
        {/* Cüzdan Badge */}
        {address && (
          <div className="mt-2 bg-green-600/90 text-white text-xs font-mono px-4 py-1 rounded-full shadow-md text-center">
            {address.slice(0, 6)}...{address.slice(-4)}
            {isFarcasterEnvironment && (
              <span className="ml-1 text-yellow-300">Farcaster</span>
            )}
          </div>
        )}
      </div>

      {/* Network Selector */}
      <NetworkSelector 
        activeNetwork={activeNetwork} 
        onNetworkChange={setActiveNetwork} 
      />

      {/* Çark */}
      <div className="w-full flex justify-center items-center mb-6">
        <SpinWheel 
          spinState={activeNetwork === 'base' ? baseSpinState : monadSpinState} 
          totalPool={parseFloat(prizePool).toFixed(4)} 
          jackpot={parseFloat(jackpotPool).toFixed(4)} 
          network={activeNetwork}
          monadSpinResult={activeNetwork === 'monad' ? monadEvents.latestSpinResult : null}
          onResultProcessed={activeNetwork === 'monad' ? monadEvents.clearLatestSpinResult : undefined}
          monadSpinning={activeNetwork === 'monad' ? monadSpinning : false}
          onMonadSpinComplete={activeNetwork === 'monad' ? () => {
            console.log('🎯 Monad spin completed, setting monadSpinning to false');
            setMonadSpinning(false);
            setMonadSpinState(prev => ({
              ...prev,
              isSpinning: false
            }));
            // Don't auto-clear the result - let user see it until next spin
          } : undefined}
          onSpinCancel={() => {
            console.log('❌ Spin cancelled by user');
            // Clear any pending states
            if (activeNetwork === 'monad') {
              setMonadSpinning(false);
              setMonadSpinState(prev => ({
                ...prev,
                isSpinning: false,
                resultReceived: false
              }));
              monadEvents.clearLatestSpinResult();
            }
          }}
        />
      </div>

      {/* Chainlink VRF etiketi - sadece Base için göster */}
      {activeNetwork === 'base' && (
        <div className="w-full flex justify-center mb-6">
          <a
            href="https://vrf.chain.link/base#/side-drawer/subscription/base/17952329676849432097364691293412979287742510665681724364050779803330792847198"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs px-3 py-1 rounded-full bg-[#232946] text-blue-300 font-medium shadow border border-blue-400/30 flex items-center gap-1"
          >
            <span role="img" aria-label="link">🔗</span> Provably fair by Chainlink VRF
          </a>
        </div>
      )}

      {/* Monad Testnet etiketi - sadece Monad için göster */}
      {activeNetwork === 'monad' && (
        <div className="w-full flex justify-center mb-6">
          <div className="text-xs px-3 py-1 rounded-full bg-[#232946] text-green-300 font-medium shadow border border-green-400/30 flex items-center gap-1">
            <span role="img" aria-label="testnet">🧪</span> Monad Testnet - No Chainlink
          </div>
        </div>
      )}

              {/* Spin ve Claim Butonları */}
        <div className="w-full flex flex-col items-center gap-3 px-4 mb-6">
          <GameButtons
            isConnected={isConnected}
            isLoading={isLoading}
            canSpin={!isPaused && !isLoading && !(activeNetwork === 'base' ? baseSpinState.isSpinning : monadSpinState.isSpinning) && isOnCorrectNetwork()}
            canClaim={!!userData && parseFloat(userData.claimable) > 0 && !isLoading && isOnCorrectNetwork()}
            claimableAmount={userData ? userData.claimable : '0'}
            claimedAmount={userData ? userData.claimed : '0'}
            spinPrice={spinPrice}
            network={activeNetwork}
            onConnect={connectFarcaster}
            onSpin={enhancedSpin}
            onClaim={async () => {
              try {
                await claim();
                console.log('✅ Claim transaction sent successfully');
                
                // Refresh data after claim for Monad network
                if (activeNetwork === 'monad' && refreshData) {
                  setTimeout(() => {
                    console.log('🔄 Refreshing Monad data after claim...');
                    refreshData();
                  }, 3000); // 3 saniye sonra refresh et
                }
              } catch (error) {
                console.error('❌ Claim transaction failed:', error);
              }
            }}
            spinState={activeNetwork === 'base' ? baseSpinState : monadSpinState}
          />
        </div>

      {/* Share Button */}
      <div className="w-full flex justify-center px-4">
        <ShareButton 
          variant="outline" 
          size="lg" 
          className="w-full max-w-sm"
        />
      </div>

      {/* Game Information Panel */}
      <GameInfo 
        totalPool={parseFloat(prizePool).toFixed(4)} 
        jackpot={parseFloat(jackpotPool).toFixed(4)} 
      />
    </div>
  );
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<MainApp />} />
        <Route path="/share" element={<SharePage />} />
      </Routes>
    </Router>
  );
}

export default App; 
