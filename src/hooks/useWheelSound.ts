import { useCallback, useRef } from 'react';

export const useWheelSound = () => {
  const audioContextRef = useRef<AudioContext | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isPlayingRef = useRef(false);

  // Initialize audio context
  const initAudio = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
  }, []);

  const playWheelSound = useCallback(() => {
    if (!isPlayingRef.current) {
      initAudio();
      
      if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
        audioContextRef.current.resume();
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
    if (!audioContextRef.current) {
      initAudio();
    }
    
    if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume();
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
    if (!audioContextRef.current) {
      initAudio();
    }
    
    if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume();
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
    if (!audioContextRef.current) {
      initAudio();
    }
    
    if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume();
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