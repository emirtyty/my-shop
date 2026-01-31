import { useState, useEffect, useCallback } from 'react';
import { favoritesDB, FavoriteItem } from '../lib/indexedDB';

export const useFavorites = () => {
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [favoritesCount, setFavoritesCount] = useState(0);
  const [loading, setLoading] = useState(true);

  // Инициализация и загрузка избранных
  useEffect(() => {
    const loadFavorites = async () => {
      try {
        await favoritesDB.init();
        const ids = await favoritesDB.getFavoriteProductIds();
        const count = await favoritesDB.getFavoritesCount();
        setFavoriteIds(new Set(ids));
        setFavoritesCount(count);
      } catch (error) {
        console.error('Error loading favorites:', error);
      } finally {
        setLoading(false);
      }
    };

    loadFavorites();
  }, []);

  // Добавить в избранное
  const addToFavorites = useCallback(async (productId: string) => {
    try {
      await favoritesDB.addToFavorites(productId);
      setFavoriteIds(prev => new Set(prev).add(productId));
      setFavoritesCount(prev => prev + 1);
      return true;
    } catch (error) {
      console.error('Error adding to favorites:', error);
      return false;
    }
  }, []);

  // Удалить из избранного
  const removeFromFavorites = useCallback(async (productId: string) => {
    try {
      await favoritesDB.removeFromFavorites(productId);
      setFavoriteIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(productId);
        return newSet;
      });
      setFavoritesCount(prev => prev - 1);
      return true;
    } catch (error) {
      console.error('Error removing from favorites:', error);
      return false;
    }
  }, []);

  // Переключить статус избранного
  const toggleFavorite = useCallback(async (productId: string) => {
    if (favoriteIds.has(productId)) {
      return await removeFromFavorites(productId);
    } else {
      return await addToFavorites(productId);
    }
  }, [favoriteIds, addToFavorites, removeFromFavorites]);

  // Проверить является ли товар избранным
  const isFavorite = useCallback((productId: string) => {
    return favoriteIds.has(productId);
  }, [favoriteIds]);

  // Получить все избранные товары
  const getFavoriteProducts = useCallback((products: any[]) => {
    return products.filter(product => favoriteIds.has(product.id));
  }, [favoriteIds]);

  return {
    favoriteIds,
    favoritesCount,
    loading,
    addToFavorites,
    removeFromFavorites,
    toggleFavorite,
    isFavorite,
    getFavoriteProducts
  };
};
