import React, { useState, useEffect } from 'react';
import { useWheelSound } from '../hooks/useWheelSound';

enum BetLevel { MINI = 0, SMALL = 1, MEDIUM = 2, LARGE = 3, MEGA = 4 }
enum DiceGameType { LUCKY_7 = 0, HIGH_ROLLER = 1, SNAKE_EYES = 2, DOUBLE_OR_NOTHING = 3 }

const DiceGameDemo: React.FC = () => {
  const { playButtonClick, playWinSound, playLoseSound } = useWheelSound();
  
  const [selectedBet, setSelectedBet] = useState<BetLevel>(BetLevel.SMALL);
  const [selectedGame, setSelectedGame] = useState<DiceGameType>(DiceGameType.LUCKY_7);
  const [isRolling, setIsRolling] = useState(false);
  const [dice1, setDice1] = useState(1);
  const [dice2, setDice2] = useState(1);
  const [lastResult, setLastResult] = useState<{won: boolean, payout: string} | null>(null);
  
  const betLevels = [
    { 
      level: BetLevel.MINI, 
      name: 'Mini', 
      amount: '0.00001 ETH', 
      color: 'from-blue-500 to-blue-600',
      bgColor: 'bg-blue-500/20',
      borderColor: 'border-blue-400/50'
    },
    { 
      level: BetLevel.SMALL, 
      name: 'Small', 
      amount: '0.00003 ETH', 
      color: 'from-green-500 to-green-600',
      bgColor: 'bg-green-500/20',
      borderColor: 'border-green-400/50'
    },
    { 
      level: BetLevel.MEDIUM, 
      name: 'Medium', 
      amount: '0.0001 ETH', 
      color: 'from-yellow-500 to-yellow-600',
      bgColor: 'bg-yellow-500/20',
      borderColor: 'border-yellow-400/50'
    },
    { 
      level: BetLevel.LARGE, 
      name: 'Large', 
      amount: '0.0005 ETH', 
      color: 'from-orange-500 to-orange-600',
      bgColor: 'bg-orange-500/20',
      borderColor: 'border-orange-400/50'
    },
    { 
      level: BetLevel.MEGA, 
      name: 'Mega', 
      amount: '0.001 ETH', 
      color: 'from-red-500 to-red-600',
      bgColor: 'bg-red-500/20',
      borderColor: 'border-red-400/50'
    }
  ];
  
  const gameTypes = [
    { 
      type: DiceGameType.LUCKY_7, 
      name: 'Lucky 7', 
      description: 'Roll a 7 to win!',
      payout: '5x', 
      probability: '16.67%',
      color: 'from-purple-500 to-purple-600',
      icon: '🎯'
    },
    { 
      type: DiceGameType.HIGH_ROLLER, 
      name: 'High Roller', 
      description: 'Roll 11 or 12!',
      payout: '10x', 
      probability: '8.33%',
      color: 'from-indigo-500 to-indigo-600',
      icon: '🎲'
    },
    { 
      type: DiceGameType.SNAKE_EYES, 
      name: 'Snake Eyes', 
      description: 'Roll double 1s!',
      payout: '30x', 
      probability: '2.78%',
      color: 'from-emerald-500 to-emerald-600',
      icon: '🐍'
    },
    { 
      type: DiceGameType.DOUBLE_OR_NOTHING, 
      name: 'Double or Nothing', 
      description: 'Roll any double!',
      payout: '5x', 
      probability: '16.67%',
      color: 'from-pink-500 to-pink-600',
      icon: '💎'
    }
  ];
  
  const handleRollDice = async () => {
    if (isRolling) return;
    
    playButtonClick();
    setIsRolling(true);
    setLastResult(null);
    
    // Dice rolling animation
    const rollInterval = setInterval(() => {
      setDice1(Math.floor(Math.random() * 6) + 1);
      setDice2(Math.floor(Math.random() * 6) + 1);
    }, 100);
    
    // Simulate contract call delay
    setTimeout(() => {
      clearInterval(rollInterval);
      setIsRolling(false);
      
      // Simulate win/lose logic
      const total = dice1 + dice2;
      let won = false;
      
      if (selectedGame === DiceGameType.LUCKY_7 && total === 7) won = true;
      else if (selectedGame === DiceGameType.HIGH_ROLLER && (total === 11 || total === 12)) won = true;
      else if (selectedGame === DiceGameType.SNAKE_EYES && dice1 === 1 && dice2 === 1) won = true;
      else if (selectedGame === DiceGameType.DOUBLE_OR_NOTHING && dice1 === dice2) won = true;
      
      const payout = won ? getPotentialWin() : '0';
      setLastResult({ won, payout });
      
      // Play result sound
      if (won) {
        playWinSound();
      } else {
        playLoseSound();
      }
    }, 2000);
  };
  
  const getCurrentBetAmount = () => {
    const amounts = ['0.00001', '0.00003', '0.0001', '0.0005', '0.001'];
    return amounts[selectedBet];
  };
  
  const getCurrentMultiplier = () => {
    const multipliers = [5, 10, 30, 5];
    return multipliers[selectedGame];
  };
  
  const getPotentialWin = () => {
    const betAmount = parseFloat(getCurrentBetAmount());
    const multiplier = getCurrentMultiplier();
    return (betAmount * multiplier).toFixed(6);
  };
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#181A20] to-[#232946] p-4">
      <div className="max-w-4xl mx-auto">
        
        {/* Navigation Bar */}
        <div className="w-full flex justify-center pt-4 pb-6">
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-2 border border-white/20">
            <div className="flex gap-2">
              <a
                href="/"
                className="px-4 py-2 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-all duration-200 text-sm font-medium"
              >
                🎰 Spin Wheel
              </a>
              <a
                href="/dice"
                className="px-4 py-2 rounded-lg text-white bg-white/20 transition-all duration-200 text-sm font-medium"
              >
                🎲 Dice Games
              </a>
            </div>
          </div>
        </div>
        
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-green-300 to-blue-400 mb-2">
            🎲 Dice Games (Demo)
          </h1>
          <p className="text-blue-200/80">Roll the dice and win big on Base!</p>
          <div className="mt-4 p-4 bg-yellow-500/20 border border-yellow-400/50 rounded-xl">
            <p className="text-yellow-200 text-sm">
              🚧 <strong>Demo Mode:</strong> This is a preview of the dice game interface. 
              Contract deployment required for real gameplay.
            </p>
          </div>
        </div>
        
        {/* Bet Level Selector */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-white mb-4 text-center">Choose Your Bet Level</h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {betLevels.map((bet) => (
              <button
                key={bet.level}
                onClick={() => setSelectedBet(bet.level)}
                className={`p-4 rounded-xl border-2 transition-all duration-200 ${
                  selectedBet === bet.level
                    ? `${bet.bgColor} ${bet.borderColor} border-2 shadow-lg scale-105`
                    : 'bg-white/5 border-white/20 hover:bg-white/10'
                }`}
              >
                <div className="text-center">
                  <div className={`text-lg font-bold bg-gradient-to-r ${bet.color} bg-clip-text text-transparent`}>
                    {bet.name}
                  </div>
                  <div className="text-sm text-white/80 mt-1">{bet.amount}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
        
        {/* Game Type Selector */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-white mb-4 text-center">Choose Your Game</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {gameTypes.map((game) => (
              <button
                key={game.type}
                onClick={() => setSelectedGame(game.type)}
                className={`p-6 rounded-xl border-2 transition-all duration-200 ${
                  selectedGame === game.type
                    ? `bg-gradient-to-br ${game.color} border-white/50 shadow-xl scale-105`
                    : 'bg-white/5 border-white/20 hover:bg-white/10'
                }`}
              >
                <div className="text-center">
                  <div className="text-3xl mb-2">{game.icon}</div>
                  <div className="text-lg font-bold text-white mb-1">{game.name}</div>
                  <div className="text-sm text-white/80 mb-2">{game.description}</div>
                  <div className="text-xs text-white/60">
                    Payout: <span className="text-yellow-300 font-semibold">{game.payout}</span> | 
                    Chance: <span className="text-green-300 font-semibold">{game.probability}</span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
        
        {/* Dice Display */}
        <div className="mb-8">
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-white/20">
            <div className="flex justify-center items-center gap-8 mb-6">
              {/* Die 1 */}
              <div className={`die-container ${isRolling ? 'rolling' : ''}`}>
                <div className="die bg-white rounded-xl shadow-2xl border-4 border-gray-300 w-20 h-20 flex items-center justify-center text-3xl font-bold text-gray-800">
                  {dice1}
                </div>
              </div>
              
              {/* Plus Sign */}
              <div className="text-4xl text-white font-bold">+</div>
              
              {/* Die 2 */}
              <div className={`die-container ${isRolling ? 'rolling' : ''}`}>
                <div className="die bg-white rounded-xl shadow-2xl border-4 border-gray-300 w-20 h-20 flex items-center justify-center text-3xl font-bold text-gray-800">
                  {dice2}
                </div>
              </div>
              
              {/* Equals Sign */}
              <div className="text-4xl text-white font-bold">=</div>
              
              {/* Total */}
              <div className="total-display bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl shadow-2xl w-20 h-20 flex items-center justify-center text-3xl font-bold text-white">
                {dice1 + dice2}
              </div>
            </div>
            
            {/* Game Info */}
            <div className="text-center">
              <div className="text-white/80 mb-2">
                <span className="font-semibold">Current Bet:</span> {getCurrentBetAmount()} ETH
              </div>
              <div className="text-white/80 mb-4">
                <span className="font-semibold">Potential Win:</span> {getPotentialWin()} ETH
              </div>
            </div>
          </div>
        </div>
        
        {/* Roll Button */}
        <div className="text-center mb-8">
          <button
            onClick={handleRollDice}
            disabled={isRolling}
            className={`px-12 py-6 rounded-2xl font-bold text-2xl transition-all duration-200 ${
              isRolling
                ? 'bg-gray-600 text-gray-300 cursor-not-allowed'
                : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-xl hover:shadow-2xl hover:scale-105 active:scale-95'
            }`}
          >
            {isRolling ? '🎲 Rolling...' : '🎲 ROLL DICE (Demo)'}
          </button>
        </div>
        
        {/* Result Display */}
        {lastResult && (
          <div className={`text-center p-6 rounded-xl ${
            lastResult.won 
              ? 'bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-400/50' 
              : 'bg-gradient-to-r from-red-500/20 to-pink-500/20 border border-red-400/50'
          }`}>
            <div className="text-4xl mb-2">{lastResult.won ? '🎉' : '😔'}</div>
            <div className="text-2xl font-bold text-white mb-2">
              {lastResult.won ? 'You Won!' : 'Better Luck Next Time!'}
            </div>
            {lastResult.won && (
              <div className="text-xl text-green-300 font-semibold">
                Won: {lastResult.payout} ETH
              </div>
            )}
          </div>
        )}
        
      </div>
    </div>
  );
};

export default DiceGameDemo;
