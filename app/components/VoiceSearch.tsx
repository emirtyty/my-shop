'use client';

import { useState, useRef, useEffect } from 'react';
import { logger } from '../lib/logger';

interface VoiceSearchProps {
  onSearch: (query: string) => void;
  placeholder?: string;
}

export default function VoiceSearch({ onSearch, placeholder = "Голосовой поиск..." }: VoiceSearchProps) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isSupported, setIsSupported] = useState(false);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    // Проверяем поддержку Web Speech API
    if (typeof window !== 'undefined' && 'webkitSpeechRecognition' in window) {
      setIsSupported(true);
      const recognition = new (window as any).webkitSpeechRecognition();
      recognitionRef.current = recognition;
      
      // Проверяем текущее разрешение на микрофон
      navigator.permissions.query({ name: 'microphone' as any }).then((permission) => {
        logger.log('Microphone permission state:', permission.state);
        
        if (permission.state === 'denied') {
          setTranscript('🔒 Микрофон отключен');
          setTimeout(() => setTranscript(''), 2000);
        }
        
        // Отслеживаем изменения разрешений
        permission.addEventListener('change', () => {
          logger.log('Microphone permission changed to:', permission.state);
          if (permission.state === 'granted') {
            setTranscript('✅ Микрофон разрешен');
            setTimeout(() => setTranscript(''), 2000);
          } else if (permission.state === 'denied') {
            setTranscript('🔒 Микрофон отключен');
            setTimeout(() => setTranscript(''), 2000);
          }
        });
      }).catch(() => {
        // Если API не поддерживается, просто продолжаем
        logger.log('Permissions API not supported');
      });
      
      // Настройка распознавания
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'ru-RU';
      
      recognition.onstart = () => {
        setIsListening(true);
        setTranscript('');
        logger.log('Voice recognition started');
      };
      
      recognition.onresult = (event: any) => {
        const current = event.resultIndex;
        const transcript = event.results[current][0].transcript;
        
        setTranscript(transcript);
        
        if (event.results[current].isFinal) {
          // Обрабатываем финальный результат
          const processedQuery = processVoiceQuery(transcript);
          onSearch(processedQuery);
          setIsListening(false);
        }
      };
      
      recognition.onerror = (event: any) => {
        logger.error('Voice recognition error:', event.error);
        setIsListening(false);
        
        // Показываем ошибку пользователю
        let errorMessage = 'Ошибка распознавания';
        switch (event.error) {
          case 'no-speech':
            errorMessage = 'Речь не обнаружена';
            break;
          case 'audio-capture':
            errorMessage = 'Нет доступа к микрофону';
            break;
          case 'not-allowed':
            errorMessage = 'Доступ к микрофону запрещен';
            break;
          case 'network':
            errorMessage = 'Проблемы с сетью';
            break;
        }
        
        setTranscript(errorMessage);
        setTimeout(() => setTranscript(''), 3000);
      };
      
      recognition.onend = () => {
        setIsListening(false);
        logger.log('Voice recognition ended');
      };
    } else {
      setIsSupported(false);
      logger.warn('Speech recognition not supported');
    }
  }, [onSearch]);

  // Обработка голосового запроса
  const processVoiceQuery = (query: string): string => {
    // Приводим к нижнему регистру и убираем лишние пробелы
    let processed = query.toLowerCase().trim();
    
    // Обрабатываем специальные команды
    if (processed.includes('найди') || processed.includes('покажи')) {
      processed = processed.replace(/найди|покажи/g, '').trim();
    }
    
    // Обрабатываем ценовые запросы
    const priceMatch = processed.match(/(до|менее|не более)\s*(\d+)\s*(?:руб|р|₽|тыс|тысяч)/i);
    if (priceMatch) {
      const price = parseInt(priceMatch[2]);
      if (priceMatch[1].includes('тыс')) {
        processed = processed.replace(priceMatch[0], `цена до ${price * 1000}`);
      } else {
        processed = processed.replace(priceMatch[0], `цена до ${price}`);
      }
    }
    
    // Обрабатываем диапазон цен
    const rangeMatch = processed.match(/от\s*(\d+)\s*(?:руб|р|₽|тыс|тысяч)\s*до\s*(\d+)\s*(?:руб|р|₽|тыс|тысяч)/i);
    if (rangeMatch) {
      let minPrice = parseInt(rangeMatch[1]);
      let maxPrice = parseInt(rangeMatch[2]);
      
      if (rangeMatch[1].includes('тыс')) minPrice *= 1000;
      if (rangeMatch[2].includes('тыс')) maxPrice *= 1000;
      
      processed = processed.replace(rangeMatch[0], `цена от ${minPrice} до ${maxPrice}`);
    }
    
    // Обрабатываем категории
    const categories = ['смартфоны', 'ноутбуки', 'планшеты', 'телевизоры', 'наушники', 'часы', 'одежда', 'обувь'];
    categories.forEach(category => {
      if (processed.includes(category)) {
        processed = processed.replace(category, category.charAt(0).toUpperCase() + category.slice(1));
      }
    });
    
    return processed;
  };

  const toggleListening = async () => {
    if (!isSupported || !recognitionRef.current) return;
    
    if (isListening) {
      recognitionRef.current.stop();
    } else {
      // Сначала проверяем разрешение
      const permission = await navigator.permissions.query({ name: 'microphone' as any });
      
      if (permission.state === 'denied') {
        setTranscript('Доступ к микрофону запрещен. Разрешите в настройках браузера.');
        setTimeout(() => setTranscript(''), 3000);
        return;
      }
      
      if (permission.state === 'prompt') {
        setTranscript('Разрешите доступ к микрофону...');
        setTimeout(() => setTranscript(''), 2000);
      }
      
      try {
        recognitionRef.current.start();
      } catch (error: any) {
        logger.error('Failed to start recognition:', error);
        
        if (error.name === 'NotAllowedError' || error.name === 'SecurityError') {
          setTranscript('Доступ к микрофону запрещен');
        } else if (error.name === 'NotFoundError') {
          setTranscript('Микрофон не найден');
        } else {
          setTranscript('Ошибка активации микрофона');
        }
        
        setTimeout(() => setTranscript(''), 3000);
      }
    }
  };

  if (!isSupported) {
    return (
      <div className="relative">
        <button
          className="w-10 h-10 rounded-full flex items-center justify-center bg-gray-200 text-gray-400 cursor-not-allowed"
          title="Голосовой поиск не поддерживается"
          disabled
        >
          <span className="text-lg">🎤</span>
        </button>
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={toggleListening}
        className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 ${
          isListening 
            ? 'bg-red-500 text-white animate-pulse' 
            : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
        }`}
        title={isListening ? 'Остановить запись' : 'Начать голосовой поиск'}
      >
        <span className="text-lg">🎤</span>
      </button>
      
      {/* Всплывающее окно с транскриптом */}
      {isListening && (
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 bg-gray-800 text-white px-3 py-2 rounded-lg shadow-lg whitespace-nowrap">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
            <span className="text-sm">
              {transcript || placeholder}
            </span>
          </div>
          {/* Треугольник */}
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1">
            <div className="w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-800"></div>
          </div>
        </div>
      )}
      
      {/* Примеры команд */}
      {!isListening && (
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 bg-gray-800 text-white px-3 py-2 rounded-lg shadow-lg opacity-0 hover:opacity-100 transition-opacity duration-300 pointer-events-none">
          <div className="text-xs space-y-1">
            <div>• "Найди смартфоны до 10 тысяч"</div>
            <div>• "Покажи ноутбуки от 30 до 50 тысяч"</div>
            <div>• "Красная одежда"</div>
          </div>
          {/* Треугольник */}
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1">
            <div className="w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-800"></div>
          </div>
        </div>
      )}
    </div>
  );
}
