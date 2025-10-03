import React, { useState, useEffect, useRef } from 'react';
import { useDiceGame } from '../hooks/useDiceGame';
import { useWheelSound } from '../hooks/useWheelSound';
import { useAccount, usePublicClient } from 'wagmi';
import { decodeEventLog } from 'viem';
import { DiceGameABI } from '../contracts/DiceGame';
import { useFarcasterWallet } from '../hooks/useFarcasterWallet';
import { useLocation } from 'react-router-dom';

enum BetLevel { MINI = 0, SMALL = 1, MEDIUM = 2, LARGE = 3, MEGA = 4 }
enum DiceGameType { LUCKY_7 = 0, HIGH_ROLLER = 1, SNAKE_EYES = 2, DOUBLE_OR_NOTHING = 3 }

const DiceGame: React.FC = () => {
  const location = useLocation();
  const { rollDice, isConnected, userStats } = useDiceGame();
  const { playButtonClick, playWinSound, playLoseSound, playDiceRollStart, playDiceRollEnd } = useWheelSound();
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const { connectFarcaster, isFarcasterEnvironment } = useFarcasterWallet();
  
  const [selectedBet, setSelectedBet] = useState<BetLevel>(BetLevel.SMALL);
  const [selectedGame, setSelectedGame] = useState<DiceGameType>(DiceGameType.LUCKY_7);
  const [isRolling, setIsRolling] = useState(false);
  const [dice1, setDice1] = useState(1);
  const [dice2, setDice2] = useState(1);
  const [lastResult, setLastResult] = useState<{won: boolean, payout: string} | null>(null);
  
  // Animation states
  const [animationPhase, setAnimationPhase] = useState<'idle' | 'rolling' | 'slowdown' | 'final' | 'result'>('idle');
  
  // State for tracking transaction
  const [pendingTxHash, setPendingTxHash] = useState<string | null>(null);
  
  // Ref for roll interval
  const rollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  const betLevels = [
    { 
      level: BetLevel.MINI, 
      name: 'Mini', 
      amount: '0.00001', 
      color: 'from-green-400 to-green-500',
      icon: '🟢'
    },
    { 
      level: BetLevel.SMALL, 
      name: 'Small', 
      amount: '0.00003', 
      color: 'from-blue-400 to-blue-500',
      icon: '🔵'
    },
    { 
      level: BetLevel.MEDIUM, 
      name: 'Medium', 
      amount: '0.0001', 
      color: 'from-yellow-400 to-yellow-500',
      icon: '🟡'
    },
    { 
      level: BetLevel.LARGE, 
      name: 'Large', 
      amount: '0.0005', 
      color: 'from-orange-400 to-orange-500',
      icon: '🟠'
    },
    { 
      level: BetLevel.MEGA, 
      name: 'Mega', 
      amount: '0.001', 
      color: 'from-purple-400 to-purple-500',
      icon: '💎'
    }
  ];
  
  const handleRollDice = async () => {
    if (!isConnected || isRolling) return;
    
    playButtonClick();
    playDiceRollStart(); // 🎵 Oyun başlangıç sesi
    setIsRolling(true);
    setLastResult(null);
    setAnimationPhase('rolling');
    
    // Clear any existing interval
    if (rollIntervalRef.current) {
      clearInterval(rollIntervalRef.current);
    }
    
    // Dice rolling animation - daha hızlı yuvarlanma
    rollIntervalRef.current = setInterval(() => {
      setDice1(Math.floor(Math.random() * 6) + 1);
      setDice2(Math.floor(Math.random() * 6) + 1);
    }, 80); // 100ms'den 80ms'ye düşürdük - daha hızlı
    
    try {
      const txHash = await rollDice(selectedGame, selectedBet);
      console.log('🎲 Transaction hash received:', txHash);
      
      // Store transaction hash for polling
      setPendingTxHash(txHash);
      
      // Keep rolling animation running until we get the result
      // The polling will stop the animation after showing final result
      
    } catch (error) {
      if (rollIntervalRef.current) {
        clearInterval(rollIntervalRef.current);
        rollIntervalRef.current = null;
      }
      setIsRolling(false);
      setAnimationPhase('idle');
      console.error('Dice roll failed:', error);
    }
  };
  
  const getCurrentBetAmount = () => {
    const amounts = ['0.00001', '0.00003', '0.0001', '0.0005', '0.001'];
    return amounts[selectedBet];
  };
  
  const getCurrentMultiplier = () => {
    const multipliers = [2, 3, 4, 2]; // Lucky 7, High Roller, Snake Eyes, Double
    return multipliers[selectedGame];
  };
  
  const getPotentialWin = () => {
    const betAmount = parseFloat(getCurrentBetAmount());
    const multiplier = getCurrentMultiplier();
    return (betAmount * multiplier).toFixed(6);
  };

  // Note: New contract doesn't have claim function
  // Players receive winnings directly when they win
  
  // Poll for transaction completion and events
  useEffect(() => {
    if (!pendingTxHash || !publicClient) return;
    
    console.log('🔍 Polling for transaction completion:', pendingTxHash);
    
    const pollForCompletion = async () => {
      try {
        // Wait for transaction to be mined
        const receipt = await publicClient.waitForTransactionReceipt({
          hash: pendingTxHash as `0x${string}`,
          timeout: 30000 // 30 seconds timeout
        });
        
        console.log('✅ Transaction confirmed:', receipt);
        
        // Get the logs from the transaction
        const logs = receipt.logs;
        console.log('📋 Transaction logs:', logs);
        
        // Find DiceRolled event
        const diceRolledLog = logs.find(log => {
          try {
            const decoded = decodeEventLog({
              abi: DiceGameABI,
              data: log.data,
              topics: log.topics
            });
            return decoded.eventName === 'DiceRolled';
          } catch {
            return false;
          }
        });
        
        if (diceRolledLog) {
          const decoded = decodeEventLog({
            abi: DiceGameABI,
            data: diceRolledLog.data,
            topics: diceRolledLog.topics
          });
          
          console.log('🎉 DiceRolled event found:', decoded);
          
          // Check if this event is for the current user
          if (decoded.args && 'player' in decoded.args && typeof decoded.args.player === 'string' && decoded.args.player.toLowerCase() === address?.toLowerCase()) {
            const args = decoded.args as any;
            console.log('🎯 Event is for current user:', {
              player: args.player,
              die1: args.die1,
              die2: args.die2,
              total: args.total,
              won: args.won,
              payout: args.payout
            });
            
            // Start exciting final animation sequence
            const finalDie1 = Number(args.die1);
            const finalDie2 = Number(args.die2);
            
            console.log('🎬 Starting final animation sequence...');
            
            // Phase 1: Slow down animation (2 seconds - daha uzun yuvarlanma)
            setTimeout(() => {
              console.log('🎭 Phase 1: Slowing down...');
              setAnimationPhase('slowdown');
            }, 2000);
            
            // Phase 2: Final reveal with excitement (3 seconds)
            setTimeout(() => {
              console.log('🎯 Phase 2: Final reveal!');
              
              // Clear rolling interval immediately when setting final values
              if (rollIntervalRef.current) {
                clearInterval(rollIntervalRef.current);
                rollIntervalRef.current = null;
              }
              
              setDice1(finalDie1);
              setDice2(finalDie2);
              setAnimationPhase('final');
            }, 3500);
            
            // Phase 3: Show result (1 second later)
            setTimeout(() => {
              console.log('🎉 Phase 3: Showing result!');
              setAnimationPhase('result');
              
              // Set result from contract
              const payout = args.payout ? (Number(args.payout) / 1e18).toFixed(6) : '0';
              
              // Debug logging for win condition
              const total = finalDie1 + finalDie2;
              console.log('🎯 Contract Result:', {
                gameType: selectedGame,
                gameTypeName: ['Lucky 7', 'High Roller', 'Snake Eyes', 'Double'][selectedGame],
                die1: finalDie1,
                die2: finalDie2,
                total: total,
                won: args.won,
                payout: payout
              });
              
              // Debug: Check if result makes sense
              const gameTypeNames = ['Lucky 7', 'High Roller', 'Snake Eyes', 'Double'];
              const gameTypeName = gameTypeNames[selectedGame];
              console.log(`🔍 DEBUG: ${gameTypeName} with total ${total} - Contract says: ${args.won ? 'WON' : 'LOST'}`);
              
              // Expected win conditions for debugging
              let expectedWin = false;
              if (selectedGame === 0) { // Lucky 7
                expectedWin = total === 7 || total === 8;
              } else if (selectedGame === 1) { // High Roller
                expectedWin = total === 9 || total === 10 || total === 11;
              } else if (selectedGame === 2) { // Snake Eyes
                expectedWin = total === 2 || total === 3 || total === 4;
              } else if (selectedGame === 3) { // Double
                expectedWin = total === 5 || total === 6 || total === 7;
              }
              
              console.log(`🔍 Expected: ${expectedWin ? 'WON' : 'LOST'} | Contract: ${args.won ? 'WON' : 'LOST'} | Match: ${expectedWin === args.won ? '✅' : '❌'}`);
              
              // Use contract result directly - no frontend validation needed
              setLastResult({ won: args.won, payout: payout });
              
              // Stop rolling animation
              setIsRolling(false);
              
              // Play dice landing sound
              playDiceRollEnd(); // 🎵 Zar durma sesi
              
              // Play result sound after a short delay
              setTimeout(() => {
                if (args.won) {
                  playWinSound(); // 🎵 Kazanma sesi
                } else {
                  playLoseSound(); // 🎵 Kaybetme sesi
                }
              }, 200); // 200ms gecikme ile
            }, 4500); // Total 4.5 seconds of excitement - daha uzun yuvarlanma
          }
        } else {
          // Event not found - stop animation anyway
          console.log('⚠️ DiceRolled event not found, stopping animation');
          
          // Clear rolling interval
          if (rollIntervalRef.current) {
            clearInterval(rollIntervalRef.current);
            rollIntervalRef.current = null;
          }
          
          // Stop rolling animation
          setIsRolling(false);
          setAnimationPhase('idle');
          
          // Show error message
          setLastResult({ won: false, payout: '0' });
        }
        
        // Clear pending transaction
        setPendingTxHash(null);
        
      } catch (error) {
        console.error('❌ Error polling transaction:', error);
        if (rollIntervalRef.current) {
          clearInterval(rollIntervalRef.current);
          rollIntervalRef.current = null;
        }
        setIsRolling(false);
        setPendingTxHash(null);
      }
    };
    
    pollForCompletion();
  }, [pendingTxHash, publicClient, address, playWinSound, playLoseSound]);
  
  // Cleanup interval on unmount
  useEffect(() => {
    return () => {
      if (rollIntervalRef.current) {
        clearInterval(rollIntervalRef.current);
      }
    };
  }, []);
  
  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-[#181A20] to-[#232946] flex flex-col items-center justify-start pb-8 pt-safe-top">
        
      {/* Header */}
      <div className="w-full flex flex-col items-center pt-6 pb-4 px-4 relative">
        <div className="relative">
          <h1
            className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-green-300 to-blue-400 drop-shadow-2xl text-center"
            style={{ letterSpacing: '-0.02em' }}
          >
            🎲 Dice Games
          </h1>
          <div className="absolute -inset-1 bg-gradient-to-r from-yellow-300/20 via-green-300/20 to-blue-400/20 blur-lg -z-10"></div>
        </div>
        
        <div className="mt-3 text-sm font-medium text-white/70 bg-white/5 rounded-2xl px-3 py-1.5 shadow-lg backdrop-blur-md border border-white/10">
          <span className="text-green-300">Roll</span>
          <span className="mx-2 text-white/40">•</span>
          <span className="text-yellow-300">Win</span>
          <span className="mx-2 text-white/40">•</span>
          <span className="text-pink-300">Collect</span>
        </div>
        
        {/* Wallet Info */}
        {address && (
          <div className="mt-3 bg-gradient-to-r from-green-500/90 to-emerald-500/90 text-white text-xs font-medium px-3 py-1.5 rounded-full shadow-lg backdrop-blur-sm border border-green-400/30">
            <span className="font-mono">{address.slice(0, 6)}...{address.slice(-4)}</span>
            {isFarcasterEnvironment && (
              <span className="ml-2 text-yellow-200 text-xs">✨ Farcaster</span>
            )}
          </div>
        )}
      </div>

      {/* Navigation Bar */}
      <div className="w-full flex justify-center pt-2 pb-4">
        <div className="bg-gradient-to-r from-orange-500/10 via-red-500/10 to-pink-500/10 backdrop-blur-xl rounded-2xl p-1.5 border border-orange-400/30 shadow-xl">
          <div className="flex gap-1">
            <a
              href="/"
              className={`px-4 py-2.5 rounded-xl transition-all duration-300 text-sm font-semibold flex items-center gap-2 ${
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
              className={`px-4 py-2.5 rounded-xl transition-all duration-300 text-sm font-semibold flex items-center gap-2 ${
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


        
      {/* Bet Level Selection */}
      <div className="w-full flex justify-center mb-6">
        <div className="w-full max-w-sm px-4">
          <h2 className="text-lg font-bold text-white mb-3 text-center">Bet Level</h2>
          <div className="grid grid-cols-5 gap-2">
            {betLevels.map((bet) => (
              <button
                key={bet.level}
                onClick={() => setSelectedBet(bet.level)}
                className={`p-3 rounded-2xl border transition-all duration-300 ${
                  selectedBet === bet.level
                    ? 'border-white/40 bg-white/15 shadow-xl scale-105'
                    : 'border-white/10 bg-white/5 hover:bg-white/10 hover:scale-102'
                }`}
              >
                <div className="text-center">
                  <div className="text-lg mb-1">{bet.icon}</div>
                  <div className="text-white font-bold text-xs">{bet.name}</div>
                  <div className="text-blue-200/80 text-xs font-medium">{bet.amount}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
        
      {/* Game Type Selection */}
      <div className="w-full flex justify-center mb-6">
        <div className="w-full max-w-sm px-4">
          <h2 className="text-lg font-bold text-white mb-3 text-center">Game Type</h2>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setSelectedGame(DiceGameType.LUCKY_7)}
              className={`p-3 rounded-2xl border transition-all duration-300 ${
                selectedGame === DiceGameType.LUCKY_7
                  ? 'border-green-400/50 bg-green-400/15 shadow-xl scale-105'
                  : 'border-white/10 bg-white/5 hover:bg-white/10 hover:scale-102'
              }`}
            >
              <div className="text-center">
                <div className="text-xl mb-1">🍀</div>
                <div className="text-white font-bold text-sm">Lucky 7</div>
                <div className="text-green-200/80 text-xs">Roll 7 or 8</div>
              </div>
            </button>
            
            <button
              onClick={() => setSelectedGame(DiceGameType.HIGH_ROLLER)}
              className={`p-3 rounded-2xl border transition-all duration-300 ${
                selectedGame === DiceGameType.HIGH_ROLLER
                  ? 'border-yellow-400/50 bg-yellow-400/15 shadow-xl scale-105'
                  : 'border-white/10 bg-white/5 hover:bg-white/10 hover:scale-102'
              }`}
            >
              <div className="text-center">
                <div className="text-xl mb-1">🎯</div>
                <div className="text-white font-bold text-sm">High Roller</div>
                <div className="text-yellow-200/80 text-xs">Roll 9, 10, or 11</div>
              </div>
            </button>
            
            <button
              onClick={() => setSelectedGame(DiceGameType.SNAKE_EYES)}
              className={`p-3 rounded-2xl border transition-all duration-300 ${
                selectedGame === DiceGameType.SNAKE_EYES
                  ? 'border-red-400/50 bg-red-400/15 shadow-xl scale-105'
                  : 'border-white/10 bg-white/5 hover:bg-white/10 hover:scale-102'
              }`}
            >
              <div className="text-center">
                <div className="text-xl mb-1">🐍</div>
                <div className="text-white font-bold text-sm">Snake Eyes</div>
                <div className="text-red-200/80 text-xs">Roll 2, 3, or 4</div>
              </div>
            </button>
            
            <button
              onClick={() => setSelectedGame(DiceGameType.DOUBLE_OR_NOTHING)}
              className={`p-3 rounded-2xl border transition-all duration-300 ${
                selectedGame === DiceGameType.DOUBLE_OR_NOTHING
                  ? 'border-purple-400/50 bg-purple-400/15 shadow-xl scale-105'
                  : 'border-white/10 bg-white/5 hover:bg-white/10 hover:scale-102'
              }`}
            >
              <div className="text-center">
                <div className="text-xl mb-1">⚡</div>
                <div className="text-white font-bold text-sm">Double</div>
                <div className="text-purple-200/80 text-xs">Roll 5, 6, or 7</div>
              </div>
            </button>
          </div>
        </div>
      </div>
        
      {/* Dice Display */}
      <div className="w-full flex justify-center items-center mb-6">
        <div className="flex justify-center items-center gap-6">
          <div className={`dice ${animationPhase === 'idle' ? 'idle' : ''} ${animationPhase === 'rolling' ? 'rolling' : ''} ${animationPhase === 'slowdown' ? 'slowdown' : ''} ${animationPhase === 'final' ? 'final-reveal' : ''} ${lastResult?.won ? 'win' : lastResult?.won === false ? 'lose' : ''}`}>
            <div className="dice-face" data-value={dice1}>
              {Array.from({ length: 9 }, (_, i) => (
                <div key={i} className="dot"></div>
              ))}
            </div>
          </div>
          <div className={`dice ${animationPhase === 'idle' ? 'idle' : ''} ${animationPhase === 'rolling' ? 'rolling' : ''} ${animationPhase === 'slowdown' ? 'slowdown' : ''} ${animationPhase === 'final' ? 'final-reveal' : ''} ${lastResult?.won ? 'win' : lastResult?.won === false ? 'lose' : ''}`}>
            <div className="dice-face" data-value={dice2}>
              {Array.from({ length: 9 }, (_, i) => (
                <div key={i} className="dot"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
      
      {/* Spinning Status */}
      {isRolling && (
        <div className="w-full flex justify-center mb-6">
          <div className="bg-gradient-to-r from-yellow-500/90 to-orange-500/90 text-white px-4 py-2.5 rounded-2xl shadow-xl border border-yellow-400/30 flex items-center gap-2 backdrop-blur-sm">
            <div className="animate-spin text-lg">🎲</div>
            <div className="text-sm font-bold">Rolling...</div>
            <div className="animate-pulse text-xs opacity-80">Wait</div>
          </div>
        </div>
      )}
      
      {/* Result Display */}
      {lastResult && (
        <div className="w-full flex justify-center mb-6">
          <div className="text-center">
            <div className={`text-xl font-bold mb-2 ${
              lastResult.won ? 'text-green-400 win-animation' : 'text-red-400 lose-animation'
            }`}>
              {lastResult.won ? '🎉 Won!' : '😔 Lost'}
            </div>
            <p className="text-white/80 text-sm">
              Total: {dice1 + dice2} | {lastResult.won ? `+${lastResult.payout} ETH` : `-${getCurrentBetAmount()} ETH`}
            </p>
            <p className="text-white/60 text-xs mt-1">
              {selectedGame === DiceGameType.LUCKY_7 && 'Lucky 7: Roll 7 or 8 to win'}
              {selectedGame === DiceGameType.HIGH_ROLLER && 'High Roller: Roll 9, 10, or 11 to win'}
              {selectedGame === DiceGameType.SNAKE_EYES && 'Snake Eyes: Roll 2, 3, or 4 to win'}
              {selectedGame === DiceGameType.DOUBLE_OR_NOTHING && 'Double: Roll 5, 6, or 7 to win'}
            </p>
            {lastResult.won && (
              <p className="text-green-400 text-xs mt-2 font-semibold">
                💰 Winnings sent directly to your wallet!
              </p>
            )}
          </div>
        </div>
      )}
        
      {/* Game Info */}
      <div className="w-full flex justify-center mb-6">
        <div className="w-full max-w-sm px-4">
          <div className="grid grid-cols-2 gap-3">
            {/* Current Bet Info */}
            <div className="bg-white/5 rounded-2xl p-3 border border-white/10 text-center backdrop-blur-sm">
              <div className="text-white font-bold text-sm mb-1">Current Bet</div>
              <div className="text-blue-200 text-sm font-semibold">{getCurrentBetAmount()} ETH</div>
              <div className="text-white font-bold text-sm mt-2 mb-1">Potential Win</div>
              <div className="text-green-200 text-sm font-semibold">{getPotentialWin()} ETH</div>
            </div>
            
            {/* User Stats */}
            {userStats && (
              <div className="bg-white/5 rounded-2xl p-3 border border-white/10 text-center backdrop-blur-sm">
                <div className="text-white font-bold text-sm mb-2">Your Stats</div>
                <div className="space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="text-blue-200/80 text-xs">Games:</span>
                    <span className="text-white text-xs font-semibold">{userStats.totalGames}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-green-200/80 text-xs">Wins:</span>
                    <span className="text-white text-xs font-semibold">{userStats.totalWins}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-yellow-200/80 text-xs">Wagered:</span>
                    <span className="text-white text-xs font-semibold">{userStats.totalWagered} ETH</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-pink-200/80 text-xs">Won:</span>
                    <span className="text-white text-xs font-semibold">{userStats.totalWon} ETH</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Note: New contract pays winnings directly - no claim needed */}
      
      {/* Roll Button */}
      <div className="w-full flex flex-col items-center gap-3 mb-6 px-4">
        <button
          onClick={!isConnected ? connectFarcaster : handleRollDice}
          disabled={isRolling}
          className={`w-full max-w-xs px-6 py-3.5 rounded-2xl font-bold text-base transition-all duration-300 ${
            !isConnected
              ? 'bg-gradient-to-r from-blue-500/90 to-purple-500/90 text-white hover:from-blue-600 hover:to-purple-600 transform hover:scale-105 shadow-xl'
              : isRolling
              ? 'bg-yellow-500/90 text-white animate-pulse shadow-xl'
              : 'bg-gradient-to-r from-green-500/90 to-blue-500/90 text-white hover:from-green-600 hover:to-blue-600 transform hover:scale-105 shadow-xl'
          }`}
        >
          {!isConnected ? '🔗 Connect Wallet' : isRolling ? 'Rolling...' : '🎲 Roll Dice'}
        </button>
      </div>
      
      {/* Connection Status */}
      {!isConnected && (
        <div className="w-full flex justify-center px-4">
          <p className="text-blue-400/80 text-sm text-center">Connect your wallet to start playing dice games!</p>
        </div>
      )}

      {/* Detailed Game Description - Sayfanın En Altı */}
      <div className="w-full flex justify-center mt-8 mb-6">
        <div className="w-full max-w-2xl px-4">
          <div className="bg-gradient-to-br from-slate-800/80 via-slate-900/90 to-slate-800/80 backdrop-blur-xl rounded-2xl border border-white/10 shadow-2xl overflow-hidden">
            
            {/* Header */}
            <div className="bg-gradient-to-r from-purple-600/20 via-blue-600/20 to-emerald-600/20 border-b border-white/10 px-4 py-3">
              <div className="flex items-center justify-center gap-2">
                <div className="text-xl">🎲</div>
                <h2 className="text-lg font-bold text-white">Dice Game Rules & Information</h2>
                <div className="text-xl">🎯</div>
              </div>
            </div>

            <div className="p-6 space-y-6">
              
              {/* How to Play */}
              <div className="bg-gradient-to-br from-blue-500/10 to-blue-600/20 rounded-xl p-4 border border-blue-500/20">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                    <span className="text-white font-bold text-sm">🎮</span>
                  </div>
                  <div>
                    <h3 className="text-white font-semibold text-sm">How to Play</h3>
                    <p className="text-blue-200/70 text-xs">Simple and exciting dice game</p>
                  </div>
                </div>
                 <div className="text-blue-200/80 text-xs leading-relaxed space-y-2">
                   <p>• <span className="font-semibold">Choose your bet level:</span> Mini (0.00001 ETH) to Mega (0.001 ETH)</p>
                   <p>• <span className="font-semibold">Select game type:</span> Each has different winning conditions and payouts</p>
                   <p>• <span className="font-semibold">Roll the dice:</span> Watch the exciting 3D animation</p>
                   <p>• <span className="font-semibold">Win or lose:</span> Get instant results and payouts</p>
                   <p>• <span className="font-semibold text-green-400">💰 Instant Payouts:</span> Winnings are sent directly to your wallet - no claim needed!</p>
                 </div>
              </div>

              {/* Game Types */}
              <div className="bg-gradient-to-br from-green-500/10 to-green-600/20 rounded-xl p-4 border border-green-500/20">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                    <span className="text-white font-bold text-sm">🎯</span>
                  </div>
                  <div>
                    <h3 className="text-white font-semibold text-sm">Game Types & Odds</h3>
                    <p className="text-green-200/70 text-xs">Different winning conditions</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-3 text-xs">
                  <div className="bg-green-500/20 rounded-lg p-3 border border-green-500/30">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-green-300 font-semibold">🍀 Lucky 7</span>
                      <span className="text-green-200/80">2x Payout</span>
                    </div>
                    <div className="text-green-200/70">Roll 7 or 8 to win</div>
                  </div>
                  <div className="bg-green-500/20 rounded-lg p-3 border border-green-500/30">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-green-300 font-semibold">🎯 High Roller</span>
                      <span className="text-green-200/80">3x Payout</span>
                    </div>
                    <div className="text-green-200/70">Roll 9, 10, or 11 to win</div>
                  </div>
                  <div className="bg-green-500/20 rounded-lg p-3 border border-green-500/30">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-green-300 font-semibold">🐍 Snake Eyes</span>
                      <span className="text-green-200/80">4x Payout</span>
                    </div>
                    <div className="text-green-200/70">Roll 2, 3, or 4 to win</div>
                  </div>
                  <div className="bg-green-500/20 rounded-lg p-3 border border-green-500/30">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-green-300 font-semibold">⚡ Double</span>
                      <span className="text-green-200/80">2x Payout</span>
                    </div>
                    <div className="text-green-200/70">Roll 5, 6, or 7 to win</div>
                  </div>
                </div>
              </div>

              {/* Provably Fair */}
              <div className="bg-gradient-to-br from-orange-500/10 to-orange-600/20 rounded-xl p-4 border border-orange-500/20">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center">
                    <span className="text-white font-bold text-sm">🔒</span>
                  </div>
                  <div>
                    <h3 className="text-white font-semibold text-sm">Provably Fair Gaming</h3>
                    <p className="text-orange-200/70 text-xs">Transparent and verifiable</p>
                  </div>
                </div>
                 <div className="text-orange-200/80 text-xs leading-relaxed space-y-2">
                   <p>• <span className="font-semibold">Blockchain Randomness:</span> Uses on-chain random number generation</p>
                   <p>• <span className="font-semibold">No Manipulation:</span> Results cannot be predicted or influenced</p>
                   <p>• <span className="font-semibold">Transparent:</span> All transactions are publicly verifiable</p>
                   <p>• <span className="font-semibold text-green-400">⚡ Instant Payouts:</span> Winnings are sent directly to your wallet - no claim button needed!</p>
                 </div>
              </div>

              {/* Fees & Costs */}
              <div className="bg-gradient-to-br from-purple-500/10 to-purple-600/20 rounded-xl p-4 border border-purple-500/20">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center">
                    <span className="text-white font-bold text-sm">💰</span>
                  </div>
                  <div>
                    <h3 className="text-white font-semibold text-sm">Fees & Costs</h3>
                    <p className="text-purple-200/70 text-xs">Transparent pricing</p>
                  </div>
                </div>
                <div className="text-purple-200/80 text-xs leading-relaxed space-y-2">
                  <p>• <span className="font-semibold">Game Fee:</span> 0.000015 ETH per game (goes to platform)</p>
                  <p>• <span className="font-semibold">Bet Amount:</span> Your chosen bet level (0.00001 - 0.001 ETH)</p>
                  <p>• <span className="font-semibold">Total Cost:</span> Bet Amount + Game Fee</p>
                  <p>• <span className="font-semibold">House Edge:</span> 5% on bet amount (standard for fair gaming)</p>
                </div>
              </div>

              {/* Safety Notice */}
              <div className="bg-gradient-to-br from-red-500/10 to-red-600/20 rounded-xl p-4 border border-red-500/20">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center">
                    <span className="text-white font-bold text-sm">⚠️</span>
                  </div>
                  <div>
                    <h3 className="text-white font-semibold text-sm">Important Notice</h3>
                    <p className="text-red-200/70 text-xs">Play responsibly</p>
                  </div>
                </div>
                <div className="text-red-200/80 text-xs leading-relaxed">
                  <p>This is a gambling game. Only bet what you can afford to lose. The house always has an edge, and past results do not guarantee future outcomes. Play for entertainment purposes only.</p>
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DiceGame;
