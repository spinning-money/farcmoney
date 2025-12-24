import React, { useEffect, useState } from 'react';
import { SpinState } from '../hooks/useSpinEvents';
import { useWheelSound } from '../hooks/useWheelSound';

// Base network prizes (ETH)
const PRIZES = [
  { name: '0.05 ETH', color: '#FF6B6B', value: 0.05 },
  { name: '0.01 ETH', color: '#FF8C42', value: 0.01 },
  { name: '0.005 ETH', color: '#6BCF7F', value: 0.005 },
  { name: '0.0025 ETH', color: '#4D96FF', value: 0.0025 },
  { name: '0.0005 ETH', color: '#9B59B6', value: 0.0005 },
  { name: '0.00005 ETH', color: '#E67E22', value: 0.00005 },
  { name: 'Try Again', color: '#E74C3C', value: 0 }
];

interface SpinWheelProps {
  spinState: SpinState;
  totalPool: string;
  jackpot: string;
  network: 'base';
}

const SpinWheel = ({ spinState, totalPool, jackpot, network }: SpinWheelProps) => {
  const [pulseScale, setPulseScale] = useState(1);
  const [localSpinState, setLocalSpinState] = useState(spinState);
  const { playWheelSound, stopWheelSound, playWinSound, playLoseSound } = useWheelSound();
  
  // Mobile-first: çark genişliği ekrana göre
  const size = Math.min(window.innerWidth * 0.85, 360);
  const center = size / 2;
  const radius = size / 2 - 8;
  const segmentAngle = 360 / 7;


  


  // Sync localSpinState with spinState
  useEffect(() => {
    setLocalSpinState(spinState);
    
    // Start wheel sound when spinning starts
    if (spinState.isSpinning && !localSpinState.isSpinning) {
      playWheelSound();
    }
    
    // Stop wheel sound when spinning stops
    if (!spinState.isSpinning && localSpinState.isSpinning) {
      stopWheelSound();
    }
  }, [spinState, localSpinState.isSpinning, playWheelSound, stopWheelSound]);

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


  // Pulsing animation for winning segment
  useEffect(() => {
    if (!localSpinState.isSpinning && localSpinState.prizeIndex !== undefined && PRIZES[localSpinState.prizeIndex]?.name !== 'Try Again') {
      const interval = setInterval(() => {
        setPulseScale(prev => prev === 1 ? 1.1 : 1);
      }, 500);
      return () => clearInterval(interval);
    }
  }, [localSpinState.isSpinning, localSpinState.prizeIndex]);

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
            
            // Stop wheel sound only when animation is completely finished
            // Don't stop sound here - let the parent handle it
            
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
  }, [localSpinState.isSpinning, localSpinState.resultReceived, localSpinState.targetAngle, stopWheelSound]);

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

  const resultMessage = getResultMessage();

  // Generate casino lights around the wheel
  const generateCasinoLights = () => {
    const numLights = 24;
    const lights = [];
    for (let i = 0; i < numLights; i++) {
      const angle = (i * 360) / numLights;
      const radian = (angle * Math.PI) / 180;
      const lightRadius = size / 2 + 15;
      const x = center + lightRadius * Math.cos(radian);
      const y = center + lightRadius * Math.sin(radian);
      
      // Alternating colors for casino effect
      const colors = ['#FFD700', '#FF8C00', '#FF6347', '#FF1493', '#00CED1', '#FF00FF'];
      const color = colors[i % colors.length];
      
      lights.push(
        <div
          key={i}
          className="casino-light"
          style={{
            left: x,
            top: y,
            background: color,
            color: color,
            transform: 'translate(-50%, -50%)',
            animationDelay: `${(i * 0.15)}s`,
          }}
        />
      );
    }
    return lights;
  };

  // Generate sparkles that appear during spinning
  const generateSparkles = () => {
    if (!localSpinState.isSpinning) return null;
    
    const sparkles = [];
    const numSparkles = 8;
    for (let i = 0; i < numSparkles; i++) {
      const angle = (i * 360) / numSparkles + (currentRotation % 360);
      const radian = (angle * Math.PI) / 180;
      const sparkleRadius = size / 2 + 30 + Math.random() * 40;
      const x = center + sparkleRadius * Math.cos(radian);
      const y = center + sparkleRadius * Math.sin(radian);
      
      sparkles.push(
        <div
          key={i}
          className="casino-sparkle"
          style={{
            left: x,
            top: y,
            '--sparkle-x': `${Math.cos(radian) * 30}px`,
            '--sparkle-y': `${Math.sin(radian) * 30}px`,
            animationDelay: `${(i * 0.25)}s`,
            animationDuration: `${1.5 + Math.random()}s`,
          } as React.CSSProperties}
        />
      );
    }
    return sparkles;
  };

  return (
      <div className="relative flex flex-col items-center w-full">
        {/* Total Pool & Jackpot Banner */}
        <div className="w-full max-w-md mx-auto bg-gradient-to-r from-blue-500 via-purple-500 to-yellow-500 rounded-lg p-3 mb-4 shadow-lg border-2 border-yellow-400/50">
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

        {/* Casino Wheel Container with lights and effects */}
        <div 
          className={`casino-wheel-container relative mx-auto ${localSpinState.isSpinning ? 'spinning' : ''}`}
          style={{
            width: size + 60,
            height: size + 60,
          }}
        >
          {/* Casino Ray Effects - Rotating background glow */}
          {localSpinState.isSpinning && (
            <>
              <div className="casino-ray" style={{ animationDuration: '3s' }} />
              <div className="casino-ray" style={{ animationDuration: '4s', animationDirection: 'reverse' }} />
            </>
          )}

          {/* Casino Lights around the wheel */}
          {generateCasinoLights()}

          {/* Sparkles during spinning */}
          {generateSparkles()}

          {/* Wheel Container - Both SVG and labels rotate together */}
          <div 
            className="relative"
            style={{
              width: size,
              height: size,
              left: 30,
              top: 30,
              transform: `rotate(${currentRotation}deg)`,
              transition: 'none', // We handle animation manually
            }}
          >
          {/* SVG Wheel */}
          <svg 
            width={size} 
            height={size} 
            viewBox={`0 0 ${size} ${size}`} 
            className="block"
            style={{
              filter: localSpinState.isSpinning 
                ? 'drop-shadow(0 0 20px rgba(255, 215, 0, 0.6)) drop-shadow(0 0 40px rgba(255, 165, 0, 0.4))'
                : 'drop-shadow(0 0 15px rgba(255, 215, 0, 0.4))',
            }}
          >
            {/* Outer glow circle */}
            <circle
              cx={center}
              cy={center}
              r={radius + 5}
              fill="none"
              stroke="url(#casinoGlow)"
              strokeWidth="3"
              opacity={localSpinState.isSpinning ? 0.8 : 0.4}
            />
            <defs>
              <linearGradient id="casinoGlow" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#FFD700" stopOpacity="1" />
                <stop offset="25%" stopColor="#FF8C00" stopOpacity="0.8" />
                <stop offset="50%" stopColor="#FF1493" stopOpacity="0.9" />
                <stop offset="75%" stopColor="#00CED1" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#FFD700" stopOpacity="1" />
              </linearGradient>
              <filter id="glow">
                <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
                <feMerge>
                  <feMergeNode in="coloredBlur"/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>
            </defs>
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
                <g key={i}>
                  {/* Glow effect for segments during spin */}
                  {localSpinState.isSpinning && (
                    <path
                      d={d}
                      fill={fillColor}
                      stroke="none"
                      opacity="0.3"
                      filter="url(#glow)"
                    />
                  )}
                  <path
                    d={d}
                    fill={fillColor}
                    stroke={strokeColor}
                    strokeWidth={isWinningSegment ? 8 : 3}
                    className="transition-all duration-500"
                    style={{
                      filter: isWinningSegment 
                        ? 'drop-shadow(0 0 10px currentColor) drop-shadow(0 0 20px currentColor)'
                        : localSpinState.isSpinning 
                        ? 'drop-shadow(0 0 5px rgba(255, 255, 255, 0.3))'
                        : 'none',
                      transform: isWinningSegment ? `scale(${pulseScale})` : 'scale(1)',
                      opacity,
                    }}
                  />
                  {/* Segment border highlight */}
                  <path
                    d={d}
                    fill="none"
                    stroke={localSpinState.isSpinning ? 'rgba(255, 255, 255, 0.4)' : 'rgba(0, 0, 0, 0.2)'}
                    strokeWidth="1"
                    opacity={localSpinState.isSpinning ? 1 : 0.5}
                  />
                </g>
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

          {/* Token simgesi - merkez, dönen kısımda - Casino style */}
          <div 
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 bg-gradient-to-br from-yellow-400 via-yellow-300 to-yellow-500 rounded-full flex items-center justify-center shadow-2xl border-4 border-yellow-600"
            style={{
              boxShadow: localSpinState.isSpinning
                ? '0 0 30px rgba(255, 215, 0, 0.8), 0 0 60px rgba(255, 165, 0, 0.6), inset 0 0 20px rgba(255, 255, 255, 0.3)'
                : '0 0 20px rgba(255, 215, 0, 0.5), inset 0 0 15px rgba(255, 255, 255, 0.2)',
            }}
          >
            {/* Glowing ring */}
            <div 
              className="absolute inset-0 rounded-full border-2 border-yellow-300"
              style={{
                boxShadow: '0 0 15px rgba(255, 215, 0, 0.8)',
                animation: localSpinState.isSpinning ? 'casinoLightRotate 2s linear infinite' : 'none',
              }}
            />
            {/* Ethereum logosu SVG */}
            <svg width="40" height="40" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className="relative z-10">
              <g>
                <polygon points="16,3 28,16 16,29 4,16" fill="#627EEA"/>
                <polygon points="16,3 16,29 28,16" fill="#8FA8F6"/>
                <polygon points="16,3 16,29 4,16" fill="#3B5CA8"/>
                <polygon points="16,7 24,16 16,25 8,16" fill="#fff" fillOpacity="0.95"/>
              </g>
            </svg>
          </div>
        </div>
        </div>

        {/* Casino Style Pointer */}
        <div className="absolute top-[30px] left-1/2 transform -translate-x-1/2 -translate-y-2 z-20">
          <div 
            className="relative"
            style={{
              filter: 'drop-shadow(0 0 10px rgba(255, 215, 0, 0.8)) drop-shadow(0 0 20px rgba(255, 165, 0, 0.6))',
            }}
          >
            {/* Main pointer */}
            <div className="w-0 h-0 border-l-[16px] border-r-[16px] border-b-[32px] border-l-transparent border-r-transparent border-b-yellow-400"></div>
            {/* Glow effect */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[14px] border-r-[14px] border-b-[28px] border-l-transparent border-r-transparent border-b-yellow-200 opacity-80"></div>
            {/* Inner highlight */}
            <div className="absolute top-[2px] left-1/2 -translate-x-1/2 w-0 h-0 border-l-[12px] border-r-[12px] border-b-[24px] border-l-transparent border-r-transparent border-b-white opacity-60"></div>
          </div>
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
};

export default SpinWheel; 
