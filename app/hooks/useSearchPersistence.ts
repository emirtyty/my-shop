import { useState, useEffect } from 'react';

interface SearchHistory {
  queries: string[];
  lastSearch: string;
  timestamp: number;
}

const useSearchPersistence = () => {
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [lastSearch, setLastSearch] = useState<string>('');

  // Загрузка истории при монтировании
  useEffect(() => {
    try {
      const saved = localStorage.getItem('search_history');
      if (saved) {
        const parsed: SearchHistory = JSON.parse(saved);
        setSearchHistory(parsed.queries || []);
        setLastSearch(parsed.lastSearch || '');
      }
    } catch (error) {
      console.warn('Failed to load search history:', error);
    }
  }, []);

  // Сохранение истории
  const saveSearchHistory = (queries: string[], lastQuery: string) => {
    try {
      const data: SearchHistory = {
        queries: queries.slice(0, 10), // Сохраняем только последние 10 запросов
        lastSearch: lastQuery,
        timestamp: Date.now()
      };
      localStorage.setItem('search_history', JSON.stringify(data));
    } catch (error) {
      console.warn('Failed to save search history:', error);
    }
  };

  // Добавление нового запроса в историю
  const addToHistory = (query: string) => {
    if (!query.trim()) return;

    const trimmedQuery = query.trim();
    const newHistory = [trimmedQuery, ...searchHistory.filter(q => q !== trimmedQuery)];
    setSearchHistory(newHistory);
    setLastSearch(trimmedQuery);
    saveSearchHistory(newHistory, trimmedQuery);
  };

  // Очистка истории
  const clearHistory = () => {
    setSearchHistory([]);
    setLastSearch('');
    localStorage.removeItem('search_history');
  };

  // Удаление конкретного запроса из истории
  const removeFromHistory = (query: string) => {
    const newHistory = searchHistory.filter(q => q !== query);
    setSearchHistory(newHistory);
    saveSearchHistory(newHistory, lastSearch);
  };

  // Получение популярных запросов
  const getPopularQueries = () => {
    return searchHistory.slice(0, 5);
  };

  // Восстановление последнего поиска
  const restoreLastSearch = () => {
    return lastSearch;
  };

  return {
    searchHistory,
    lastSearch,
    addToHistory,
    clearHistory,
    removeFromHistory,
    getPopularQueries,
    restoreLastSearch
  };
};

export default useSearchPersistence;
