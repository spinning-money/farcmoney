import { useCallback, useRef, useEffect } from 'react';

export const useWheelSound = () => {
  const audioContextRef = useRef<AudioContext | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isPlayingRef = useRef(false);
  const isMobileRef = useRef(false);
  
  // Check if device is mobile or Farcaster mini app
  useEffect(() => {
    const userAgent = navigator.userAgent;
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
    const isFarcaster = userAgent.includes('Farcaster') || userAgent.includes('farcaster');
    
    isMobileRef.current = isMobile || isFarcaster;
    console.log('📱 Device type:', isMobileRef.current ? 'Mobile/Farcaster' : 'Desktop');
    console.log('🔍 User Agent:', userAgent);
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
      // For mobile/Farcaster devices, use ultra-simple approach
      if (isMobileRef.current) {
        console.log('📱 Using Farcaster mini app sound system');
        isPlayingRef.current = true;
        
        // Create ultra-simple mobile wheel sound
        const createMobileTick = () => {
          if (!isPlayingRef.current) return;
          
          try {
            // Use HTML5 Audio for maximum compatibility
            const audio = new Audio();
            
            // Create a simple data URL for a beep sound
            const sampleRate = 44100;
            const duration = 0.1; // 100ms
            const frequency = 300;
            const samples = Math.floor(sampleRate * duration);
            const audioBuffer = new ArrayBuffer(samples * 2);
            const view = new DataView(audioBuffer);
            
            for (let i = 0; i < samples; i++) {
              const value = Math.sin(2 * Math.PI * frequency * i / sampleRate) * 0.1;
              view.setInt16(i * 2, value * 32767, true);
            }
            
            const blob = new Blob([audioBuffer], { type: 'audio/wav' });
            const url = URL.createObjectURL(blob);
            
            audio.src = url;
            audio.volume = 0.05; // Very low volume
            audio.play().catch(error => {
              console.warn('⚠️ Mobile audio play failed:', error);
            });
            
            // Clean up URL after playing
            setTimeout(() => URL.revokeObjectURL(url), 1000);
          } catch (error) {
            console.warn('⚠️ Mobile sound generation failed:', error);
          }
        };
        
        createMobileTick();
        intervalRef.current = setInterval(createMobileTick, 300); // Slower for mobile
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
    // For mobile/Farcaster devices, use ultra-simple approach
    if (isMobileRef.current) {
      try {
        // Use HTML5 Audio for maximum compatibility
        const audio = new Audio();
        
        // Create a simple data URL for a button click sound
        const sampleRate = 44100;
        const duration = 0.05; // 50ms
        const frequency = 400;
        const samples = Math.floor(sampleRate * duration);
        const audioBuffer = new ArrayBuffer(samples * 2);
        const view = new DataView(audioBuffer);
        
        for (let i = 0; i < samples; i++) {
          const value = Math.sin(2 * Math.PI * frequency * i / sampleRate) * 0.05;
          view.setInt16(i * 2, value * 32767, true);
        }
        
        const blob = new Blob([audioBuffer], { type: 'audio/wav' });
        const url = URL.createObjectURL(blob);
        
        audio.src = url;
        audio.volume = 0.03; // Very low volume
        audio.play().catch(error => {
          console.warn('⚠️ Mobile button audio play failed:', error);
        });
        
        // Clean up URL after playing
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      } catch (error) {
        console.warn('⚠️ Mobile button sound generation failed:', error);
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
    // For mobile/Farcaster devices, use ultra-simple approach
    if (isMobileRef.current) {
      try {
        // Use HTML5 Audio for maximum compatibility
        const audio = new Audio();
        
        // Create a simple ascending tone for win sound
        const sampleRate = 44100;
        const duration = 0.3; // 300ms
        const startFreq = 400;
        const endFreq = 700;
        const samples = Math.floor(sampleRate * duration);
        const audioBuffer = new ArrayBuffer(samples * 2);
        const view = new DataView(audioBuffer);
        
        for (let i = 0; i < samples; i++) {
          const progress = i / samples;
          const frequency = startFreq + (endFreq - startFreq) * progress;
          const value = Math.sin(2 * Math.PI * frequency * i / sampleRate) * 0.03;
          view.setInt16(i * 2, value * 32767, true);
        }
        
        const blob = new Blob([audioBuffer], { type: 'audio/wav' });
        const url = URL.createObjectURL(blob);
        
        audio.src = url;
        audio.volume = 0.02; // Very low volume
        audio.play().catch(error => {
          console.warn('⚠️ Mobile win audio play failed:', error);
        });
        
        // Clean up URL after playing
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      } catch (error) {
        console.warn('⚠️ Mobile win sound generation failed:', error);
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
    // For mobile/Farcaster devices, use ultra-simple approach
    if (isMobileRef.current) {
      try {
        // Use HTML5 Audio for maximum compatibility
        const audio = new Audio();
        
        // Create a simple descending tone for lose sound
        const sampleRate = 44100;
        const duration = 0.4; // 400ms
        const startFreq = 600;
        const endFreq = 300;
        const samples = Math.floor(sampleRate * duration);
        const audioBuffer = new ArrayBuffer(samples * 2);
        const view = new DataView(audioBuffer);
        
        for (let i = 0; i < samples; i++) {
          const progress = i / samples;
          const frequency = startFreq + (endFreq - startFreq) * progress;
          const value = Math.sin(2 * Math.PI * frequency * i / sampleRate) * 0.02;
          view.setInt16(i * 2, value * 32767, true);
        }
        
        const blob = new Blob([audioBuffer], { type: 'audio/wav' });
        const url = URL.createObjectURL(blob);
        
        audio.src = url;
        audio.volume = 0.015; // Very low volume
        audio.play().catch(error => {
          console.warn('⚠️ Mobile lose audio play failed:', error);
        });
        
        // Clean up URL after playing
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      } catch (error) {
        console.warn('⚠️ Mobile lose sound generation failed:', error);
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