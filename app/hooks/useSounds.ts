import { useEffect, useRef } from 'react';

interface SoundConfig {
  volume: number;
  enabled: boolean;
}

const useSounds = (config: SoundConfig = { volume: 0.5, enabled: true }) => {
  const audioContext = useRef<AudioContext | null>(null);
  const sounds = useRef<Map<string, AudioBuffer>>(new Map());

  // Инициализация AudioContext
  useEffect(() => {
    if (typeof window !== 'undefined' && 'AudioContext' in window) {
      audioContext.current = new AudioContext();
      
      // Создаем звуки программно
      const createBeep = (frequency: number, duration: number): AudioBuffer => {
        const sampleRate = audioContext.current!.sampleRate;
        const numSamples = sampleRate * duration;
        const buffer = audioContext.current!.createBuffer(1, numSamples, sampleRate);
        const data = buffer.getChannelData(0);
        
        for (let i = 0; i < numSamples; i++) {
          data[i] = Math.sin(2 * Math.PI * frequency * i / sampleRate) * 
                    Math.exp(-3 * i / numSamples); // Затухание
        }
        
        return buffer;
      };

      // Создаем разные звуки
      sounds.current.set('click', createBeep(800, 0.1));
      sounds.current.set('success', createBeep(600, 0.2));
      sounds.current.set('error', createBeep(300, 0.2));
      sounds.current.set('notification', createBeep(1000, 0.3));
      sounds.current.set('addToCart', createBeep(900, 0.15));
      sounds.current.set('swipe', createBeep(400, 0.1));
      sounds.current.set('modalOpen', createBeep(700, 0.2));
      sounds.current.set('modalClose', createBeep(500, 0.15));
    }

    return () => {
      if (audioContext.current) {
        audioContext.current.close();
      }
    };
  }, []);

  // Воспроизведение звука
  const playSound = (soundName: string) => {
    if (!config.enabled || !audioContext.current || !sounds.current.has(soundName)) {
      return;
    }

    try {
      const source = audioContext.current.createBufferSource();
      const buffer = sounds.current.get(soundName);
      
      if (buffer) {
        source.buffer = buffer;
        source.connect(audioContext.current.destination);
        source.start(0);
        
        // Настраиваем громкость
        const gainNode = audioContext.current.createGain();
        source.connect(gainNode);
        gainNode.connect(audioContext.current.destination);
        gainNode.gain.value = config.volume;
      }
    } catch (error) {
      console.warn(`Failed to play sound ${soundName}:`, error);
    }
  };

  return {
    playSound,
    click: () => playSound('click'),
    success: () => playSound('success'),
    error: () => playSound('error'),
    notification: () => playSound('notification'),
    addToCart: () => playSound('addToCart'),
    swipe: () => playSound('swipe'),
    modalOpen: () => playSound('modalOpen'),
    modalClose: () => playSound('modalClose')
  };
};

export default useSounds;
