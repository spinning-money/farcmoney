import React, { useEffect, useState, useRef } from 'react';
import { SpinState } from '../hooks/useSpinEvents';
import { MonadSpinEvent } from '../hooks/useMonadEvents';
import { useWheelSound } from '../hooks/useWheelSound';

// Base network prizes (ETH)
const BASE_PRIZES = [
  { name: '0.05 ETH', color: '#FF6B6B', value: 0.05 },
  { name: '0.01 ETH', color: '#FF8C42', value: 0.01 },
  { name: '0.005 ETH', color: '#6BCF7F', value: 0.005 },
  { name: '0.0025 ETH', color: '#4D96FF', value: 0.0025 },
  { name: '0.0005 ETH', color: '#9B59B6', value: 0.0005 },
  { name: '0.00005 ETH', color: '#E67E22', value: 0.00005 },
  { name: 'Try Again', color: '#E74C3C', value: 0 }
];

// Monad network prizes (MON) - Contract prize table ile uyumlu
const MONAD_PRIZES = [
  { name: '10 MON', color: '#FF6B6B', value: 10 },      // index 0 - 10 MON (0.1%)
  { name: '5 MON', color: '#FF8C42', value: 5 },        // index 1 - 5 MON (0.1%)
  { name: '2 MON', color: '#6BCF7F', value: 2 },        // index 2 - 2 MON (0.2%)
  { name: '1 MON', color: '#4D96FF', value: 1 },        // index 3 - 1 MON (0.5%)
  { name: '0.5 MON', color: '#9B59B6', value: 0.5 },    // index 4 - 0.5 MON (1%)
  { name: '0.2 MON', color: '#E67E22', value: 0.2 },    // index 5 - 0.2 MON (5%)
  { name: 'Try Again', color: '#E74C3C', value: 0 }     // index 6 - Try Again (93.1%)
];

interface SpinWheelProps {
  spinState: SpinState;
  totalPool: string;
  jackpot: string;
  network: 'base' | 'monad';
  monadSpinResult?: MonadSpinEvent | null;
  onResultProcessed?: () => void;
  monadSpinning?: boolean;
  onMonadSpinComplete?: () => void;
  onSpinCancel?: () => void;
}

const SpinWheel = ({ spinState, totalPool, jackpot, network, monadSpinResult, onResultProcessed, monadSpinning, onMonadSpinComplete, onSpinCancel }: SpinWheelProps) => {
  const [pulseScale, setPulseScale] = useState(1);
  const [localSpinState, setLocalSpinState] = useState(spinState);
  const { playWheelSound, stopWheelSound, setSpeed, playWinSound, playLoseSound } = useWheelSound();
  
  // Mobile-first: çark genişliği ekrana göre
  const size = network === 'base' ? Math.min(window.innerWidth * 0.85, 360) : Math.min(window.innerWidth * 0.85, 400);
  const center = size / 2;
  const radius = network === 'base' ? size / 2 - 8 : center - 20;
  const segmentAngle = network === 'base' ? 360 / 7 : 360 / 7;

  // Calculate target angle based on prize index (same as Base)
  const calculateTargetAngle = (prizeIndex: number): number => {
    const segmentCenterAngle = (prizeIndex + 0.5) * segmentAngle;
    let minRotations = 4 + Math.random() * 2; // 4-6 rotations for Base
    
    // Monad için daha fazla tur (5-7 tur)
    if (network === 'monad') {
      minRotations = 5 + Math.random() * 2; // 5-7 rotations for Monad
    }
    
    const baseRotation = minRotations * 360;
    const targetAngle = baseRotation + (360 - segmentCenterAngle);
    return targetAngle;
  };

  // Handle Monad spin result - same logic as Base
  useEffect(() => {
    if (network === 'monad' && monadSpinResult && localSpinState.isSpinning) {
      console.log('🎯 Monad result received:', { reward: monadSpinResult.reward, prizeIndex: monadSpinResult.prizeIndex });
      
      const targetAngle = calculateTargetAngle(monadSpinResult.prizeIndex);
      
      // Don't immediately set resultReceived to true - let it spin more
      // Just store the target angle and prize index for later
      setLocalSpinState(prev => ({
        ...prev,
        targetAngle,
        prizeIndex: monadSpinResult.prizeIndex
        // Don't set resultReceived: true yet
      }));

      // Let it spin for 3 more seconds before showing the result (daha uzun süre)
      setTimeout(() => {
        setLocalSpinState(prev => ({
          ...prev,
          resultReceived: true
        }));
        
        // Then stop after final animation
        setTimeout(() => {
          setLocalSpinState(prev => ({
            ...prev,
            isSpinning: false
          }));
          stopWheelSound(); // Stop wheel sound immediately when animation completes
          onMonadSpinComplete?.();
        }, 3000); // 3 seconds for final animation (daha uzun)
      }, 3000); // 3 seconds of extra spinning after result (daha uzun)
    }
  }, [monadSpinResult, network, segmentAngle, onMonadSpinComplete, stopWheelSound]);
  


  // Sync localSpinState with spinState for both networks
  useEffect(() => {
    setLocalSpinState(spinState);
    
    // Start wheel sound when Base network starts spinning
    if (network === 'base' && spinState.isSpinning && !localSpinState.isSpinning) {
      playWheelSound();
    }
    
    // Stop wheel sound when Base network stops spinning (including cancellation)
    if (network === 'base' && !spinState.isSpinning && localSpinState.isSpinning) {
      stopWheelSound();
      // Notify parent about spin cancellation
      onSpinCancel?.();
    }
  }, [spinState, network, localSpinState.isSpinning, playWheelSound, stopWheelSound, onSpinCancel]);

  // Handle wallet popup interruptions
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && localSpinState.isSpinning) {
        console.log('👁️ Page hidden (wallet popup) - pausing wheel sound');
        stopWheelSound();
      } else if (!document.hidden && localSpinState.isSpinning) {
        console.log('👁️ Page visible again - resuming wheel sound');
        playWheelSound();
      }
    };

    const handleFocusChange = () => {
      if (!document.hasFocus() && localSpinState.isSpinning) {
        console.log('🎯 Window lost focus (wallet popup) - pausing wheel sound');
        stopWheelSound();
      } else if (document.hasFocus() && localSpinState.isSpinning) {
        console.log('🎯 Window regained focus - resuming wheel sound');
        playWheelSound();
      }
    };

    // Listen for visibility and focus changes
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleFocusChange);
    window.addEventListener('focus', handleFocusChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleFocusChange);
      window.removeEventListener('focus', handleFocusChange);
    };
  }, [localSpinState.isSpinning, playWheelSound, stopWheelSound]);

  // Force stop sound when component unmounts or network changes
  useEffect(() => {
    return () => {
      stopWheelSound();
    };
  }, [stopWheelSound]);

  // Start spinning for Monad (same as Base startSpin)
  useEffect(() => {
    if (network === 'monad' && monadSpinning && !localSpinState.isSpinning) {
      console.log('🎰 Starting Monad spin animation...');
      setLocalSpinState(prev => ({
        ...prev,
        isSpinning: true,
        resultReceived: false,
        prizeIndex: undefined
      }));
      // Start wheel sound
      playWheelSound();
      
      // Set a timeout to force stop if no result received within 30 seconds
      const timeoutId = setTimeout(() => {
        if (localSpinState.isSpinning && !localSpinState.resultReceived) {
          console.log('⏰ Monad spin timeout - forcing stop');
          setLocalSpinState(prev => ({
            ...prev,
            isSpinning: false,
            resultReceived: true
          }));
          stopWheelSound();
          onMonadSpinComplete?.();
        }
      }, 30000); // 30 seconds timeout
      
      // Clean up timeout when component unmounts or state changes
      return () => clearTimeout(timeoutId);
    }
    
    // Stop sound when Monad spinning stops
    if (network === 'monad' && !monadSpinning && localSpinState.isSpinning) {
      stopWheelSound();
    }
    
    // Stop sound when Base spinning stops
    if (network === 'base' && !spinState.isSpinning && localSpinState.isSpinning) {
      stopWheelSound();
    }
  }, [network, monadSpinning, localSpinState.isSpinning, localSpinState.resultReceived, playWheelSound, stopWheelSound, onMonadSpinComplete]);

  // Pulsing animation for winning segment
  useEffect(() => {
    const PRIZES = network === 'base' ? BASE_PRIZES : MONAD_PRIZES;
    if (!localSpinState.isSpinning && localSpinState.prizeIndex !== undefined && PRIZES[localSpinState.prizeIndex]?.name !== 'Try Again') {
      const interval = setInterval(() => {
        setPulseScale(prev => prev === 1 ? 1.1 : 1);
      }, 500);
      return () => clearInterval(interval);
    }
  }, [localSpinState.isSpinning, localSpinState.prizeIndex, network]);

  // Animation logic - smooth continuous rotation
  useEffect(() => {
    let animationId: number;
    let startTime: number;
    let baseRotation = localSpinState.currentRotation || 0;

    if (localSpinState.isSpinning) {
      const animate = (currentTime: number) => {
        if (!startTime) startTime = currentTime;
        const elapsed = currentTime - startTime;
        
        if (!localSpinState.resultReceived) {
          // Continuous spinning phase
          const rotationSpeed = 0.3; // degrees per millisecond
          const newRotation = baseRotation + (elapsed * rotationSpeed);
          setLocalSpinState(prev => ({ ...prev, currentRotation: newRotation }));
          
          animationId = requestAnimationFrame(animate);
        } else {
          // Final animation to target angle
          const duration = 2000; // 2 seconds for final animation
          
          if (elapsed < duration) {
            const progress = elapsed / duration;
            const easeOut = 1 - Math.pow(1 - progress, 2); // Quadratic ease-out
            const targetRotation = localSpinState.targetAngle || 0;
            const currentRotation = baseRotation + (easeOut * (targetRotation - baseRotation));
            setLocalSpinState(prev => ({ ...prev, currentRotation }));
            
            animationId = requestAnimationFrame(animate);
          } else {
            // Animation complete
            setLocalSpinState(prev => ({ 
              ...prev, 
              currentRotation: localSpinState.targetAngle || 0,
              isSpinning: false 
            }));
            
            // Stop wheel sound immediately when animation completes
            stopWheelSound();
            
            // Notify parent that Monad spin is complete
            if (network === 'monad') {
              onMonadSpinComplete?.();
            }
          }
        }
      };
      
      animationId = requestAnimationFrame(animate);
    }

    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
    };
  }, [localSpinState.isSpinning, localSpinState.resultReceived, localSpinState.targetAngle, stopWheelSound, network, onMonadSpinComplete]);

  // Don't render result message while spinning (same as Base)


  const PRIZES = network === 'base' ? BASE_PRIZES : MONAD_PRIZES;
  const currentRotation = localSpinState.currentRotation || 0;

  const getResultMessage = () => {
    if (localSpinState.prizeIndex === undefined) return null;
    
    // Ensure prizeIndex is within bounds
    const safePrizeIndex = localSpinState.prizeIndex % PRIZES.length;
    const prize = PRIZES[safePrizeIndex];
    if (!prize) return null;

    if (prize.name === 'Try Again') {
      return {
        emoji: '😔',
        title: 'Try Again',
        subtitle: 'Better luck next time!',
        color: '#E74C3C'
      };
    }

    return {
      emoji: '🎉',
      title: `You won ${prize.name}!`,
      subtitle: `Congratulations!`,
      color: '#27AE60'
    };
  };

  // Play win/lose sound when result is shown (only once when spinning stops)
  React.useEffect(() => {
    if (!localSpinState.isSpinning && localSpinState.prizeIndex !== undefined && localSpinState.resultReceived) {
      const safePrizeIndex = localSpinState.prizeIndex % PRIZES.length;
      const prize = PRIZES[safePrizeIndex];
      
      if (prize && prize.name === 'Try Again') {
        playLoseSound();
      } else if (prize) {
        playWinSound();
      }
    }
  }, [localSpinState.isSpinning, localSpinState.resultReceived, localSpinState.prizeIndex, PRIZES, playWinSound, playLoseSound]);

  // Stop wheel sound when Monad result is received (before final animation)
  React.useEffect(() => {
    if (network === 'monad' && localSpinState.resultReceived && localSpinState.isSpinning) {
      // Stop wheel sound when result is received but wheel is still spinning (final animation)
      setTimeout(() => {
        stopWheelSound();
      }, 1000); // Stop after 1 second of final animation
    }
  }, [localSpinState.resultReceived, localSpinState.isSpinning, network, stopWheelSound]);

  const resultMessage = getResultMessage();

  // Base network için orijinal düzen
  if (network === 'base') {
    return (
      <div className="relative flex flex-col items-center w-full">
        {/* Total Pool & Jackpot Banner */}
        <div className="w-full max-w-md mx-auto bg-gradient-to-r from-blue-500 via-purple-500 to-yellow-500 rounded-lg p-3 mb-4 shadow-lg">
          <div className="flex justify-between items-center text-white">
            <div className="text-center">
              <div className="text-xs font-medium opacity-90">TOTAL POOL</div>
              <div className="text-lg font-bold">Ξ {totalPool} ETH</div>
            </div>
            <div className="text-center">
              <div className="text-xs font-medium opacity-90 flex items-center justify-center gap-1">
                JACKPOT
                <span className="text-yellow-300">🎰</span>
              </div>
              <div className="text-lg font-bold">{jackpot} ETH</div>
            </div>
          </div>
        </div>

        {/* Wheel Container - Both SVG and labels rotate together */}
        <div 
          className="relative"
          style={{
            transform: `rotate(${currentRotation}deg)`,
            transition: 'none' // We handle animation manually
          }}
        >
          {/* SVG Wheel */}
          <svg 
            width={size} 
            height={size} 
            viewBox={`0 0 ${size} ${size}`} 
            className="block"
          >
            {PRIZES.map((prize, i) => {
              const startAngle = i * segmentAngle - 90;
              const endAngle = (i + 1) * segmentAngle - 90;
              const largeArc = segmentAngle > 180 ? 1 : 0;
              const x1 = center + radius * Math.cos((startAngle * Math.PI) / 180);
              const y1 = center + radius * Math.sin((startAngle * Math.PI) / 180);
              const x2 = center + radius * Math.cos((endAngle * Math.PI) / 180);
              const y2 = center + radius * Math.sin((endAngle * Math.PI) / 180);
              const d = `M${center},${center} L${x1},${y1} A${radius},${radius} 0 ${largeArc} 1 ${x2},${y2} Z`;
              
              // Enhanced winning segment highlighting
              const isWinningSegment = localSpinState.prizeIndex !== undefined && i === localSpinState.prizeIndex && !localSpinState.isSpinning;
              const isResult = localSpinState.prizeIndex !== undefined && !localSpinState.isSpinning;
              const isTryAgain = isWinningSegment && prize.name === 'Try Again';
              const isWinningPrize = isWinningSegment && prize.name !== 'Try Again';

              // Renk ve opaklık mantığı
              let fillColor = prize.color;
              let strokeColor = '#232946';
              let opacity = 1;
              if (isResult) {
                if (isWinningPrize) {
                  fillColor = '#00FF7F'; // Canlı yeşil kazanan
                  strokeColor = '#00C46A';
                  opacity = 1;
                } else if (isTryAgain) {
                  fillColor = '#FF3B3B'; // Canlı kırmızı kaybeden
                  strokeColor = '#B80000';
                  opacity = 1;
                } else {
                  opacity = 0.4; // Diğer segmentler soluk
                }
              }

              return (
                <path
                  key={i}
                  d={d}
                  fill={fillColor}
                  stroke={strokeColor}
                  strokeWidth={isWinningSegment ? 8 : 2}
                  className="transition-all duration-500"
                  style={{
                    filter: 'none',
                    transform: isWinningSegment ? `scale(${pulseScale})` : 'scale(1)',
                    opacity,
                  }}
                />
              );
            })}
          </svg>

          {/* Segment Labels - These now rotate with the wheel */}
          {PRIZES.map((prize, i) => {
            const angle = (i + 0.5) * segmentAngle - 90;
            const x = center + (radius - 40) * Math.cos((angle * Math.PI) / 180);
            const y = center + (radius - 40) * Math.sin((angle * Math.PI) / 180);
            
            // Enhanced winning segment text highlighting
            const isWinningSegment = localSpinState.prizeIndex !== undefined && i === localSpinState.prizeIndex && !localSpinState.isSpinning;
            const isResult = localSpinState.prizeIndex !== undefined && !localSpinState.isSpinning;
            const isTryAgain = isWinningSegment && prize.name === 'Try Again';
            const isWinningPrize = isWinningSegment && prize.name !== 'Try Again';

            let textColor = 'white';
            let fontWeight = 700;
            let opacity = 1;
            if (isResult) {
              if (isWinningPrize) {
                textColor = '#00FF7F';
                fontWeight = 900;
                opacity = 1;
              } else if (isTryAgain) {
                textColor = '#FF3B3B';
                fontWeight = 900;
                opacity = 1;
              } else {
                opacity = 0.4;
              }
            }

            // Adjust font size based on text length
            let fontSize = isWinningSegment ? '16px' : '10px';

            return (
              <div
                key={i}
                className={`absolute font-bold drop-shadow-lg select-none pointer-events-none transition-all duration-500`}
                style={{
                  left: x,
                  top: y,
                  width: 70,
                  textAlign: 'center',
                  transform: `translate(-50%, -50%) scale(${isWinningSegment ? pulseScale : 1})`,
                  fontSize,
                  textShadow: isWinningSegment
                    ? '3px 3px 6px rgba(0,0,0,1), 0 0 10px #00FF7F88'
                    : '1px 1px 2px rgba(0,0,0,0.5)',
                  fontWeight,
                  color: textColor,
                  opacity,
                  lineHeight: '1.1',
                }}
              >
                {prize.name}
              </div>
            );
          })}

          {/* Token simgesi - merkez, dönen kısımda */}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-lg border-4 border-[#232946]">
            {/* Ethereum logosu SVG */}
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
              <g>
                <polygon points="16,3 28,16 16,29 4,16" fill="#627EEA"/>
                <polygon points="16,3 16,29 28,16" fill="#8FA8F6"/>
                <polygon points="16,3 16,29 4,16" fill="#3B5CA8"/>
                <polygon points="16,7 24,16 16,25 8,16" fill="#fff" fillOpacity="0.95"/>
              </g>
            </svg>
          </div>
        </div>

        {/* Pointer */}
        <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-2">
          <div className="w-0 h-0 border-l-4 border-r-4 border-b-8 border-l-transparent border-r-transparent border-b-white"></div>
        </div>

        {/* Result Display */}
        {!localSpinState.isSpinning && resultMessage && (
          <div className="absolute -bottom-16 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2">
            {/* Main result card */}
            <div className={`${resultMessage?.color === '#27AE60' ? 'bg-gradient-to-r from-green-500 to-green-600' : 'bg-gradient-to-r from-red-500 to-red-600'} text-white px-6 py-3 rounded-2xl shadow-xl border-2 border-white/20 flex flex-col items-center gap-1`}>
              <div className="text-2xl">{resultMessage?.emoji || '🎯'}</div>
              <div className="text-lg font-bold">{resultMessage?.title || 'Result'}</div>
              <div className="text-sm font-medium opacity-90">{resultMessage?.subtitle || 'Processing...'}</div>
            </div>
            {/* Glow effect */}
            <div className={`absolute inset-0 ${resultMessage?.color === '#27AE60' ? 'bg-green-400' : 'bg-red-400'} blur-xl opacity-30 rounded-2xl -z-10`}></div>
          </div>
        )}
      </div>
    );
  }

  // Monad network için yeni düzen
  return (
    <div className="relative flex flex-col items-center justify-center w-full max-w-md mx-auto">
      {/* Total Pool & Jackpot Banner */}
      <div className="w-full bg-gradient-to-r from-blue-500 via-purple-500 to-yellow-500 rounded-lg p-4 mb-6 shadow-lg">
        <div className="flex justify-between items-center text-white">
          <div className="text-center">
            <div className="text-sm font-medium opacity-90">TOTAL POOL</div>
            <div className="text-2xl font-bold">MON {totalPool}</div>
          </div>
          <div className="text-center">
            <div className="text-sm font-medium opacity-90 flex items-center justify-center gap-1">
              JACKPOT
              <span className="text-yellow-300">🎰</span>
            </div>
            <div className="text-2xl font-bold">MON {jackpot}</div>
          </div>
        </div>
      </div>

      {/* Spin Wheel */}
      <div className="relative" style={{ width: size, height: size }}>
        {/* Wheel Container - Both SVG and labels rotate together */}
        <div 
          className="relative"
          style={{
            transform: `rotate(${currentRotation}deg)`,
            transition: 'none' // We handle animation manually
          }}
        >
          {/* SVG Wheel */}
          <svg 
            width={size} 
            height={size} 
            viewBox={`0 0 ${size} ${size}`} 
            className="block"
          >
            {PRIZES.map((prize, i) => {
              const startAngle = i * segmentAngle - 90;
              const endAngle = (i + 1) * segmentAngle - 90;
              const largeArc = segmentAngle > 180 ? 1 : 0;
              const x1 = center + radius * Math.cos((startAngle * Math.PI) / 180);
              const y1 = center + radius * Math.sin((startAngle * Math.PI) / 180);
              const x2 = center + radius * Math.cos((endAngle * Math.PI) / 180);
              const y2 = center + radius * Math.sin((endAngle * Math.PI) / 180);
              const d = `M${center},${center} L${x1},${y1} A${radius},${radius} 0 ${largeArc} 1 ${x2},${y2} Z`;
              
              // Enhanced winning segment highlighting
              const safePrizeIndex = localSpinState.prizeIndex !== undefined ? localSpinState.prizeIndex % PRIZES.length : undefined;
              const isWinningSegment = safePrizeIndex !== undefined && i === safePrizeIndex && !localSpinState.isSpinning;
              const isResult = safePrizeIndex !== undefined && !localSpinState.isSpinning;
              const isTryAgain = isWinningSegment && prize.name === 'Try Again';
              const isWinningPrize = isWinningSegment && prize.name !== 'Try Again';

              // Renk ve opaklık mantığı
              let fillColor = prize.color;
              let strokeColor = '#232946';
              let opacity = 1;
              if (isResult) {
                if (isWinningPrize) {
                  fillColor = '#00FF7F'; // Canlı yeşil kazanan
                  strokeColor = '#00C46A';
                  opacity = 1;
                } else if (isTryAgain) {
                  fillColor = '#FF3B3B'; // Canlı kırmızı kaybeden
                  strokeColor = '#B80000';
                  opacity = 1;
                } else {
                  opacity = 0.4; // Diğer segmentler soluk
                }
              }

              return (
                <path
                  key={i}
                  d={d}
                  fill={fillColor}
                  stroke={strokeColor}
                  strokeWidth={isWinningSegment ? 8 : 2}
                  className="transition-all duration-500"
                  style={{
                    filter: 'none',
                    transform: isWinningSegment ? `scale(${pulseScale})` : 'scale(1)',
                    opacity,
                  }}
                />
              );
            })}
          </svg>

          {/* Segment Labels - These now rotate with the wheel */}
          {PRIZES.map((prize, i) => {
            const angle = (i + 0.5) * segmentAngle - 90;
            const x = center + (radius - 40) * Math.cos((angle * Math.PI) / 180);
            const y = center + (radius - 40) * Math.sin((angle * Math.PI) / 180);
            
            // Enhanced winning segment text highlighting
            const safePrizeIndex = localSpinState.prizeIndex !== undefined ? localSpinState.prizeIndex % PRIZES.length : undefined;
            const isWinningSegment = safePrizeIndex !== undefined && i === safePrizeIndex && !localSpinState.isSpinning;
            const isResult = safePrizeIndex !== undefined && !localSpinState.isSpinning;
            const isTryAgain = isWinningSegment && prize.name === 'Try Again';
            const isWinningPrize = isWinningSegment && prize.name !== 'Try Again';

            let textColor = 'white';
            let fontWeight = 700;
            let opacity = 1;
            if (isResult) {
              if (isWinningPrize) {
                textColor = '#00FF7F';
                fontWeight = 900;
                opacity = 1;
              } else if (isTryAgain) {
                textColor = '#FF3B3B';
                fontWeight = 900;
                opacity = 1;
              } else {
                opacity = 0.4;
              }
            }

            // Adjust font size based on text length
            let fontSize = isWinningSegment ? '16px' : '12px';

            return (
              <div
                key={i}
                className={`absolute font-bold drop-shadow-lg select-none pointer-events-none transition-all duration-500`}
                style={{
                  left: x,
                  top: y,
                  width: 80,
                  textAlign: 'center',
                  transform: `translate(-50%, -50%) scale(${isWinningSegment ? pulseScale : 1})`,
                  fontSize,
                  textShadow: isWinningSegment
                    ? '3px 3px 6px rgba(0,0,0,1), 0 0 10px #00FF7F88'
                    : '1px 1px 2px rgba(0,0,0,0.5)',
                  fontWeight,
                  color: textColor,
                  opacity,
                  lineHeight: '1.1',
                }}
              >
                {prize.name}
              </div>
            );
          })}

          {/* Token simgesi - merkez, dönen kısımda */}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 bg-green-500 rounded-full flex items-center justify-center shadow-lg border-4 border-[#232946]">
            <span className="text-white font-bold text-sm transform -rotate-90">
              MON
            </span>
          </div>
        </div>

        {/* Pointer */}
        <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-2">
          <div className="w-0 h-0 border-l-4 border-r-4 border-b-8 border-l-transparent border-r-transparent border-b-white drop-shadow-lg"></div>
        </div>
      </div>

      {/* Result Display */}
      {!localSpinState.isSpinning && resultMessage && (
        <div className="absolute -bottom-20 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 z-20">
          {/* Main result card */}
          <div className={`${resultMessage?.color === '#27AE60' ? 'bg-gradient-to-r from-green-500 to-green-600' : 'bg-gradient-to-r from-red-500 to-red-600'} text-white px-6 py-3 rounded-2xl shadow-xl border-2 border-white/20 flex flex-col items-center gap-1`}>
            <div className="text-2xl">{resultMessage?.emoji || '🎯'}</div>
            <div className="text-lg font-bold">{resultMessage?.title || 'Result'}</div>
            <div className="text-sm font-medium opacity-90">{resultMessage?.subtitle || 'Processing...'}</div>
          </div>
          {/* Glow effect */}
          <div className={`absolute inset-0 ${resultMessage?.color === '#27AE60' ? 'bg-green-400' : 'bg-red-400'} blur-xl opacity-30 rounded-2xl -z-10`}></div>
        </div>
      )}
      

      

    </div>
  );
};

export default SpinWheel; 
