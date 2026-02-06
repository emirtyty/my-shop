// Интерактивная система покупок с типами и уведомлениями
import { logger } from './logger';
import { supabase } from './supababase';

interface InteractivePurchase {
  id: string;
  buyerId: string;
  sellerId: string;
  productId: string;
  price: number;
  type: 'instant' | 'preorder' | 'reservation';
  status: 'initiated' | 'confirmed' | 'delivered' | 'completed' | 'cancelled';
  createdAt: string;
  confirmedAt?: string;
  deliveredAt?: string;
  completedAt?: string;
  expiresAt?: string; // для резерваций
  notificationSent: {
    initiated?: boolean;
    confirmed?: boolean;
    delivered?: boolean;
    completed?: boolean;
    reviewRequest?: boolean;
  };
}

interface PurchaseNotification {
  id: string;
  userId: string;
  type: 'purchase_initiated' | 'purchase_confirmed' | 'purchase_delivered' | 'purchase_completed' | 'review_request' | 'favorite_added';
  title: string;
  message: string;
  data?: any;
  read: boolean;
  createdAt: string;
}

interface FavoriteItem {
  id: string;
  userId: string;
  productId: string;
  addedAt: string;
}

interface ReviewOpportunity {
  id: string;
  purchaseId: string;
  buyerId: string;
  productId: string;
  status: 'available' | 'used' | 'expired';
  createdAt: string;
  expiresAt: string;
  remindedAt?: string;
}

class InteractivePurchaseSystem {
  private static instance: InteractivePurchaseSystem;
  private notificationQueue: Map<string, PurchaseNotification> = new Map();

  private constructor() {
    this.startNotificationProcessor();
    this.startExpirationChecker();
  }

  static getInstance(): InteractivePurchaseSystem {
    if (!InteractivePurchaseSystem.instance) {
      InteractivePurchaseSystem.instance = new InteractivePurchaseSystem();
    }
    return InteractivePurchaseSystem.instance;
  }

  // Создание покупки с типом
  async createPurchase(
    buyerId: string,
    sellerId: string,
    productId: string,
    price: number,
    type: 'instant' | 'preorder' | 'reservation' = 'instant'
  ): Promise<InteractivePurchase> {
    try {
      // Проверяем, нет ли активной покупки этого товара
      const existingPurchase = await this.getActivePurchase(buyerId, productId);
      if (existingPurchase) {
        throw new Error('У вас уже есть активная покупка этого товара');
      }

      let expiresAt: string | undefined;
      
      // Для резерваций устанавливаем срок действия
      if (type === 'reservation') {
        expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 дней
      }
      // Для предзаказов устанавливаем дату выхода
      else if (type === 'preorder') {
        const { data: product } = await supabase
          .from('product_market')
          .select('preorder_release_date')
          .eq('id', productId)
          .single();
        
        if (product?.preorder_release_date) {
          expiresAt = new Date(product.preorder_release_date).toISOString();
        }
      }

      const purchase: InteractivePurchase = {
        id: crypto.randomUUID(),
        buyerId,
        sellerId,
        productId,
        price,
        type,
        status: 'initiated',
        createdAt: new Date().toISOString(),
        expiresAt,
        notificationSent: {}
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
        type,
        price,
        expiresAt
      });

      // Для мгновенных покупок сразу завершаем
      if (type === 'instant') {
        await this.completePurchase(data.id);
      }

      logger.log(`Interactive purchase created: ${data.id} (${type})`);
      return data;
    } catch (error) {
      logger.error('Error creating interactive purchase:', error);
      throw error;
    }
  }

  // Подтверждение покупки (для предзаказов и резервов)
  async confirmPurchase(purchaseId: string, sellerId: string): Promise<boolean> {
    try {
      const purchase = await this.getPurchase(purchaseId);
      if (!purchase) {
        throw new Error('Покупка не найдена');
      }

      if (purchase.sellerId !== sellerId) {
        throw new Error('Вы не можете подтвердить эту покупку');
      }

      if (purchase.status !== 'initiated') {
        throw newError('Покупка уже обработана');
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
        productId: purchase.productId,
        type: purchase.type,
        estimatedDelivery: this.getEstimatedDelivery(purchase.type)
      });

      // Для предзаказов уведомляем о дате выхода
      if (purchase.type === 'preorder') {
        await this.sendNotification(purchase.buyerId, 'preorder_confirmed', {
          purchaseId,
          productId: purchase.productId,
          releaseDate: purchase.expiresAt
        });
      }

      logger.log('Purchase confirmed:', purchaseId);
      return true;
    } catch (error) {
      logger.error('Error confirming purchase:', error);
      throw error;
    }
  }

  // Подтверждение доставки
  async confirmDelivery(purchaseId: string, sellerId: string): Promise<boolean> {
    try {
      const purchase = await this.getPurchase(purchaseId);
      if (!purchase) {
        throw new Error('Покупка не найдена');
      }

      if (purchase.sellerId !== sellerId) {
        throw new Error('Вы не можете подтвердить доставку этой покупки');
      }

      if (purchase.status !== 'confirmed') {
        throw new Error('Покупка еще не подтверждена');
      }

      const { error } = await supabase
        .from('purchases')
        .update({
          status: 'delivered',
          deliveredAt: new Date().toISOString()
        })
        .eq('id', purchaseId);

      if (error) throw error;

      // Отправляем уведомление о доставке
      await this.sendNotification(purchase.buyerId, 'purchase_delivered', {
        purchaseId,
        productId: purchase.productId,
        type: purchase.type
      });

      // Создаем возможность оставить отзыв через 1 час
      setTimeout(() => {
        this.createReviewOpportunity(purchaseId);
      }, 60 * 60 * 1000);

      logger.log('Purchase delivered:', purchaseId);
      return true;
    } catch (error) {
      logger.error('Error confirming delivery:', error);
      throw error;
    }
  }

  // Подтверждение получения
  async confirmReceived(purchaseId: string, buyerId: string): Promise<boolean> {
    try {
      const purchase = await this.getPurchase(purchaseId);
      if (!purchase) {
        throw new Error('Покупка не найдена');
      }

      if (purchase.buyerId !== buyerId) {
        throw new Error('Вы не можете подтвердить получение этой покупки');
      }

      if (purchase.status !== 'delivered') {
        throw new Error('Товар еще не доставлен');
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
        type: purchase.type,
        price: purchase.price
      });

      // Создаем возможность оставить отзыв
      await this.createReviewOpportunity(purchaseId);

      // Добавляем в избранное (если пользователь еще не добавил)
      await this.addToFavoritesIfNotExists(purchase.buyerId, purchase.productId);

      logger.log('Purchase completed:', purchaseId);
      return true;
    } catch (error) {
      logger.error('Error confirming received:', error);
      throw error;
    }
  }

  // Создание возможности оставить отзыв
  private async createReviewOpportunity(purchaseId: string): Promise<void> {
    try {
      const purchase = await this.getPurchase(purchaseId);
      if (!purchase) return;

      const opportunity = {
        id: crypto.randomUUID(),
        purchaseId,
        buyerId: purchase.buyerId,
        productId: purchase.productId,
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

  // Добавление в избранное
  private async addToFavoritesIfNotExists(buyerId: string, productId: string): Promise<void> {
    try {
      const { data: existing, error } = await supabase
        .from('favorites')
        .select('*')
        .eq('userId', buyerId)
        .eq('productId', productId)
        .single();

      if (error && error.code !== 'PGRST116') return; // Не существует - это нормально

      if (existing) return; // Уже в избранном

      const { error: insertError } = await supabase
        .from('favorites')
        .insert({
          id: crypto.randomUUID(),
          userId: buyerId,
          productId,
          addedAt: new Date().toISOString()
        });

      if (insertError) throw insertError;

      // Отправляем уведомление о добавлении в избранное
      await this.sendNotification(buyerId, 'favorite_added', {
        productId
      });

      logger.log('Added to favorites:', productId);
    } catch (error) {
      logger.error('Error adding to favorites:', error);
    }
  }

  // Создание отзыва
  async createReview(
    purchaseId: string,
    buyerId: string,
    rating: number,
    text: string,
    images: string[] = []
  ): Promise<void> {
    try {
      const opportunity = await this.getReviewOpportunity(purchaseId, buyerId);
      if (!opportunity || opportunity.status !== 'available') {
        throw new Error('Вы не можете оставить отзыв для этой покупки');
      }

      const purchase = await this.getPurchase(purchaseId);
      if (!purchase) {
        throw new Error('Покупка не найдена');
      }

      // Создаем отзыв
      const { error } = await supabase
        .from('reviews')
        .insert({
          purchaseId,
          buyerId,
          sellerId: purchase.sellerId,
          productId: purchase.productId,
          rating,
          text,
          images,
          createdAt: new Date().toISOString()
        });

      if (error) throw error;

      // Обновляем возможность отзыва
      await supabase
        .from('review_opportunities')
        .update({ status: 'used' })
        .eq('id', opportunity.id);

      // Обновляем рейтинги
      await this.updateRatings(purchase.productId, purchase.sellerId);

      // Отправляем уведомление об отзыве
      await this.sendNotification(purchase.sellerId, 'new_review', {
        purchaseId,
        productId: purchase.productId,
        rating,
        text: text.substring(0, 100) + '...'
      });

      logger.log('Review created for purchase:', purchaseId);
    } catch (error) {
      logger.error('Error creating review:', error);
      throw error;
    }
  }

  // Отправка уведомления
  async sendNotification(
    userId: string, 
    type: PurchaseNotification['type'], 
    data?: any
  ): Promise<void> {
    try {
      const notification: PurchaseNotification = {
        id: crypto.randomUUID(),
        userId,
        type,
        title: this.getNotificationTitle(type, data),
        message: this.getNotificationMessage(type, data),
        data,
        read: false,
        createdAt: new Date().toISOString()
      };

      // Сохраняем в базу
      await supabase
        .from('notifications')
        .insert(notification);

      // В реальном приложении здесь будет отправка push-уведомления
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
      purchase_delivered: '📦 Товар доставлен',
      purchase_completed: '🎉 Покупка завершена',
      review_request: '⭐ Оцените покупку',
      favorite_added: '❤️ Добавлено в избранное',
      preorder_confirmed: '📅 Предзаказ подтвержден',
      new_review: '⭐ Новый отзыв'
    };

    return titles[type as keyof typeof titles] || '🔔 Уведомление';
  }

  // Получение сообщения уведомления
  private getNotificationMessage(type: string, data?: any): string {
    const messages = {
      purchase_initiated: `Вы начали покупку товара. ${data?.type === 'preorder' ? 'Это предзаказ.' : ''}`,
      purchase_confirmed: `Продавец подтвердил вашу покупку. ${data?.estimatedDelivery ? `Ожидаемая доставка: ${data.estimatedDelivery}` : ''}`,
      purchase_delivered: 'Товар доставлен! Нажмите "Получил", когда заберете его.',
      purchase_completed: `Покупка завершена! Оцените ваш опыт и оставьте отзыв.`,
      review_request: 'Как вам понравилась покупка? Ваш отзыв поможет другим покупателям.',
      favorite_added: 'Товар добавлен в избранное.',
      preorder_confirmed: `Предзаказ подтвержден! Ожидайте даты выхода: ${data?.releaseDate}`,
      new_review: `Пользователь оставил отзыв на ваш товар: ${data?.rating}⭐`
    };

    return messages[type as keyof typeof messages] || 'Уведомление';
  }

  // Получение оценки доставки
  private getEstimatedDelivery(type: string): string {
    const deliveryTimes = {
      instant: '1-3 дня',
      preorder: 'По дате выхода',
      reservation: 'В течение 7 дней'
    };

    return deliveryTimes[type as keyof typeof deliveryTimes] || '3-5 дней';
  }

  // Получение покупки
  private async getPurchase(purchaseId: string): Promise<InteractivePurchase | null> {
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

  // Получение возможности отзыва
  private async getReviewOpportunity(purchaseId: string, buyerId?: string): Promise<ReviewOpportunity | null> {
    try {
      let query = supabase
        .from('review_opportunities')
        .select('*')
        .eq('purchaseId', purchaseId)
        .eq('status', 'available');

      if (buyerId) {
        query = query.eq('buyerId', buyerId);
      }

      const { data, error } = await query.single();

      if (error && error.code !== 'PANDC') throw error;
      return data;
    } catch (error) {
      logger.error('Error getting review opportunity:', error);
      return null;
    }
  }

  // Получение активных покупок
  async getActivePurchases(buyerId?: string, sellerId?: string): Promise<InteractivePurchase[]> {
    try {
      let query = supabase
        .from('purchases')
        .select('*')
        .in('status', ['initiated', 'confirmed', 'delivered']);

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

  // Получение избранных товаров
  async getUserFavorites(buyerId: string): Promise<FavoriteItem[]> {
    try {
      const { data, error } = await supabase
        .from('favorites')
        .select('*, product_market(*)')
        .eq('userId', buyerId)
        .order('addedAt', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      logger.error('Error getting user favorites:', error);
      return [];
    }
  }

  // Обновление статистики продаж
  private async updateSalesStats(purchase: InteractivePurchase): Promise<void> {
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

  // Обработка истечения срока действия
  private startExpirationChecker(): void {
    setInterval(async () => {
      try {
        const now = new Date();
        
        // Проверяем истекшие резервации
        const { data: expiredReservations, error } = await supabase
          .from('purchases')
          .select('*')
          .eq('type', 'reservation')
          .eq('status', 'initiated')
          .lt('expiresAt', now.toISOString());

        if (expiredReservations) {
          for (const reservation of expiredReservations) {
            await this.cancelPurchase(reservation.id, 'Срок резервации истек');
          }
        }

        // Проверяем истекшие возможности отзывов
        const { data: expiredOpportunities, error: opportunitiesError } = await supabase
          .from('review_opportunities')
          .select('*')
          .eq('status', 'available')
          .lt('expiresAt', now.toISOString());

        if (expiredOpportunities) {
          for (const opportunity of expiredOpportunities) {
            await this.expireReviewOpportunity(opportunity.id);
          }
        }
      } catch (error) {
        logger.error('Error checking expirations:', error);
      }
    }, 60 * 60 * 1000); // Проверяем каждый час
  }

  // Отмена покупки
  private async cancelPurchase(purchaseId: string, reason: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('purchases')
        .update({
          status: 'cancelled',
          updatedAt: new Date().toISOString()
        })
        .eq('id', purchaseId);

      if (error) throw error;

      logger.log('Purchase cancelled:', purchaseId, reason);
    } catch (error) {
      logger.error('Error cancelling purchase:', error);
    }
  }

  // Истечение возможности отзыва
  private async expireReviewOpportunity(opportunityId: string): Promise<void> {
    try {
      await supabase
        .from('review_opportunities')
        .update({ status: 'expired' })
        .eq('id', opportunityId);
    } catch (error) {
      logger.error('Error expiring review opportunity:', error);
    }
  }

  // Обработка очереди уведомлений
  private startNotificationProcessor(): void {
    setInterval(async () => {
      try {
        // Получаем непрочитанные уведомления
        const { data: notifications, error } = await supabase
          .from('notifications')
          .select('*')
          .eq('read', false)
          .order('createdAt', { ascending: true })
          .limit(50);

        if (error) throw error;

        for (const notification of notifications || []) {
          // В реальном приложении здесь будет отправка push-уведомления
          logger.log(`Processing notification: ${notification.type} for ${notification.userId}`);
          
          // Помечаем как прочитанное
          await supabase
            .from('notifications')
            .update({ read: true })
            .eq('id', notification.id);
        }
      } catch (error) {
        logger.error('Error processing notifications:', error);
      }
    }, 30 * 1000); // Проверяем каждые 30 секунд
  }

  // Получение непрочитанных уведомлений
  async getUnreadNotifications(userId: string): Promise<PurchaseNotification[]> {
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

  // Получение статистики
  async getStats(): Promise<{
    totalPurchases: number;
    instantPurchases: number;
    preorderPurchases: number;
    reservationPurchases: number;
    completedPurchases: number;
    totalRevenue: number;
    averageRating: number;
    totalReviews: number;
    totalFavorites: number;
    unreadNotifications: number;
  }> {
    try {
      const { data: purchases, error } = await supabase
        .from('purchases')
        .select('type, status, price');

      if (error) throw error;

      const totalPurchases = purchases?.length || 0;
      const instantPurchases = purchases?.filter(p => p.type === 'instant').length || 0;
      const preorderPurchases = purchases?.filter(p => p.type === 'preorder').length || 0;
      const reservationPurchases = purchases?.filter(p => p.type === 'reservation').length || 0;
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

      const { data: notifications, error: notificationsError } = await supabase
        .from('notifications')
        .select('id')
        .eq('read', false)
        .count();

      const unreadNotifications = notificationsError ? 0 : (notifications?.[0]?.count || 0);

      return {
        totalPurchases,
        instantPurchases,
        preorderPurchases,
        reservationPurchases,
        completedPurchases,
        totalRevenue,
        averageRating: Math.round(averageRating * 10) / 10,
        totalReviews,
        totalFavorites,
        unreadNotifications
      };
    } catch (error) {
      logger.error('Error getting stats:', error);
      return {
        totalPurchases: 0,
        instantPurchases: 0,
        preorderPurchases: 0,
        reservationPurchases: 0,
        completedPurchases: 0,
        totalRevenue: 0,
        averageRating: 0,
        totalReviews: 0,
        totalFavorites: 0,
        unreadNotifications: 0
      };
    }
  }
}

export default InteractivePurchaseSystem.getInstance();
