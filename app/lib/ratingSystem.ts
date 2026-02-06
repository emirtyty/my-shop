// Система рейтингов и отзывов
import { logger } from './logger';
import { supabase } from './supabase';

interface Review {
  id: string;
  productId: string;
  userId: string;
  userName: string;
  rating: number; // 1-5
  title: string;
  content: string;
  pros?: string;
  cons?: string;
  verified: boolean;
  helpful: number;
  notHelpful: number;
  createdAt: string;
  updatedAt: string;
}

interface SellerRating {
  id: string;
  sellerId: string;
  averageRating: number;
  totalReviews: number;
  ratingDistribution: { [key: number]: number }; // 1-5 звезд
  responseRate: number;
  averageResponseTime: number; // в часах
}

interface ProductRating {
  id: string;
  productId: string;
  averageRating: number;
  totalReviews: number;
  ratingDistribution: { [key: number]: number };
  lastReviewDate: string;
}

class RatingSystem {
  private static instance: RatingSystem;

  private constructor() {}

  static getInstance(): RatingSystem {
    if (!RatingSystem.instance) {
      RatingSystem.instance = new RatingSystem();
    }
    return RatingSystem.instance;
  }

  // Добавить отзыв на товар
  async addReview(review: Omit<Review, 'id' | 'createdAt' | 'updatedAt' | 'helpful' | 'notHelpful'>): Promise<Review> {
    try {
      const newReview = {
        ...review,
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        helpful: 0,
        notHelpful: 0,
        verified: await this.verifyPurchase(review.userId, review.productId)
      };

      const { data, error } = await supabase
        .from('reviews')
        .insert(newReview)
        .select()
        .single();

      if (error) throw error;

      // Обновляем рейтинг товара
      await this.updateProductRating(review.productId);

      // Обновляем рейтинг продавца
      await this.updateSellerRating(review.productId);

      logger.log('Review added successfully:', data.id);
      return data;
    } catch (error) {
      logger.error('Error adding review:', error);
      throw error;
    }
  }

  // Получить отзывы товара
  async getProductReviews(
    productId: string, 
    page: number = 1, 
    limit: number = 10,
    sortBy: 'newest' | 'oldest' | 'highest' | 'lowest' = 'newest'
  ): Promise<{ reviews: Review[], total: number }> {
    try {
      let query = supabase
        .from('reviews')
        .select('*')
        .eq('productId', productId);

      // Сортировка
      switch (sortBy) {
        case 'newest':
          query = query.order('createdAt', { ascending: false });
          break;
        case 'oldest':
          query = query.order('createdAt', { ascending: true });
          break;
        case 'highest':
          query = query.order('rating', { ascending: false });
          break;
        case 'lowest':
          query = query.order('rating', { ascending: true });
          break;
      }

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

  // Получить рейтинг товара
  async getProductRating(productId: string): Promise<ProductRating | null> {
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

  // Получить рейтинг продавца
  async getSellerRating(sellerId: string): Promise<SellerRating | null> {
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

  // Обновить рейтинг товара
  private async updateProductRating(productId: string): Promise<void> {
    try {
      // Получаем все отзывы товара
      const { data: reviews, error } = await supabase
        .from('reviews')
        .select('rating')
        .eq('productId', productId);

      if (error) throw error;

      if (!reviews || reviews.length === 0) return;

      // Рассчитываем средний рейтинг
      const totalReviews = reviews.length;
      const averageRating = reviews.reduce((sum, review) => sum + review.rating, 0) / totalReviews;

      // Рассчитываем распределение рейтингов
      const ratingDistribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
      reviews.forEach(review => {
        ratingDistribution[review.rating]++;
      });

      // Обновляем или создаем запись рейтинга
      const ratingData = {
        productId,
        averageRating: Math.round(averageRating * 10) / 10, // Округляем до 1 знака
        totalReviews,
        ratingDistribution,
        lastReviewDate: new Date().toISOString()
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

  // Обновить рейтинг продавца
  private async updateSellerRating(productId: string): Promise<void> {
    try {
      // Получаем информацию о товаре и продавце
      const { data: product, error } = await supabase
        .from('product_market')
        .select('seller_id')
        .eq('id', productId)
        .single();

      if (error || !product) return;

      // Получаем все отзывы товаров продавца
      const { data: reviews, error: reviewsError } = await supabase
        .from('reviews')
        .select('rating')
        .in('productId', 
          supabase
            .from('product_market')
            .select('id')
            .eq('seller_id', product.seller_id)
        );

      if (reviewsError || !reviews) return;

      // Рассчитываем средний рейтинг
      const totalReviews = reviews.length;
      const averageRating = reviews.reduce((sum, review) => sum + review.rating, 0) / totalReviews;

      // Рассчитываем распределение рейтингов
      const ratingDistribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
      reviews.forEach(review => {
        ratingDistribution[review.rating]++;
      });

      // Имитируем расчет времени ответа и процента ответов
      const responseRate = Math.min(85, 60 + Math.random() * 25); // 60-85%
      const averageResponseTime = 2 + Math.random() * 6; // 2-8 часов

      const ratingData = {
        sellerId: product.seller_id,
        averageRating: Math.round(averageRating * 10) / 10,
        totalReviews,
        ratingDistribution,
        responseRate: Math.round(responseRate),
        averageResponseTime: Math.round(averageResponseTime)
      };

      const { error: upsertError } = await supabase
        .from('seller_ratings')
        .upsert(ratingData, { onConflict: 'sellerId' });

      if (upsertError) throw upsertError;

      logger.log('Seller rating updated:', product.seller_id);
    } catch (error) {
      logger.error('Error updating seller rating:', error);
    }
  }

  // Проверить подтвержденную покупку
  private async verifyPurchase(userId: string, productId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('purchases')
        .select('id')
        .eq('userId', userId)
        .eq('productId', productId)
        .single();

      return !error && !!data;
    } catch (error) {
      logger.error('Error verifying purchase:', error);
      return false;
    }
  }

  // Отметить отзыв как полезный/бесполезный
  async markReviewHelpful(reviewId: string, helpful: boolean, userId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('review_helpfulness')
        .insert({
          reviewId,
          userId,
          helpful,
          createdAt: new Date().toISOString()
        });

      if (error) throw error;

      // Обновляем счетчики
      await this.updateReviewHelpfulness(reviewId);

      logger.log('Review marked as helpful:', reviewId);
    } catch (error) {
      logger.error('Error marking review helpful:', error);
      throw error;
    }
  }

  // Обновить счетчики полезности отзыва
  private async updateReviewHelpfulness(reviewId: string): Promise<void> {
    try {
      const { data: helpful, error: helpfulError } = await supabase
        .from('review_helpfulness')
        .select('helpful')
        .eq('reviewId', reviewId);

      if (helpfulError) throw helpfulError;

      const helpfulCount = helpful?.filter(h => h.helpful).length || 0;
      const notHelpfulCount = helpful?.filter(h => !h.helpful).length || 0;

      await supabase
        .from('reviews')
        .update({ helpful: helpfulCount, notHelpful: notHelpfulCount })
        .eq('id', reviewId);

    } catch (error) {
      logger.error('Error updating review helpfulness:', error);
    }
  }

  // Получить лучшие товары по рейтингу
  async getTopRatedProducts(limit: number = 10): Promise<Array<{ product: any, rating: ProductRating }>> {
    try {
      const { data, error } = await supabase
        .from('product_ratings')
        .select('*')
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

  // Получить лучших продавцов по рейтингу
  async getTopRatedSellers(limit: number = 10): Promise<Array<{ seller: any, rating: SellerRating }>> {
    try {
      const { data, error } = await supabase
        .from('seller_ratings')
        .select('*')
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
}

export default RatingSystem.getInstance();
