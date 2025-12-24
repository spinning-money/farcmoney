import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { useFarcaster } from './hooks/useFarcaster';
import { useSpinEvents } from './hooks/useSpinEvents';
import { useFarcasterWallet } from './hooks/useFarcasterWallet';
import { useChainId } from 'wagmi';
import SpinWheel from './components/SpinWheel';
import GameButtons from './components/GameButtons';
import ShareButton from './components/ShareButton';
import SharePage from './components/SharePage';
import GameInfo from './components/GameInfo';
import DiceGame from './components/DiceGame';

function MainApp() {
  const chainId = useChainId();
  const location = useLocation();
  
  // Initialize Farcaster wallet detection
  const { 
    address, 
    isConnected, 
    isFarcasterEnvironment, 
    connectFarcaster 
  } = useFarcasterWallet();
  
  // Initialize Base network hook
  const {
    isLoading,
    prizePool,
    jackpotPool,
    spinPrice,
    isPaused,
    userData,
    spin,
    claim,
  } = useFarcaster();
  
  // Base network state
  const { spinState, startSpin, setSpinState } = useSpinEvents(address, () => {
    console.log('🔄 Refreshing Base user data...');
  });
  
  // Check if wallet is on correct network
  const isOnCorrectNetwork = () => {
    return chainId === 8453; // Base mainnet
  };
  
  // Create spin function
  const handleSpin = async () => {
    setSpinState({
      isSpinning: false,
      targetAngle: 0,
      prizeIndex: undefined,
      resultReceived: false
    });
    
    startSpin();
    
    try {
      await spin();
      console.log('✅ Spin transaction sent successfully');
    } catch (error) {
      console.error('❌ Spin transaction failed:', error);
      setSpinState(prev => ({
        ...prev,
        isSpinning: false,
        resultReceived: false
      }));
    }
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-[#181A20] to-[#232946] flex flex-col items-center justify-start pb-24 pt-safe-top">
      {/* Üst Bilgi */}
      <div className="w-full flex flex-col items-center pt-4 pb-4 px-4 relative">
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

      {/* Çark */}
      <div className="w-full flex justify-center items-center mb-6">
        <SpinWheel 
          spinState={spinState} 
          totalPool={parseFloat(prizePool).toFixed(4)} 
          jackpot={parseFloat(jackpotPool).toFixed(4)} 
          network="base"
        />
      </div>

      {/* Chainlink VRF etiketi */}
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

      {/* Spin ve Claim Butonları */}
      <div className="w-full flex flex-col items-center gap-3 px-4 mb-6">
        <GameButtons
          isConnected={isConnected}
          isLoading={isLoading}
          canSpin={!isPaused && !isLoading && !spinState.isSpinning && isOnCorrectNetwork()}
          canClaim={!!userData && parseFloat(userData.claimable) > 0 && !isLoading && isOnCorrectNetwork()}
          claimableAmount={userData ? userData.claimable : '0'}
          claimedAmount={userData ? userData.claimed : '0'}
          spinPrice={spinPrice}
          network="base"
          onConnect={connectFarcaster}
          onSpin={handleSpin}
          onClaim={async () => {
            try {
              await claim();
              console.log('✅ Claim transaction sent successfully');
            } catch (error) {
              console.error('❌ Claim transaction failed:', error);
            }
          }}
          spinState={spinState}
          showResult={false}
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

      {/* Fixed Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-gradient-to-r from-orange-500/10 via-red-500/10 to-pink-500/10 backdrop-blur-xl border-t border-orange-400/30 shadow-2xl z-50 pb-safe-bottom">
        <div className="w-full flex justify-center py-3 px-4">
          <div className="flex gap-1 max-w-md w-full">
            <a
              href="/"
              className={`flex-1 px-4 py-3 rounded-xl transition-all duration-300 text-sm font-semibold flex items-center justify-center gap-2 ${
                location.pathname === '/'
                  ? 'text-white bg-gradient-to-r from-emerald-500/30 to-teal-500/30 border border-emerald-400/50 shadow-lg scale-105'
                  : 'text-white/70 hover:text-white hover:bg-emerald-500/20 hover:scale-102'
              }`}
            >
              <span className="text-lg">🎰</span>
              <span>Spin</span>
            </a>
            <a
              href="/dice"
              className={`flex-1 px-4 py-3 rounded-xl transition-all duration-300 text-sm font-semibold flex items-center justify-center gap-2 ${
                location.pathname === '/dice'
                  ? 'text-white bg-gradient-to-r from-amber-500/30 to-yellow-500/30 border border-amber-400/50 shadow-lg scale-105'
                  : 'text-white/70 hover:text-white hover:bg-amber-500/20 hover:scale-102'
              }`}
            >
              <span className="text-lg">🎲</span>
              <span>Dice</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<MainApp />} />
        <Route path="/share" element={<SharePage />} />
        <Route path="/dice" element={<DiceGame />} />
      </Routes>
    </Router>
  );
}

export default App; 
