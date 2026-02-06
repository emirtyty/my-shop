// Ручная система покупок - полный контроль пользователя
import { logger } from './logger';
import { supabase } from './supabase';

interface ManualPurchase {
  id: string;
  buyerId: string;
  sellerId: string;
  productId: string;
  price: number;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  createdAt: string;
  confirmedAt?: string;
  completedAt?: string;
  cancelledAt?: string;
}

interface ManualReview {
  id: string;
  purchaseId: string;
  buyerId: string;
  sellerId: string;
  productId: string;
  rating: number;
  text: string;
  createdAt: string;
}

interface FavoriteItem {
  id: string;
  userId: string;
  productId: string;
  addedAt: string;
}

class ManualPurchaseSystem {
  private static instance: ManualPurchaseSystem;

  private constructor() {}

  static getInstance(): ManualPurchaseSystem {
    if (!ManualPurchaseSystem.instance) {
      ManualPurchaseSystem.instance = new ManualPurchaseSystem();
    }
    return ManualPurchaseSystem.instance;
  }

  // Создание покупки - просто фиксируем намерение
  async createPurchase(buyerId: string, sellerId: string, productId: string, price: number): Promise<ManualPurchase> {
    try {
      // Проверяем, нет ли активной покупки этого товара
      const existingPurchase = await this.getActivePurchase(buyerId, productId);
      if (existingPurchase) {
        throw new Error('У вас уже есть активная покупка этого товара');
      }

      const purchase: ManualPurchase = {
        id: crypto.randomUUID(),
        buyerId,
        sellerId,
        productId,
        price,
        status: 'pending',
        createdAt: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('purchases')
        .insert(purchase)
        .select()
        .single();

      if (error) throw error;

      // Отправляем уведомление о начале покупки
      await this.sendNotification(buyerId, 'purchase_initiated', {
        purchaseId: data.id,
        productId,
        price
      });

      // Добавляем в избранное
      await this.addToFavorites(buyerId, productId);

      logger.log('Manual purchase created:', data.id);
      return data;
    } catch (error) {
      logger.error('Error creating manual purchase:', error);
      throw error;
    }
  }

  // Подтверждение покупки продавцом
  async confirmPurchase(purchaseId: string, sellerId: string): Promise<boolean> {
    try {
      const purchase = await this.getPurchase(purchaseId);
      if (!purchase) {
        throw new Error('Покупка не найдена');
      }

      if (purchase.sellerId !== sellerId) {
        throw new Error('Вы не можете подтвердить эту покупку');
      }

      if (purchase.status !== 'pending') {
        throw new Error('Покупка уже обработана');
      }

      const { error } = await supabase
        .from('purchases')
        .update({
          status: 'confirmed',
          confirmedAt: new Date().toISOString()
        })
        .eq('id', purchaseId);

      if (error) throw error;

      // Отправляем уведомление о подтверждении
      await this.sendNotification(purchase.buyerId, 'purchase_confirmed', {
        purchaseId,
        productId: purchase.productId
      });

      logger.log('Purchase confirmed:', purchaseId);
      return true;
    } catch (error) {
      logger.error('Error confirming purchase:', error);
      throw error;
    }
  }

  // Подтверждение получения покупателем
  async confirmReceived(purchaseId: string, buyerId: string): Promise<boolean> {
    try {
      const purchase = await this.getPurchase(purchaseId);
      if (!purchase) {
        throw new Error('Покупка не найдена');
      }

      if (purchase.buyerId !== buyerId) {
        throw new Error('Вы не можете подтвердить получение этой покупки');
      }

      if (purchase.status !== 'confirmed') {
        throw new Error('Товар еще не подтвержден продавцом');
      }

      const { error } = await supabase
        .from('purchases')
        .update({
          status: 'completed',
          completedAt: new Date().toISOString()
        })
        .eq('id', purchaseId);

      if (error) throw error;

      // Обновляем статистику
      await this.updateSalesStats(purchase);

      // Отправляем уведомление о завершении
      await this.sendNotification(purchase.buyerId, 'purchase_completed', {
        purchaseId,
        productId: purchase.productId,
        price: purchase.price
      });

      // Создаем возможность оставить отзыв
      await this.createReviewOpportunity(purchaseId);

      logger.log('Purchase completed:', purchaseId);
      return true;
    } catch (error) {
      logger.error('Error confirming received:', error);
      throw error;
    }
  }

  // Создание отзыва (только после завершенной покупки)
  async createReview(
    purchaseId: string,
    buyerId: string,
    rating: number,
    text: string
  ): Promise<void> {
    try {
      const purchase = await this.getPurchase(purchaseId);
      if (!purchase) {
        throw new Error('Покупка не найдена');
      }

      if (purchase.buyerId !== buyerId) {
        throw new Error('Вы не можете оставить отзыв для этой покупки');
      }

      if (purchase.status !== 'completed') {
        throw new Error('Отзыв можно оставить только после завершенной покупки');
      }

      // Проверяем, что отзыв еще не оставлен
      const existingReview = await this.getReviewByPurchase(purchaseId);
      if (existingReview) {
        throw new Error('Вы уже оставили отзыв для этой покупки');
      }

      const review: ManualReview = {
        id: crypto.randomUUID(),
        purchaseId,
        buyerId,
        sellerId: purchase.sellerId,
        productId: purchase.productId,
        rating,
        text,
        createdAt: new Date().toISOString()
      };

      const { error } = await supabase
        .from('reviews')
        .insert(review);

      if (error) throw error;

      // Обновляем рейтинги
      await this.updateRatings(purchase.productId, purchase.sellerId);

      // Отправляем уведомление об отзыве
      await this.sendNotification(purchase.sellerId, 'new_review', {
        purchaseId,
        productId: purchase.productId,
        rating,
        text: text.substring(0, 100) + '...'
      });

      logger.log('Review created for purchase:', review.id);
    } catch (error) {
      logger.error('Error creating review:', error);
      throw error;
    }
  }

  // Создание возможности оставить отзыв
  private async createReviewOpportunity(purchaseId: string): Promise<void> {
    try {
      const opportunity = {
        id: crypto.randomUUID(),
        purchaseId,
        buyerId: (await this.getPurchase(purchaseId))?.buyerId || '',
        productId: (await this.getPurchase(purchaseId))?.productId || '',
        status: 'available',
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString() // 14 дней
      };

      const { error } = await supabase
        .from('review_opportunities')
        .insert(opportunity);

      if (error) throw error;

      logger.log('Review opportunity created:', opportunity.id);
    } catch (error) {
      logger.error('Error creating review opportunity:', error);
    }
  }

  // Получение отзыва по покупке
  private async getReviewByPurchase(purchaseId: string): Promise<ManualReview | null> {
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

  // Получение покупки
  private async getPurchase(purchaseId: string): Promise<ManualPurchase | null> {
    try {
      const { data, error } = await supabase
        .from('purchases')
        .select('*')
        .eq('id', purchaseId)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data;
    } catch (error) {
      logger.error('Error getting purchase:', error);
      return null;
    }
  }

  // Получение активных покупок
  async getActivePurchases(buyerId?: string, sellerId?: string): Promise<ManualPurchase[]> {
    try {
      let query = supabase
        .from('purchases')
        .select('*')
        .in('status', ['pending', 'confirmed']);

      if (buyerId) {
        query = query.eq('buyerId', buyerId);
      }
      if (sellerId) {
        query = query.eq('sellerId', sellerId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data || [];
    } catch (error) {
      logger.error('Error getting active purchases:', error);
      return [];
    }
  }

  // Добавление в избранное
  async addToFavorites(userId: string, productId: string): Promise<void> {
    try {
      // Проверяем, что еще нет в избранном
      const { data: existing, error } = await supabase
        .from('favorites')
        .select('*')
        .eq('userId', userId)
        .eq('productId', productId)
        .single();

      if (error && error.code !== 'PGRST116') return; // Не существует - это нормально

      if (existing) return; // Уже в избранном

      const { error: insertError } = await supabase
        .from('favorites')
        .insert({
          id: crypto.randomUUID(),
          userId,
          productId,
          addedAt: new Date().toISOString()
        });

      if (insertError) throw insertError;

      // Отправляем уведомление
      await this.sendNotification(userId, 'favorite_added', {
        productId
      });

      logger.log('Added to favorites:', productId);
    } catch (error) {
      logger.error('Error adding to favorites:', error);
    }
  }

  // Получение избранных товаров
  async getUserFavorites(userId: string): Promise<FavoriteItem[]> {
    try {
      const { data, error } = await supabase
        .from('favorites')
        .select('*, product_market(*)')
        .eq('userId', userId)
        .order('addedAt', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      logger.error('Error getting user favorites:', error);
      return [];
    }
  }

  // Отправка уведомления
  async sendNotification(
    userId: string, 
    type: 'purchase_initiated' | 'purchase_confirmed' | 'purchase_completed' | 'new_review' | 'favorite_added',
    data?: any
  ): Promise<void> {
    try {
      const notification = {
        id: crypto.randomUUID(),
        userId,
        type,
        title: this.getNotificationTitle(type, data),
        message: this.getNotificationMessage(type, data),
        data,
        read: false,
        createdAt: new Date().toISOString()
      };

      await supabase
        .from('notifications')
        .insert(notification);

      logger.log(`Notification sent to ${userId}: ${type}`);
    } catch (error) {
      logger.error('Error sending notification:', error);
    }
  }

  // Получение заголовка уведомления
  private getNotificationTitle(type: string, data?: any): string {
    const titles = {
      purchase_initiated: '🛒 Начало покупки',
      purchase_confirmed: '✅ Покупка подтверждена',
      purchase_completed: '🎉 Покупка завершена',
      new_review: '⭐ Новый отзыв на ваш товар',
      favorite_added: '❤️ Товар добавлен в избранное'
    };

    return titles[type as keyof typeof titles] || '🔔 Уведомление';
  }

  // Получение сообщения уведомления
  private getNotificationMessage(type: string, data?: any): string {
    const messages = {
      purchase_initiated: `Вы начали покупку товара. Нажмите "Подтвердить", когда будете готовы.`,
      purchase_confirmed: `Продавец подтвердил вашу покупку. Нажмите "Подтвердить доставку", когда товар будет доставлен.`,
      purchase_completed: `Покупка завершена! Оставьте отзыв, чтобы помочь другим покупателям.`,
      new_review: `Пользователь оставил отзыв на ваш товар: ${data?.rating}⭐`,
      favorite_added: `Товар добавлен в избранное. Вы можете найти его в разделе "Избранное".`
    };

    return messages[type as keyof typeof messages] || 'Уведомление';
  }

  // Обновление статистики продаж
  private async updateSalesStats(purchase: ManualPurchase): Promise<void> {
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

  // Получение отзывов продавца
  private async getSellerReviews(sellerId: string): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('reviews')
        .select('rating')
        .eq('sellerId', sellerId);

      if (error) throw error;
      return data || [];
    } catch (error) {
      logger.error('Error getting seller reviews:', error);
      return [];
    }
  }

  // Отмена покупки
  async cancelPurchase(purchaseId: string, reason: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('purchases')
        .update({
          status: 'cancelled',
          cancelledAt: new Date().toISOString()
        })
        .eq('id', purchaseId);

      if (error) throw error;

      logger.log('Purchase cancelled:', purchaseId, reason);
    } catch (error) {
      logger.error('Error cancelling purchase:', error);
    }
  }

  // Получение статистики
  async getStats(): Promise<{
    totalPurchases: number;
    completedPurchases: number;
    totalRevenue: number;
    averageRating: number;
    totalReviews: number;
    totalFavorites: number;
  }> {
    try {
      const { data: purchases, error } = await supabase
        .from('purchases')
        .select('status, price');

      if (error) throw error;

      const totalPurchases = purchases?.length || 0;
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

      const { data: favorites, error: favoritesError } = await supabase
        .from('favorites')
        .select('id')
        .count();

      const totalFavorites = favoritesError ? 0 : (favorites?.[0]?.count || 0);

      return {
        totalPurchases,
        completedPurchases,
        totalRevenue,
        averageRating: Math.round(averageRating * 10) / 10,
        totalReviews,
        totalFavorites
      };
    } catch (error) {
      logger.error('Error getting stats:', error);
      return {
        totalPurchases: 0,
        completedPurchases: 0,
        totalRevenue: 0,
        averageRating: 0,
        totalReviews: 0,
        totalFavorites: 0
      };
    }
  }

  // Получение непрочитенных уведомлений
  async getUnreadNotifications(userId: string): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('userId', userId)
        .eq('read', false)
        .order('createdAt', { ascending: false })
        .limit(20);

      if (error) throw error;
      return data || [];
    } catch (error) {
      logger.error('Error getting unread notifications:', error);
      return [];
    }
  }
}

export default ManualPurchaseSystem.getInstance();
