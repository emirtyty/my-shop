// Упрощенная система отслеживания покупок
import { logger } from './logger';
import { supabase } from './supabase';

interface SimplePurchase {
  id: string;
  buyerId: string;
  sellerId: string;
  productId: string;
  price: number;
  status: 'pending' | 'confirmed' | 'completed';
  createdAt: string;
  confirmedAt?: string;
  completedAt?: string;
  verificationCode: string;
}

interface SimpleReview {
  id: string;
  purchaseId: string;
  buyerId: string;
  sellerId: string;
  productId: string;
  rating: number;
  text: string;
  verified: boolean; // Только для реальных покупок
  createdAt: string;
}

class SimplePurchaseTracking {
  private static instance: SimplePurchaseTracking;

  private constructor() {}

  static getInstance(): SimplePurchaseTracking {
    if (!SimplePurchaseTracking.instance) {
      SimplePurchaseTracking.instance = new SimplePurchaseTracking();
    }
    return SimplePurchaseTracking.instance;
  }

  // Создание покупки - просто фиксируем намерение
  async createPurchase(buyerId: string, sellerId: string, productId: string, price: number): Promise<SimplePurchase> {
    try {
      const purchase: SimplePurchase = {
        id: crypto.randomUUID(),
        buyerId,
        sellerId,
        productId,
        price,
        status: 'pending',
        createdAt: new Date().toISOString(),
        verificationCode: Math.random().toString(36).substring(2, 8).toUpperCase()
      };

      const { data, error } = await supabase
        .from('purchases')
        .insert(purchase)
        .select()
        .single();

      if (error) throw error;

      logger.log('Purchase created:', data.id);
      return data;
    } catch (error) {
      logger.error('Error creating purchase:', error);
      throw error;
    }
  }

  // Подтверждение покупки - продавец просто нажимает кнопку
  async confirmPurchase(purchaseId: string, sellerId: string): Promise<boolean> {
    try {
      const { data: purchase, error } = await supabase
        .from('purchases')
        .select('*')
        .eq('id', purchaseId)
        .eq('sellerId', sellerId)
        .single();

      if (error || !purchase) {
        throw new Error('Покупка не найдена');
      }

      if (purchase.status !== 'pending') {
        throw new Error('Покупка уже обработана');
      }

      const { error: updateError } = await supabase
        .from('purchases')
        .update({
          status: 'confirmed',
          confirmedAt: new Date().toISOString()
        })
        .eq('id', purchaseId);

      if (updateError) throw updateError;

      // Обновляем статистику
      await this.updateSalesStats(purchase);

      logger.log('Purchase confirmed:', purchaseId);
      return true;
    } catch (error) {
      logger.error('Error confirming purchase:', error);
      throw error;
    }
  }

  // Завершение покупки - покупатель нажимает "Получил"
  async completePurchase(purchaseId: string, buyerId: string): Promise<boolean> {
    try {
      const { data: purchase, error } = await supabase
        .from('purchases')
        .select('*')
        .eq('id', purchaseId)
        .eq('buyerId', buyerId)
        .single();

      if (error || !purchase) {
        throw new Error('Покупка не найдена');
      }

      if (purchase.status !== 'confirmed') {
        throw new Error('Покупка еще не подтверждена');
      }

      const { error: updateError } = await supabase
        .from('purchases')
        .update({
          status: 'completed',
          completedAt: new Date().toISOString()
        })
        .eq('id', purchaseId);

      if (updateError) throw updateError;

      logger.log('Purchase completed:', purchaseId);
      return true;
    } catch (error) {
      logger.error('Error completing purchase:', error);
      throw error;
    }
  }

  // Создание отзыва - только после завершенной покупки
  async createReview(purchaseId: string, buyerId: string, rating: number, text: string): Promise<SimpleReview> {
    try {
      // Проверяем, что покупка завершена и принадлежит этому пользователю
      const { data: purchase, error } = await supabase
        .from('purchases')
        .select('*')
        .eq('id', purchaseId)
        .eq('buyerId', buyerId)
        .eq('status', 'completed')
        .single();

      if (error || !purchase) {
        throw new Error('Покупка не найдена или не завершена');
      }

      // Проверяем, что отзыв еще не оставлен
      const existingReview = await this.getReviewByPurchase(purchaseId);
      if (existingReview) {
        throw new Error('Вы уже оставили отзыв для этой покупки');
      }

      const review: SimpleReview = {
        id: crypto.randomUUID(),
        purchaseId,
        buyerId,
        sellerId: purchase.sellerId,
        productId: purchase.productId,
        rating,
        text,
        verified: true, // Только реальные покупки
        createdAt: new Date().toISOString()
      };

      const { data, error: insertError } = await supabase
        .from('reviews')
        .insert(review)
        .select()
        .single();

      if (insertError) throw insertError;

      // Обновляем рейтинги
      await this.updateRatings(purchase.productId, purchase.sellerId);

      logger.log('Review created:', data.id);
      return data;
    } catch (error) {
      logger.error('Error creating review:', error);
      throw error;
    }
  }

  // Получение отзыва по покупке
  async getReviewByPurchase(purchaseId: string): Promise<SimpleReview | null> {
    try {
      const { data, error } = await supabase
        .from('reviews')
        .select('*')
        .eq('purchaseId', purchaseId)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data;
    } catch (error) {
      logger.error('Error getting review by purchase:', error);
      return null;
    }
  }

  // Получение отзывов товара
  async getProductReviews(productId: string): Promise<SimpleReview[]> {
    try {
      const { data, error } = await supabase
        .from('reviews')
        .select('*')
        .eq('productId', productId)
        .order('createdAt', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      logger.error('Error getting product reviews:', error);
      return [];
    }
  }

  // Получение отзывов продавца
  async getSellerReviews(sellerId: string): Promise<SimpleReview[]> {
    try {
      const { data, error } = await supabase
        .from('reviews')
        .select('*')
        .eq('sellerId', sellerId)
        .order('createdAt', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      logger.error('Error getting seller reviews:', error);
      return [];
    }
  }

  // Обновление статистики продаж
  private async updateSalesStats(purchase: SimplePurchase): Promise<void> {
    try {
      // Обновляем статистику товара
      await supabase.rpc('increment_product_sales', {
        p_product_id: purchase.productId,
        p_amount: purchase.price
      });

      // Обновляем статистику продавца
      await supabase.rpc('increment_seller_sales', {
        p_seller_id: purchase.sellerId,
        p_amount: purchase.price
      });
    } catch (error) {
      logger.error('Error updating sales stats:', error);
    }
  }

  // Обновление рейтингов
  private async updateRatings(productId: string, sellerId: string): Promise<void> {
    try {
      // Получаем все отзывы товара
      const { data: reviews, error } = await supabase
        .from('reviews')
        .select('rating')
        .eq('productId', productId);

      if (error || !reviews || reviews.length === 0) return;

      const averageRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;

      // Обновляем рейтинг товара
      await supabase
        .from('product_market')
        .update({ rating: averageRating })
        .eq('id', productId);

      // Обновляем рейтинг продавца
      const sellerReviews = await this.getSellerReviews(sellerId);
      if (sellerReviews.length > 0) {
        const sellerAvgRating = sellerReviews.reduce((sum, r) => sum + r.rating, 0) / sellerReviews.length;
        
        await supabase
          .from('sellers')
          .update({ rating: sellerAvgRating })
          .eq('id', sellerId);
      }
    } catch (error) {
      logger.error('Error updating ratings:', error);
    }
  }

  // Получение покупок пользователя
  async getUserPurchases(buyerId: string): Promise<SimplePurchase[]> {
    try {
      const { data, error } = await supabase
        .from('purchases')
        .select('*')
        .eq('buyerId', buyerId)
        .order('createdAt', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      logger.error('Error getting user purchases:', error);
      return [];
    }
  }

  // Получение покупок продавца
  async getSellerPurchases(sellerId: string): Promise<SimplePurchase[]> {
    try {
      const { data, error } = await supabase
        .from('purchases')
        .select('*')
        .eq('sellerId', sellerId)
        .order('createdAt', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      logger.error('Error getting seller purchases:', error);
      return [];
    }
  }

  // Получение статистики
  async getStats(): Promise<{
    totalPurchases: number;
    confirmedPurchases: number;
    completedPurchases: number;
    totalRevenue: number;
    totalReviews: number;
    averageRating: number;
  }> {
    try {
      const { data: purchases, error } = await supabase
        .from('purchases')
        .select('status, price');

      if (error) throw error;

      const totalPurchases = purchases?.length || 0;
      const confirmedPurchases = purchases?.filter(p => p.status === 'confirmed').length || 0;
      const completedPurchases = purchases?.filter(p => p.status === 'completed').length || 0;
      const totalRevenue = purchases?.reduce((sum, p) => sum + p.price, 0) || 0;

      const { data: reviews, error: reviewsError } = await supabase
        .from('reviews')
        .select('rating');

      if (reviewsError) throw reviewsError;

      const totalReviews = reviews?.length || 0;
      const averageRating = totalReviews > 0 
        ? reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews 
        : 0;

      return {
        totalPurchases,
        confirmedPurchases,
        completedPurchases,
        totalRevenue,
        totalReviews,
        averageRating: Math.round(averageRating * 10) / 10
      };
    } catch (error) {
      logger.error('Error getting stats:', error);
      return {
        totalPurchases: 0,
        confirmedPurchases: 0,
        completedPurchases: 0,
        totalRevenue: 0,
        totalReviews: 0,
        averageRating: 0
      };
    }
  }
}

export default SimplePurchaseTracking.getInstance();
