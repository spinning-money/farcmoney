import { useCallback, useRef, useEffect } from 'react';

export const useWheelSound = () => {
  const audioContextRef = useRef<AudioContext | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isPlayingRef = useRef(false);
  const isMobileRef = useRef(false);
  const audioUnlockedRef = useRef(false);
  
  // Check if device is mobile or Farcaster mini app
  useEffect(() => {
    const userAgent = navigator.userAgent;
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
    const isFarcaster = userAgent.includes('Farcaster') || userAgent.includes('farcaster') || window.location.href.includes('farcaster');
    const isApple = /iPhone|iPad|iPod|Mac/i.test(userAgent);
    const isAndroid = /Android/i.test(userAgent);
    
    isMobileRef.current = isMobile || isFarcaster;
    console.log('📱 Device type:', isMobileRef.current ? 'Mobile/Farcaster' : 'Desktop');
    console.log('🍎 Apple device:', isApple);
    console.log('🤖 Android device:', isAndroid);
    console.log('🔍 User Agent:', userAgent);
    console.log('🔗 URL:', window.location.href);
    
    // Enhanced audio capability testing for mobile
    if (isMobile || isFarcaster) {
      console.log('🎵 Testing mobile audio capabilities...');
      
      // Test 1: Basic Audio API
      try {
        const testAudio = new Audio();
        testAudio.volume = 0;
        testAudio.play().then(() => {
          console.log('✅ Basic Audio API is supported');
        }).catch(error => {
          console.warn('⚠️ Basic Audio API failed:', error);
        });
      } catch (error) {
        console.warn('⚠️ Basic Audio API creation failed:', error);
      }
      
      // Test 2: Web Audio API
      try {
        if (window.AudioContext || (window as any).webkitAudioContext) {
          const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
          console.log('✅ Web Audio API is supported, state:', audioContext.state);
          
          if (audioContext.state === 'suspended') {
            console.log('⚠️ AudioContext is suspended - needs user interaction');
          }
        } else {
          console.warn('⚠️ Web Audio API not supported');
        }
      } catch (error) {
        console.warn('⚠️ Web Audio API test failed:', error);
      }
      
      // Test 3: Vibration API
      if ('vibrate' in navigator) {
        console.log('✅ Vibration API is supported');
      } else {
        console.warn('⚠️ Vibration API not supported');
      }
    }
  }, []);

  // Initialize audio context
  const initAudio = useCallback(() => {
    if (!audioContextRef.current) {
      try {
        // For iOS Safari and mobile browsers
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        console.log('🎵 Audio context initialized for mobile, state:', audioContextRef.current.state);
        return true;
      } catch (error) {
        console.warn('⚠️ Audio context not supported:', error);
        return false;
      }
    }
    return true;
  }, []);

  // Unlock audio context with user interaction
  const unlockAudio = useCallback(() => {
    if (audioUnlockedRef.current) return;
    
    try {
      if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
        audioContextRef.current.resume().then(() => {
          console.log('✅ Audio context unlocked successfully');
          audioUnlockedRef.current = true;
        }).catch(error => {
          console.warn('⚠️ Failed to unlock audio context:', error);
        });
      } else if (audioContextRef.current) {
        audioUnlockedRef.current = true;
        console.log('✅ Audio context already unlocked');
      }
    } catch (error) {
      console.warn('⚠️ Audio unlock failed:', error);
    }
  }, []);

  // Force unlock audio for Apple devices
  const forceUnlockAppleAudio = useCallback(() => {
    const userAgent = navigator.userAgent;
    const isApple = /iPhone|iPad|iPod|Mac/i.test(userAgent);
    
    if (isApple) {
      console.log('🍎 Force unlocking Apple audio...');
      
      // Create multiple silent audio elements to force unlock
      for (let i = 0; i < 3; i++) {
        const audio = new Audio();
        audio.volume = 0;
        audio.play().catch(() => {
          // Ignore errors
        });
      }
      
      // Try to unlock Web Audio API
      if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
        audioContextRef.current.resume().then(() => {
          console.log('🍎 Apple audio context unlocked');
          audioUnlockedRef.current = true;
        }).catch(() => {
          console.log('🍎 Apple audio context unlock failed');
        });
      }
    }
  }, []);

  const playWheelSound = useCallback(() => {
    if (!isPlayingRef.current) {
      // For mobile/Farcaster devices, try both haptic feedback and audio
      if (isMobileRef.current) {
        console.log('📱 Using mobile/Farcaster sound + haptic system');
        isPlayingRef.current = true;
        
        // Try to unlock audio context first
        unlockAudio();
        
        // Force unlock for Apple devices
        forceUnlockAppleAudio();
        
        // Create combined haptic and audio feedback
        const createMobileTick = () => {
          if (!isPlayingRef.current) return;
          
          try {
            // 1. Haptic feedback
            if ('vibrate' in navigator) {
              navigator.vibrate(10); // Very short vibration
            }
            
            // 2. Try to play audio if context is unlocked
            if (audioUnlockedRef.current && audioContextRef.current) {
              const tickTime = audioContextRef.current.currentTime;
              const tickOsc = audioContextRef.current.createOscillator();
              const tickGain = audioContextRef.current.createGain();
              
              tickOsc.type = 'sine';
              tickOsc.frequency.setValueAtTime(300, tickTime);
              tickOsc.frequency.exponentialRampToValueAtTime(150, tickTime + 0.1);
              
              tickGain.gain.setValueAtTime(1.5, tickTime);
              tickGain.gain.exponentialRampToValueAtTime(0.001, tickTime + 0.1);
              
              tickOsc.connect(tickGain);
              tickGain.connect(audioContextRef.current.destination);
              
              tickOsc.start(tickTime);
              tickOsc.stop(tickTime + 0.1);
            }
            
            // 3. Fallback: silent audio to keep context alive
            const audio = new Audio();
            audio.volume = 0;
            audio.play().catch(() => {
              // Ignore errors for silent audio
            });
          } catch (error) {
            console.warn('⚠️ Mobile tick failed:', error);
          }
        };
        
        createMobileTick();
        intervalRef.current = setInterval(createMobileTick, 200);
        return;
      }
      
      // Desktop audio initialization
      if (!initAudio()) {
        console.warn('⚠️ Audio not supported on this device');
        return;
      }
      
      if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
        // For iOS Safari, we need user interaction to resume audio
        audioContextRef.current.resume().catch(error => {
          console.warn('⚠️ Could not resume audio context:', error);
        });
      }

      if (audioContextRef.current) {
        isPlayingRef.current = true;
        
        const createTick = () => {
          if (!isPlayingRef.current) return;
          
          const tickTime = audioContextRef.current!.currentTime;
          
          // Create tick sound like pointer hitting wheel teeth
          const tickOsc1 = audioContextRef.current!.createOscillator();
          const tickOsc2 = audioContextRef.current!.createOscillator();
          const tickGain = audioContextRef.current!.createGain();
          const filter = audioContextRef.current!.createBiquadFilter();
          
                  // Configure filter for soft wheel sound (not metal)
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(400, tickTime);
        filter.Q.setValueAtTime(0.8, tickTime);
        
        // Configure oscillators for soft wheel tick (plastic/wood)
        tickOsc1.type = 'sine'; // Soft click
        tickOsc1.frequency.setValueAtTime(300, tickTime);
        tickOsc1.frequency.exponentialRampToValueAtTime(150, tickTime + 0.08);
        
        tickOsc2.type = 'triangle'; // Soft resonance
        tickOsc2.frequency.setValueAtTime(200, tickTime);
        tickOsc2.frequency.exponentialRampToValueAtTime(100, tickTime + 0.08);
        
        // Configure gain for soft sound
        tickGain.gain.setValueAtTime(0.03, tickTime);
        tickGain.gain.exponentialRampToValueAtTime(0.001, tickTime + 0.08);
          
          // Connect: oscillators -> filter -> gain -> output
          tickOsc1.connect(filter);
          tickOsc2.connect(filter);
          filter.connect(tickGain);
          tickGain.connect(audioContextRef.current!.destination);
          
                  // Start and stop with longer duration for soft sound
        tickOsc1.start(tickTime);
        tickOsc2.start(tickTime);
        tickOsc1.stop(tickTime + 0.08);
        tickOsc2.stop(tickTime + 0.08);
        };
        
        // Start with realistic wheel speed
        createTick();
        intervalRef.current = setInterval(createTick, 150); // Faster ticks for realistic wheel
        
        console.log('🎵 Wheel tick sound started');
      }
    }
  }, [initAudio]);

  const stopWheelSound = useCallback(() => {
    if (isPlayingRef.current) {
      isPlayingRef.current = false;
      
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      
              console.log('🔇 Wheel tick sound stopped');
    }
  }, []);

  const setVolume = useCallback((volume: number) => {
    // Volume control can be implemented if needed
    console.log('Volume set to:', volume);
  }, []);

  const setSpeed = useCallback((speed: number) => {
    // This function is no longer needed for fixed speed
    console.log('Speed control disabled - using fixed speed');
  }, []);

  const playButtonClick = useCallback(() => {
    // For mobile/Farcaster devices, try both haptic feedback and audio
    if (isMobileRef.current) {
      try {
        // Try to unlock audio context first
        unlockAudio();
        
        // Force unlock for Apple devices
        forceUnlockAppleAudio();
        
        // 1. Haptic feedback
        if ('vibrate' in navigator) {
          navigator.vibrate(20); // Short vibration for button click
        }
        
        // 2. Try to play audio if context is unlocked
        if (audioUnlockedRef.current && audioContextRef.current) {
          const clickTime = audioContextRef.current.currentTime;
          const clickOsc = audioContextRef.current.createOscillator();
          const clickGain = audioContextRef.current.createGain();
          
          clickOsc.type = 'sine';
          clickOsc.frequency.setValueAtTime(400, clickTime);
          clickOsc.frequency.exponentialRampToValueAtTime(200, clickTime + 0.1);
          
          clickGain.gain.setValueAtTime(1.25, clickTime);
          clickGain.gain.exponentialRampToValueAtTime(0.001, clickTime + 0.1);
          
          clickOsc.connect(clickGain);
          clickGain.connect(audioContextRef.current.destination);
          
          clickOsc.start(clickTime);
          clickOsc.stop(clickTime + 0.1);
        }
        
        // 3. Fallback: silent audio to keep context alive
        const audio = new Audio();
        audio.volume = 0;
        audio.play().catch(() => {
          // Ignore errors for silent audio
        });
      } catch (error) {
        console.warn('⚠️ Mobile button feedback failed:', error);
      }
      return;
    }
    
    // Desktop audio initialization
    if (!initAudio()) {
      console.warn('⚠️ Audio not supported on this device');
      return;
    }
    
    if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
      // For iOS Safari, we need user interaction to resume audio
      audioContextRef.current.resume().catch(error => {
        console.warn('⚠️ Could not resume audio context:', error);
      });
    }

    if (audioContextRef.current) {
      const clickTime = audioContextRef.current.currentTime;
      
      // Create button click sound
      const clickOsc = audioContextRef.current.createOscillator();
      const clickGain = audioContextRef.current.createGain();
      const filter = audioContextRef.current.createBiquadFilter();
      
      // Configure filter for soft click
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(800, clickTime);
      filter.Q.setValueAtTime(1, clickTime);
      
      // Configure oscillator for soft click
      clickOsc.type = 'sine';
      clickOsc.frequency.setValueAtTime(400, clickTime);
      clickOsc.frequency.exponentialRampToValueAtTime(200, clickTime + 0.1);
      
      // Configure gain for soft click
      clickGain.gain.setValueAtTime(0.02, clickTime);
      clickGain.gain.exponentialRampToValueAtTime(0.001, clickTime + 0.1);
      
      // Connect and play
      clickOsc.connect(filter);
      filter.connect(clickGain);
      clickGain.connect(audioContextRef.current.destination);
      
      clickOsc.start(clickTime);
      clickOsc.stop(clickTime + 0.1);
    }
  }, [initAudio]);

  const playWinSound = useCallback(() => {
    // For mobile/Farcaster devices, try both haptic feedback and audio
    if (isMobileRef.current) {
      try {
        // Try to unlock audio context first
        unlockAudio();
        
        // Force unlock for Apple devices
        forceUnlockAppleAudio();
        
        // 1. Haptic feedback
        if ('vibrate' in navigator) {
          navigator.vibrate([50, 100, 50, 100, 50]); // Success vibration pattern
        }
        
        // 2. Try to play audio if context is unlocked
        if (audioUnlockedRef.current && audioContextRef.current) {
          const winTime = audioContextRef.current.currentTime;
          
          // Create ascending notes for win sound
          const notes = [400, 500, 600, 700];
          notes.forEach((freq, index) => {
            const winOsc = audioContextRef.current!.createOscillator();
            const winGain = audioContextRef.current!.createGain();
            
            winOsc.type = 'sine';
            winOsc.frequency.setValueAtTime(freq, winTime);
            
            winGain.gain.setValueAtTime(1.0, winTime);
            winGain.gain.exponentialRampToValueAtTime(0.001, winTime + 0.3);
            
            winOsc.connect(winGain);
            winGain.connect(audioContextRef.current!.destination);
            
            winOsc.start(winTime + (index * 0.1));
            winOsc.stop(winTime + (index * 0.1) + 0.3);
          });
        }
        
        // 3. Fallback: silent audio to keep context alive
        const audio = new Audio();
        audio.volume = 0;
        audio.play().catch(() => {
          // Ignore errors for silent audio
        });
      } catch (error) {
        console.warn('⚠️ Mobile win feedback failed:', error);
      }
      return;
    }
    
    // Desktop audio initialization
    if (!initAudio()) {
      console.warn('⚠️ Audio not supported on this device');
      return;
    }
    
    if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
      // For iOS Safari, we need user interaction to resume audio
      audioContextRef.current.resume().catch(error => {
        console.warn('⚠️ Could not resume audio context:', error);
      });
    }

    if (audioContextRef.current) {
      const winTime = audioContextRef.current.currentTime;
      
      // Create win sound (ascending notes)
      const notes = [400, 500, 600, 700];
      notes.forEach((freq, index) => {
        const winOsc = audioContextRef.current!.createOscillator();
        const winGain = audioContextRef.current!.createGain();
        const filter = audioContextRef.current!.createBiquadFilter();
        
        // Configure filter for pleasant win sound
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(1000, winTime);
        filter.Q.setValueAtTime(1, winTime);
        
        // Configure oscillator for win sound
        winOsc.type = 'sine';
        winOsc.frequency.setValueAtTime(freq, winTime);
        
        // Configure gain for soft win sound
        winGain.gain.setValueAtTime(0.06, winTime);
        winGain.gain.exponentialRampToValueAtTime(0.001, winTime + 0.3);
        
        // Connect and play
        winOsc.connect(filter);
        filter.connect(winGain);
        winGain.connect(audioContextRef.current!.destination);
        
        winOsc.start(winTime + (index * 0.1));
        winOsc.stop(winTime + (index * 0.1) + 0.3);
      });
    }
  }, [initAudio]);

  const playLoseSound = useCallback(() => {
    // For mobile/Farcaster devices, try both haptic feedback and audio
    if (isMobileRef.current) {
      try {
        // Try to unlock audio context first
        unlockAudio();
        
        // Force unlock for Apple devices
        forceUnlockAppleAudio();
        
        // 1. Haptic feedback
        if ('vibrate' in navigator) {
          navigator.vibrate([200, 100, 200]); // Failure vibration pattern
        }
        
        // 2. Try to play audio if context is unlocked
        if (audioUnlockedRef.current && audioContextRef.current) {
          const loseTime = audioContextRef.current.currentTime;
          
          // Create descending notes for lose sound
          const notes = [600, 500, 400, 300];
          notes.forEach((freq, index) => {
            const loseOsc = audioContextRef.current!.createOscillator();
            const loseGain = audioContextRef.current!.createGain();
            
            loseOsc.type = 'triangle';
            loseOsc.frequency.setValueAtTime(freq, loseTime);
            
            loseGain.gain.setValueAtTime(0.75, loseTime);
            loseGain.gain.exponentialRampToValueAtTime(0.001, loseTime + 0.4);
            
            loseOsc.connect(loseGain);
            loseGain.connect(audioContextRef.current!.destination);
            
            loseOsc.start(loseTime + (index * 0.15));
            loseOsc.stop(loseTime + (index * 0.15) + 0.4);
          });
        }
        
        // 3. Fallback: silent audio to keep context alive
        const audio = new Audio();
        audio.volume = 0;
        audio.play().catch(() => {
          // Ignore errors for silent audio
        });
      } catch (error) {
        console.warn('⚠️ Mobile lose feedback failed:', error);
      }
      return;
    }
    
    // Desktop audio initialization
    if (!initAudio()) {
      console.warn('⚠️ Audio not supported on this device');
      return;
    }
    
    if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
      // For iOS Safari, we need user interaction to resume audio
      audioContextRef.current.resume().catch(error => {
        console.warn('⚠️ Could not resume audio context:', error);
      });
    }

    if (audioContextRef.current) {
      const loseTime = audioContextRef.current.currentTime;
      
      // Create lose sound (descending notes)
      const notes = [600, 500, 400, 300];
      notes.forEach((freq, index) => {
        const loseOsc = audioContextRef.current!.createOscillator();
        const loseGain = audioContextRef.current!.createGain();
        const filter = audioContextRef.current!.createBiquadFilter();
        
        // Configure filter for soft lose sound
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(800, loseTime);
        filter.Q.setValueAtTime(1, loseTime);
        
        // Configure oscillator for lose sound
        loseOsc.type = 'triangle';
        loseOsc.frequency.setValueAtTime(freq, loseTime);
        
        // Configure gain for soft lose sound
        loseGain.gain.setValueAtTime(0.05, loseTime);
        loseGain.gain.exponentialRampToValueAtTime(0.001, loseTime + 0.4);
        
        // Connect and play
        loseOsc.connect(filter);
        filter.connect(loseGain);
        loseGain.connect(audioContextRef.current!.destination);
        
        loseOsc.start(loseTime + (index * 0.15));
        loseOsc.stop(loseTime + (index * 0.15) + 0.4);
      });
    }
  }, [initAudio]);

  return {
    playWheelSound,
    stopWheelSound,
    setVolume,
    setSpeed,
    playButtonClick,
    playWinSound,
    playLoseSound,
    isPlaying: isPlayingRef.current
  };
}; 