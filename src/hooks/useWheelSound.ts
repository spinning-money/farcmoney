import { useCallback, useRef, useEffect } from 'react';

export const useWheelSound = () => {
  const audioContextRef = useRef<AudioContext | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isPlayingRef = useRef(false);
  const isMobileRef = useRef(false);
  
  // Check if device is mobile
  useEffect(() => {
    isMobileRef.current = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    console.log('📱 Device type:', isMobileRef.current ? 'Mobile' : 'Desktop');
  }, []);

  // Initialize audio context
  const initAudio = useCallback(() => {
    if (!audioContextRef.current) {
      try {
        // For iOS Safari and mobile browsers
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        console.log('🎵 Audio context initialized for mobile');
        return true;
      } catch (error) {
        console.warn('⚠️ Audio context not supported:', error);
        return false;
      }
    }
    return true;
  }, []);

  const playWheelSound = useCallback(() => {
    if (!isPlayingRef.current) {
      // For mobile devices, use simpler approach
      if (isMobileRef.current) {
        console.log('📱 Using mobile sound system');
        isPlayingRef.current = true;
        
        // Create simple mobile wheel sound
        const createMobileTick = () => {
          if (!isPlayingRef.current) return;
          
          try {
            // Create a simple beep sound for mobile
            const audio = new Audio();
            audio.volume = 0.1;
            
            // Generate a simple tone using Web Audio API if available
            if (window.AudioContext || (window as any).webkitAudioContext) {
              const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
              const oscillator = audioContext.createOscillator();
              const gainNode = audioContext.createGain();
              
              oscillator.connect(gainNode);
              gainNode.connect(audioContext.destination);
              
              oscillator.frequency.setValueAtTime(300, audioContext.currentTime);
              oscillator.frequency.exponentialRampToValueAtTime(150, audioContext.currentTime + 0.1);
              
              gainNode.gain.setValueAtTime(0.02, audioContext.currentTime);
              gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.1);
              
              oscillator.start(audioContext.currentTime);
              oscillator.stop(audioContext.currentTime + 0.1);
            }
          } catch (error) {
            console.warn('⚠️ Mobile sound failed:', error);
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
    // For mobile devices, use simpler approach
    if (isMobileRef.current) {
      try {
        // Create simple mobile button sound
        if (window.AudioContext || (window as any).webkitAudioContext) {
          const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
          const oscillator = audioContext.createOscillator();
          const gainNode = audioContext.createGain();
          
          oscillator.connect(gainNode);
          gainNode.connect(audioContext.destination);
          
          oscillator.frequency.setValueAtTime(400, audioContext.currentTime);
          oscillator.frequency.exponentialRampToValueAtTime(200, audioContext.currentTime + 0.1);
          
          gainNode.gain.setValueAtTime(0.01, audioContext.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.1);
          
          oscillator.start(audioContext.currentTime);
          oscillator.stop(audioContext.currentTime + 0.1);
        }
      } catch (error) {
        console.warn('⚠️ Mobile button sound failed:', error);
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
    // Mobile-friendly audio initialization
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
        winGain.gain.setValueAtTime(0.015, winTime);
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
    // Mobile-friendly audio initialization
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
        loseGain.gain.setValueAtTime(0.01, loseTime);
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