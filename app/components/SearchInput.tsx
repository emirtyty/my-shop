'use client';

import React, { useState, useEffect, useRef } from 'react';
import useSounds from '../hooks/useSounds';
import useBrandColors from '../hooks/useBrandColors';

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  suggestions?: string[];
  onSuggestionClick?: (suggestion: string) => void;
}

const SearchInput: React.FC<SearchInputProps> = ({
  value,
  onChange,
  placeholder = "Поиск товаров...",
  suggestions = [],
  onSuggestionClick
}) => {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filteredSuggestions, setFilteredSuggestions] = useState<string[]>([]);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const { colors } = useBrandColors();
  const { click, swipe } = useSounds();

  // Фильтрация подсказок
  useEffect(() => {
    if (value.length > 0) {
      const filtered = suggestions.filter(suggestion =>
        suggestion.toLowerCase().includes(value.toLowerCase())
      );
      setFilteredSuggestions(filtered.slice(0, 5)); // Показываем только 5 подсказок
      setShowSuggestions(filtered.length > 0);
    } else {
      setFilteredSuggestions([]);
      setShowSuggestions(false);
    }
    setHighlightedIndex(-1);
  }, [value, suggestions]);

  // Обработка клавиатурной навигации
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex(prev => 
          prev < filteredSuggestions.length - 1 ? prev + 1 : 0
        );
        swipe();
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev => 
          prev > 0 ? prev - 1 : filteredSuggestions.length - 1
        );
        swipe();
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0) {
          handleSuggestionClick(filteredSuggestions[highlightedIndex]);
        }
        break;
      case 'Escape':
        setShowSuggestions(false);
        setHighlightedIndex(-1);
        break;
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    onChange(suggestion);
    setShowSuggestions(false);
    setHighlightedIndex(-1);
    click();
    onSuggestionClick?.(suggestion);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
    click();
  };

  const handleFocus = () => {
    if (value.length > 0 && filteredSuggestions.length > 0) {
      setShowSuggestions(true);
    }
  };

  const handleBlur = () => {
    // Задержка чтобы успеть кликнуть на подсказку
    setTimeout(() => setShowSuggestions(false), 200);
  };

  return (
    <div className="relative w-full">
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={placeholder}
          className="w-full pl-12 pr-20 py-3 rounded-2xl outline-none transition-all duration-300 placeholder-gray-500"
          style={{
            backgroundColor: 'var(--bg-secondary)',
            color: 'var(--text-primary)',
            border: `2px solid ${showSuggestions ? colors.primary : 'transparent'}`,
            boxShadow: showSuggestions ? `0 0 0 4px ${colors.primary}20` : 'none'
          }}
        />
        
        {/* Иконка поиска */}
        <div className="absolute left-4 top-1/2 transform -translate-y-1/2 text-2xl" style={{
          color: 'var(--text-tertiary)'
        }}>
          🔍
        </div>
        
        {/* Кнопка очистки */}
        {value && (
          <button
            onClick={() => {
              onChange('');
              click();
            }}
            className="absolute right-4 top-1/2 transform -translate-y-1/2 w-6 h-6 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-110"
            style={{
              backgroundColor: colors.error,
              color: 'white'
            }}
          >
            ×
          </button>
        )}
      </div>

      {/* Подсказки */}
      {showSuggestions && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border overflow-hidden z-50 max-h-60 overflow-y-auto"
          style={{
            backgroundColor: 'var(--bg-primary)',
            borderColor: 'var(--border-primary)'
          }}
        >
          {filteredSuggestions.map((suggestion, index) => (
            <div
              key={suggestion}
              onClick={() => handleSuggestionClick(suggestion)}
              className={`px-4 py-3 cursor-pointer transition-all duration-200 border-b last:border-b-0 ${
                index === highlightedIndex 
                  ? 'bg-opacity-10' 
                  : 'hover:bg-opacity-5'
              }`}
              style={{
                backgroundColor: index === highlightedIndex 
                  ? `${colors.primary}20` 
                  : 'transparent',
                borderColor: 'var(--border-primary)',
                color: 'var(--text-primary)'
              }}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm">{suggestion}</span>
                {index === highlightedIndex && (
                  <span className="text-xs" style={{ color: colors.primary }}>
                    ↵
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SearchInput;
