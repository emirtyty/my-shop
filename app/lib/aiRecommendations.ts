// AI-система рекомендаций (упрощенная версия)
import { logger } from './logger';

interface Product {
  id: string;
  name: string;
  price: number;
  category: string;
  discount?: number;
  description?: string;
  image_url?: string;
}

interface UserAction {
  productId: string;
  action: 'view' | 'favorite' | 'search' | 'purchase';
  timestamp: number;
  category?: string;
  priceRange?: [number, number];
}

interface RecommendationResult {
  products: Product[];
  reason: string;
  confidence: number;
}

class AIRecommendationEngine {
  private static instance: AIRecommendationEngine;
  private userActions: UserAction[] = [];

  private constructor() {}

  static getInstance(): AIRecommendationEngine {
    if (!AIRecommendationEngine.instance) {
      AIRecommendationEngine.instance = new AIRecommendationEngine();
    }
    return AIRecommendationEngine.instance;
  }

  // Записать действие пользователя
  trackUserAction(action: UserAction): void {
    this.userActions.push(action);
    
    // Ограничиваем историю последними 1000 действий
    if (this.userActions.length > 1000) {
      this.userActions = this.userActions.slice(-1000);
    }
    
    logger.log('User action tracked:', action);
  }

  // Получить рекомендации для пользователя
  async getRecommendations(
    currentProduct: Product, 
    allProducts: Product[], 
    limit: number = 5
  ): Promise<RecommendationResult> {
    try {
      // Анализируем историю действий пользователя
      const userPreferences = this.analyzeUserPreferences();
      
      // Находим похожие товары
      const similarProducts = this.findSimilarProducts(currentProduct, allProducts, userPreferences);
      
      // Ранжируем по релевантности
      const rankedProducts = this.rankProducts(similarProducts, currentProduct, userPreferences);
      
      return {
        products: rankedProducts.slice(0, limit),
        reason: this.generateRecommendationReason(userPreferences),
        confidence: this.calculateConfidence(rankedProducts.slice(0, limit))
      };
    } catch (error) {
      logger.error('Error getting recommendations:', error);
      return {
        products: [],
        reason: 'Ошибка при получении рекомендаций',
        confidence: 0
      };
    }
  }

  private analyzeUserPreferences() {
    const preferences = {
      categories: new Map<string, number>(),
      priceRange: [0, 1000000],
      favoriteCategories: new Set<string>(),
      recentCategories: new Set<string>()
    };

    // Анализируем последние действия
    const recentActions = this.userActions.slice(-50);
    
    recentActions.forEach(action => {
      if (action.category) {
        preferences.categories.set(
          action.category, 
          (preferences.categories.get(action.category) || 0) + 1
        );
        
        if (action.action === 'favorite') {
          preferences.favoriteCategories.add(action.category);
        }
        
        if (action.action === 'view' || action.action === 'search') {
          preferences.recentCategories.add(action.category);
        }
      }
      
      if (action.priceRange) {
        preferences.priceRange = action.priceRange;
      }
    });

    return preferences;
  }

  private findSimilarProducts(
    currentProduct: Product, 
    allProducts: Product[], 
    preferences: any
  ): Product[] {
    return allProducts.filter(product => {
      if (product.id === currentProduct.id) return false;
      
      let score = 0;
      
      // Одинаковая категория +30 очков
      if (product.category === currentProduct.category) {
        score += 30;
      }
      
      // Любимая категория +20 очков
      if (preferences.favoriteCategories.has(product.category)) {
        score += 20;
      }
      
      // Схожий диапазон цен +15 очков
      const priceDiff = Math.abs(product.price - currentProduct.price);
      if (priceDiff < currentProduct.price * 0.3) {
        score += 15;
      }
      
      // Недавно просмотренная категория +10 очков
      if (preferences.recentCategories.has(product.category)) {
        score += 10;
      }
      
      // Популярная категория +5 очков
      if (preferences.categories.get(product.category) > 5) {
        score += 5;
      }
      
      // Скидка делает товар привлекательнее +10 очков
      if (product.discount && product.discount > 10) {
        score += 10;
      }
      
      return score > 0;
    });
  }

  private rankProducts(
    products: Product[], 
    currentProduct: Product, 
    preferences: any
  ): Product[] {
    return products.sort((a, b) => {
      // Комплексная формула ранжирования
      const scoreA = this.calculateProductScore(a, currentProduct, preferences);
      const scoreB = this.calculateProductScore(b, currentProduct, preferences);
      
      return scoreB - scoreA;
    });
  }

  private calculateProductScore(
    product: Product, 
    currentProduct: Product, 
    preferences: any
  ): number {
    let score = 0;
    
    // Категория (самый важный фактор)
    if (product.category === currentProduct.category) score += 50;
    if (preferences.favoriteCategories.has(product.category)) score += 40;
    if (preferences.recentCategories.has(product.category)) score += 30;
    
    // Цена
    const priceDiff = Math.abs(product.price - currentProduct.price);
    const priceRatio = priceDiff / currentProduct.price;
    if (priceRatio < 0.2) score += 25; // Очень похожая цена
    else if (priceRatio < 0.5) score += 15; // Похожая цена
    
    // Скидка
    if (product.discount) {
      score += product.discount * 0.5; // Больше скидка = больше очков
    }
    
    // Популярность категории
    const categoryPopularity = preferences.categories.get(product.category) || 0;
    score += Math.min(categoryPopularity * 2, 20);
    
    return score;
  }

  private generateRecommendationReason(preferences: any): string {
    const reasons = [];
    
    if (preferences.favoriteCategories.size > 0) {
      reasons.push('основано на ваших избранных категориях');
    }
    
    if (preferences.recentCategories.size > 0) {
      reasons.push('учитывает ваши последние просмотры');
    }
    
    if (preferences.categories.size > 0) {
      reasons.push('популярные в этой категории');
    }
    
    return reasons.length > 0 
      ? `Рекомендации: ${reasons.join(', ')}`
      : 'Персональные рекомендации';
  }

  private calculateConfidence(products: Product[]): number {
    if (products.length === 0) return 0;
    
    // Чем больше похожих товаров, тем выше уверенность
    const confidence = Math.min(0.5 + (products.length * 0.1), 0.95);
    
    return Math.round(confidence * 100);
  }
}

export default AIRecommendationEngine.getInstance();
