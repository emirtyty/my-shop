// Система отзывов и рейтингов с привязкой к реальным покупкам
import { logger } from './logger';
import { supabase } from './supabase';

interface Review {
  id: string;
  purchaseId: string;
  buyerId: string;
  sellerId: string;
  productId: string;
  rating: number; // 1-5
  title: string;
  content: string;
  pros: string[];
  cons: string[];
  images: string[];
  verified: boolean; // Подтвержденная покупка
  helpful: number;
  notHelpful: number;
  sellerResponse?: string;
  status: 'published' | 'pending' | 'hidden' | 'deleted';
  createdAt: string;
  updatedAt: string;
}

interface ReviewOpportunity {
  id: string;
  purchaseId: string;
  buyerId: string;
  sellerId: string;
  productId: string;
  status: 'available' | 'used' | 'expired';
  createdAt: string;
  expiresAt: string;
  remindedAt?: string;
}

interface RatingBreakdown {
  productId: string;
  sellerId: string;
  averageRating: number;
  totalReviews: number;
  ratingDistribution: { [key: number]: number };
  verifiedReviews: number;
  recentReviews: number;
  lastReviewDate: string;
}

class ReviewSystem {
  private static instance: ReviewSystem;

  private constructor() {}

  static getInstance(): ReviewSystem {
    if (!ReviewSystem.instance) {
      ReviewSystem.instance = new ReviewSystem();
    }
    return ReviewSystem.instance;
  }

  // Создание отзыва (только после реальной покупки)
  async createReview(
    purchaseId: string,
    rating: number,
    title: string,
    content: string,
    pros: string[] = [],
    cons: string[] = [],
    images: string[] = []
  ): Promise<Review> {
    try {
      // Проверяем, что пользователь имеет право оставить отзыв
      const opportunity = await this.getReviewOpportunity(purchaseId);
      if (!opportunity || opportunity.status !== 'available') {
        throw new Error('Вы не можете оставить отзыв для этой покупки');
      }

      // Получаем информацию о покупке
      const { data: purchase, error: purchaseError } = await supabase
        .from('purchase_intents')
        .select('*')
        .eq('id', purchaseId)
        .eq('status', 'completed')
        .single();

      if (purchaseError || !purchase) {
        throw new Error('Покупка не найдена или не завершена');
      }

      // Проверяем, что отзыв еще не оставлен
      const existingReview = await this.getReviewByPurchase(purchaseId);
      if (existingReview) {
        throw new Error('Вы уже оставили отзыв для этой покупки');
      }

      // Создаем отзыв
      const reviewData: Omit<Review, 'id' | 'createdAt' | 'updatedAt' | 'helpful' | 'notHelpful'> = {
        purchaseId,
        buyerId: purchase.buyerId,
        sellerId: purchase.sellerId,
        productId: purchase.productId,
        rating,
        title,
        content,
        pros,
        cons,
        images,
        verified: true, // Только подтвержденные покупки
        status: 'published'
      };

      const { data: review, error } = await supabase
        .from('reviews')
        .insert(reviewData)
        .select()
        .single();

      if (error) throw error;

      // Обновляем возможность отзыва
      await this.markReviewOpportunityUsed(opportunity.id);

      // Обновляем рейтинги
      await this.updateProductRating(purchase.productId);
      await this.updateSellerRating(purchase.sellerId);

      logger.log('Review created:', review.id);
      return review;
    } catch (error) {
      logger.error('Error creating review:', error);
      throw error;
    }
  }

  // Получение возможности оставить отзыв
  async getReviewOpportunity(purchaseId: string): Promise<ReviewOpportunity | null> {
    try {
      const { data, error } = await supabase
        .from('review_opportunities')
        .select('*')
        .eq('purchaseId', purchaseId)
        .eq('status', 'available')
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data;
    } catch (error) {
      logger.error('Error getting review opportunity:', error);
      return null;
    }
  }

  // Получение отзыва по ID покупки
  async getReviewByPurchase(purchaseId: string): Promise<Review | null> {
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
  async getProductReviews(
    productId: string,
    page: number = 1,
    limit: number = 10,
    onlyVerified: boolean = true
  ): Promise<{ reviews: Review[], total: number }> {
    try {
      let query = supabase
        .from('reviews')
        .select('*', { count: 'exact' })
        .eq('productId', productId)
        .eq('status', 'published');

      if (onlyVerified) {
        query = query.eq('verified', true);
      }

      // Сортировка: сначала подтвержденные, потом по дате
      query = query.order('verified', { ascending: false })
                   .order('createdAt', { ascending: false });

      // Пагинация
      const offset = (page - 1) * limit;
      query = query.range(offset, offset + limit - 1);

      const { data, error, count } = await query;

      if (error) throw error;

      return {
        reviews: data || [],
        total: count || 0
      };
    } catch (error) {
      logger.error('Error getting product reviews:', error);
      return { reviews: [], total: 0 };
    }
  }

  // Получение отзывов продавца
  async getSellerReviews(
    sellerId: string,
    page: number = 1,
    limit: number = 10,
    onlyVerified: boolean = true
  ): Promise<{ reviews: Review[], total: number }> {
    try {
      let query = supabase
        .from('reviews')
        .select('*', { count: 'exact' })
        .eq('sellerId', sellerId)
        .eq('status', 'published');

      if (onlyVerified) {
        query = query.eq('verified', true);
      }

      query = query.order('verified', { ascending: false })
                   .order('createdAt', { ascending: false });

      const offset = (page - 1) * limit;
      query = query.range(offset, offset + limit - 1);

      const { data, error, count } = await query;

      if (error) throw error;

      return {
        reviews: data || [],
        total: count || 0
      };
    } catch (error) {
      logger.error('Error getting seller reviews:', error);
      return { reviews: [], total: 0 };
    }
  }

  // Обновление рейтинга товара
  private async updateProductRating(productId: string): Promise<void> {
    try {
      // Получаем все отзывы товара
      const { data: reviews, error } = await supabase
        .from('reviews')
        .select('rating, verified, createdAt')
        .eq('productId', productId)
        .eq('status', 'published');

      if (error) throw error;

      if (!reviews || reviews.length === 0) return;

      // Рассчитываем метрики
      const totalReviews = reviews.length;
      const verifiedReviews = reviews.filter(r => r.verified).length;
      const averageRating = reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews;
      
      // Распределение рейтингов
      const ratingDistribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
      reviews.forEach(r => {
        ratingDistribution[r.rating]++;
      });

      // Последний отзыв
      const lastReviewDate = reviews
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0]
        .createdAt;

      // Обновляем или создаем запись рейтинга
      const ratingData = {
        productId,
        averageRating: Math.round(averageRating * 10) / 10,
        totalReviews,
        ratingDistribution,
        verifiedReviews,
        recentReviews: reviews.filter(r => 
          new Date(r.createdAt) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        ).length,
        lastReviewDate
      };

      const { error: upsertError } = await supabase
        .from('product_ratings')
        .upsert(ratingData, { onConflict: 'productId' });

      if (upsertError) throw upsertError;

      logger.log('Product rating updated:', productId);
    } catch (error) {
      logger.error('Error updating product rating:', error);
    }
  }

  // Обновление рейтинга продавца
  private async updateSellerRating(sellerId: string): Promise<void> {
    try {
      const { data: reviews, error } = await supabase
        .from('reviews')
        .select('rating, verified, createdAt')
        .eq('sellerId', sellerId)
        .eq('status', 'published');

      if (error) throw error;

      if (!reviews || reviews.length === 0) return;

      const totalReviews = reviews.length;
      const verifiedReviews = reviews.filter(r => r.verified).length;
      const averageRating = reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews;
      
      const ratingDistribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
      reviews.forEach(r => {
        ratingDistribution[r.rating]++;
      });

      const lastReviewDate = reviews
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0]
        .createdAt;

      const ratingData = {
        sellerId,
        averageRating: Math.round(averageRating * 10) / 10,
        totalReviews,
        ratingDistribution,
        verifiedReviews,
        recentReviews: reviews.filter(r => 
          new Date(r.createdAt) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        ).length,
        lastReviewDate
      };

      const { error: upsertError } = await supabase
        .from('seller_ratings')
        .upsert(ratingData, { onConflict: 'sellerId' });

      if (upsertError) throw upsertError;

      logger.log('Seller rating updated:', sellerId);
    } catch (error) {
      logger.error('Error updating seller rating:', error);
    }
  }

  // Отметка отзыва как полезного/бесполезного
  async markReviewHelpful(reviewId: string, helpful: boolean, userId: string): Promise<void> {
    try {
      // Проверяем, что пользователь еще не голосовал
      const { data: existing, error: existingError } = await supabase
        .from('review_helpfulness')
        .select('*')
        .eq('reviewId', reviewId)
        .eq('userId', userId)
        .single();

      if (existingError && existingError.code !== 'PGRST116') throw existingError;
      if (existing) {
        throw new Error('Вы уже голосовали за этот отзыв');
      }

      // Добавляем голос
      const { error: voteError } = await supabase
        .from('review_helpfulness')
        .insert({
          reviewId,
          userId,
          helpful,
          createdAt: new Date().toISOString()
        });

      if (voteError) throw voteError;

      // Обновляем счетчики
      await this.updateReviewHelpfulness(reviewId);

      logger.log('Review marked as helpful:', reviewId);
    } catch (error) {
      logger.error('Error marking review helpful:', error);
      throw error;
    }
  }

  // Обновление счетчиков полезности
  private async updateReviewHelpfulness(reviewId: string): Promise<void> {
    try {
      const { data: votes, error } = await supabase
        .from('review_helpfulness')
        .select('helpful')
        .eq('reviewId', reviewId);

      if (error) throw error;

      const helpfulCount = votes?.filter(v => v.helpful).length || 0;
      const notHelpfulCount = votes?.filter(v => !v.helpful).length || 0;

      await supabase
        .from('reviews')
        .update({ helpful: helpfulCount, notHelpful: notHelpfulCount })
        .eq('id', reviewId);
    } catch (error) {
      logger.error('Error updating review helpfulness:', error);
    }
  }

  // Ответ продавца на отзыв
  async respondToReview(reviewId: string, sellerId: string, response: string): Promise<void> {
    try {
      // Проверяем, что отзыв принадлежит этому продавцу
      const { data: review, error } = await supabase
        .from('reviews')
        .select('*')
        .eq('id', reviewId)
        .eq('sellerId', sellerId)
        .single();

      if (error || !review) {
        throw new Error('Отзыв не найден или не принадлежит вам');
      }

      // Обновляем отзыв
      const { error: updateError } = await supabase
        .from('reviews')
        .update({
          sellerResponse: response,
          updatedAt: new Date().toISOString()
        })
        .eq('id', reviewId);

      if (updateError) throw updateError;

      // Уведомляем покупателя об ответе
      await this.notifyBuyerAboutResponse(review.buyerId, reviewId, response);

      logger.log('Seller response added to review:', reviewId);
    } catch (error) {
      logger.error('Error responding to review:', error);
      throw error;
    }
  }

  // Получение рейтинга товара
  async getProductRating(productId: string): Promise<RatingBreakdown | null> {
    try {
      const { data, error } = await supabase
        .from('product_ratings')
        .select('*')
        .eq('productId', productId)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data;
    } catch (error) {
      logger.error('Error getting product rating:', error);
      return null;
    }
  }

  // Получение рейтинга продавца
  async getSellerRating(sellerId: string): Promise<RatingBreakdown | null> {
    try {
      const { data, error } = await supabase
        .from('seller_ratings')
        .select('*')
        .eq('sellerId', sellerId)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data;
    } catch (error) {
      logger.error('Error getting seller rating:', error);
      return null;
    }
  }

  // Получение лучших товаров по рейтингу
  async getTopRatedProducts(limit: number = 10, minReviews: number = 5): Promise<Array<{ product: any, rating: RatingBreakdown }>> {
    try {
      const { data, error } = await supabase
        .from('product_ratings')
        .select('*')
        .gte('totalReviews', minReviews)
        .order('averageRating', { ascending: false })
        .limit(limit);

      if (error) throw error;

      const products = [];
      for (const rating of data || []) {
        const { data: product, error: productError } = await supabase
          .from('product_market')
          .select('*')
          .eq('id', rating.productId)
          .single();

        if (!productError && product) {
          products.push({ product, rating });
        }
      }

      return products;
    } catch (error) {
      logger.error('Error getting top rated products:', error);
      return [];
    }
  }

  // Получение лучших продавцов по рейтингу
  async getTopRatedSellers(limit: number = 10, minReviews: number = 5): Promise<Array<{ seller: any, rating: RatingBreakdown }>> {
    try {
      const { data, error } = await supabase
        .from('seller_ratings')
        .select('*')
        .gte('totalReviews', minReviews)
        .order('averageRating', { ascending: false })
        .limit(limit);

      if (error) throw error;

      const sellers = [];
      for (const rating of data || []) {
        const { data: seller, error: sellerError } = await supabase
          .from('sellers')
          .select('*')
          .eq('id', rating.sellerId)
          .single();

        if (!sellerError && seller) {
          sellers.push({ seller, rating });
        }
      }

      return sellers;
    } catch (error) {
      logger.error('Error getting top rated sellers:', error);
      return [];
    }
  }

  // Отметка возможности отзыва как использованной
  private async markReviewOpportunityUsed(opportunityId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('review_opportunities')
        .update({ status: 'used' })
        .eq('id', opportunityId);

      if (error) throw error;
    } catch (error) {
      logger.error('Error marking review opportunity used:', error);
    }
  }

  // Уведомление покупателя об ответе на отзыв
  private async notifyBuyerAboutResponse(buyerId: string, reviewId: string, response: string): Promise<void> {
    // В реальном приложении здесь будет отправка уведомления
    logger.log(`Notifying buyer ${buyerId} about response to review ${reviewId}`);
  }

  // Получение доступных возможностей для отзывов пользователя
  async getUserReviewOpportunities(buyerId: string): Promise<ReviewOpportunity[]> {
    try {
      const { data, error } = await supabase
        .from('review_opportunities')
        .select('*, product_market(*), purchase_intents(*)')
        .eq('buyerId', buyerId)
        .eq('status', 'available')
        .gt('expiresAt', new Date().toISOString())
        .order('createdAt', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      logger.error('Error getting user review opportunities:', error);
      return [];
    }
  }

  // Напоминание о возможности оставить отзыв
  async remindAboutReviews(): Promise<void> {
    try {
      // Находим возможности, которые скоро истекают (через 3 дня)
      const threeDaysFromNow = new Date();
      threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);

      const { data: opportunities, error } = await supabase
        .from('review_opportunities')
        .select('*')
        .eq('status', 'available')
        .lt('expiresAt', threeDaysFromNow.toISOString())
        .is('remindedAt', null);

      if (error) throw error;

      for (const opportunity of opportunities || []) {
        // Отправляем напоминание
        await this.sendReviewReminder(opportunity.buyerId, opportunity.id);
        
        // Обновляем время напоминания
        await supabase
          .from('review_opportunities')
          .update({ remindedAt: new Date().toISOString() })
          .eq('id', opportunity.id);
      }

      logger.log(`Sent ${opportunities?.length || 0} review reminders`);
    } catch (error) {
      logger.error('Error reminding about reviews:', error);
    }
  }

  // Отправка напоминания об отзыве
  private async sendReviewReminder(buyerId: string, opportunityId: string): Promise<void> {
    // В реальном приложении здесь будет отправка уведомления
    logger.log(`Sending review reminder to buyer ${buyerId} for opportunity ${opportunityId}`);
  }

  // Проверка и истечение срока действия возможностей
  async expireReviewOpportunities(): Promise<void> {
    try {
      const { data: opportunities, error } = await supabase
        .from('review_opportunities')
        .select('*')
        .eq('status', 'available')
        .lt('expiresAt', new Date().toISOString());

      if (error) throw error;

      for (const opportunity of opportunities || []) {
        await supabase
          .from('review_opportunities')
          .update({ status: 'expired' })
          .eq('id', opportunity.id);
      }

      logger.log(`Expired ${opportunities?.length || 0} review opportunities`);
    } catch (error) {
      logger.error('Error expiring review opportunities:', error);
    }
  }

  // Получение статистики отзывов
  async getReviewStats(): Promise<{
    totalReviews: number;
    verifiedReviews: number;
    averageRating: number;
    reviewsByRating: { [key: string]: number };
    recentReviews: number;
  }> {
    try {
      const { data: reviews, error } = await supabase
        .from('reviews')
        .select('rating, verified, createdAt')
        .eq('status', 'published');

      if (error) throw error;

      const totalReviews = reviews?.length || 0;
      const verifiedReviews = reviews?.filter(r => r.verified).length || 0;
      const averageRating = totalReviews > 0 
        ? reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews 
        : 0;

      const reviewsByRating = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
      reviews?.forEach(r => {
        reviewsByRating[r.rating]++;
      });

      const recentReviews = reviews?.filter(r => 
        new Date(r.createdAt) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      ).length || 0;

      return {
        totalReviews,
        verifiedReviews,
        averageRating: Math.round(averageRating * 10) / 10,
        reviewsByRating,
        recentReviews
      };
    } catch (error) {
      logger.error('Error getting review stats:', error);
      return {
        totalReviews: 0,
        verifiedReviews: 0,
        averageRating: 0,
        reviewsByRating: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
        recentReviews: 0
      };
    }
  }
}

export default ReviewSystem.getInstance();
