// Система перехода в мессенджер продавца
import { logger } from './logger';

interface SellerInfo {
  id: string;
  name: string;
  telegram: string;
  whatsapp: string;
  viber: string;
  instagram: string;
  vk: string;
  email: string;
}

interface MessengerRedirect {
  sellerId: string;
  platform: 'telegram' | 'whatsapp' | 'viber' | 'instagram' | 'vk' | 'email';
  redirectUrl: string;
  createdAt: string;
  expiresAt?: string;
}

class MessengerRedirect {
  private static instance: MessengerRedirect;
  private redirectCache: Map<string, string> = new Map();
  private cacheTimeout = 5 * 60 * 1000; // 5 минут

  private constructor() {}

  static getInstance(): MessengerRedirect {
    if (!MessengerRedirect.instance) {
      MessengerRedirect.instance = new MessengerRedirect();
    }
    return MessengerRedirect.instance;
  }

  // Создание перенаправления в мессенджер
  async createRedirect(
    sellerId: string,
    platform: 'telegram' | 'whatsapp' | 'viber' | 'instagram' | 'vk' | 'email',
    purchaseId: string,
    productId: string
  ): Promise<MessengerRedirect> {
    try {
      // Получаем информацию о продавце
      const sellerInfo = await this.getSellerInfo(sellerId);
      if (!sellerInfo) {
        throw new Error('Продавец не найден');
      }

      // Проверяем, что у продавца есть нужный мессенджер
      const messengerUrl = sellerInfo[platform];
      if (!messengerUrl) {
        throw new Error(`У продавца нет аккаунта ${platform}`);
      }

      // Создаем запись перенаправления
      const redirect: MessengerRedirect = {
        sellerId,
        platform,
        redirectUrl: messengerUrl,
        purchaseId,
        productId,
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + this.cacheTimeout * 1000).toISOString()
      };

      const { data, error } = await supabase
        .from('messenger_redirects')
        .insert(redirect)
        .select()
        .single();

      if (error) throw error;

      // Сохраняем в кэш
      this.redirectCache.set(`${sellerId}_${platform}`, redirect.redirectUrl);

      logger.log(`Messenger redirect created: ${redirect.id} (${platform})`);
      return redirect;
    } catch (error) {
      logger.error('Error creating messenger redirect:', error);
      throw error;
    }
  }

  // Получение URL для перенаправления
  async getRedirectUrl(sellerId: string, platform: 'telegram' | 'whatsapp' | 'viber' | 'instagram' | 'vk' | 'email'): Promise<string | null> {
    try {
      const sellerInfo = await this.getSellerInfo(sellerId);
      if (!sellerInfo) return null;

      const messengerUrl = sellerInfo[platform];
      return messengerUrl || null;
    } catch (error) {
      logger.error('Error getting redirect URL:', error);
      return null;
    }
  }

  // Получение информации о продавце
  private async getSellerInfo(sellerId: string): Promise<SellerInfo | null> {
    try {
      const { data, error } = await supabase
        .from('sellers')
        .select('*')
        .eq('id', sellerId)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      logger.error('Error getting seller info:', error);
      return null;
    }
  }

  // Проверка истечения срока действия перенаправления
  private checkExpiration(redirectId: string): boolean {
    const redirect = this.redirectCache.get(redirectId);
    if (!redirect) return false;

    const expiresAt = new Date(redirect.expiresAt);
    const now = new Date();
    return expiresAt > now;
  }

  // Очистка истекших перенаправлений
  private async cleanupExpiredRedirects(): Promise<void> {
    try {
      const now = new Date();
      
      // Удаляем все истекшие перенаправления
      const { error } = await supabase
        .from('messenger_redirects')
        .delete()
        .lt('expiresAt', now.toISOString());

      if (error) throw error;

      // Очищаем кэш
      for (const [key, redirect] of this.redirectCache.entries()) {
        if (this.checkExpiration(key)) {
          this.redirectCache.delete(key);
        }
      }

      logger.log('Cleaned up expired messenger redirects');
    } catch (error) {
      logger.error('Error cleaning up expired redirects:', error);
    }
  }

  // Получение активных перенаправлений
  async getActiveRedirects(sellerId?: string): Promise<MessengerRedirect[]> {
    try {
      let query = supabase
        .from('messenger_redirects')
        .select('*')
        .in('status', ['active', 'pending'])
        .gt('expiresAt', new Date().toISOString());

      if (sellerId) {
        query = query.eq('sellerId', sellerId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data || [];
    } catch (error) {
      logger.error('Error getting active redirects:', error);
      return [];
    }
  }

  // Получение всех перенаправлений продавца
  async getAllRedirects(sellerId: string): Promise<MessengerRedirect[]> {
    try {
      const { data, error } = await supabase
        .from('messenger_redirects')
        .select('*')
        .eq('sellerId', sellerId)
        .order('createdAt', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      logger.error('Error getting all redirects:', error);
      return [];
    }
  }

  // Удаление перенаправления
  async removeRedirect(redirectId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('messenger_redirects')
        .delete()
        .eq('id', redirectId);

      if (error) throw error;

      // Удаляем из кэша
      const key = `${redirect.sellerId}_${redirect.platform}`;
      if (this.redirectCache.has(key)) {
        this.redirectCache.delete(key);
      }

      logger.log('Messenger redirect removed:', redirectId);
      return true;
    } catch (error) {
      logger.error('Error removing redirect:', error);
      return false;
    }
  }

  // Получение статистики
  async getStats(): Promise<{
    totalRedirects: number;
    activeRedirects: number;
    platformDistribution: { [key: string]: number };
    averageRedirectsPerSeller: number;
    expiredRedirects: number;
  }> {
    try {
      const { data: redirects, error } = await supabase
        .from('messenger_redirects')
        .select('*');

      if (error) throw error;

      const totalRedirects = redirects?.length || 0;
      const activeRedirects = redirects?.filter(r => r.status === 'active').length || 0;
      const expiredRedirects = redirects?.filter(r => r.status === 'expired').length || 0;

      // Распределение по платформам
      const platformDistribution: { 'telegram': 0, 'whatsapp': 0, 'viber': 0, 'instagram': 0, 'vk': 0, 'email': 0 };
      redirects?.forEach(r => {
        if (platformDistribution[r.platform] !== undefined) {
          platformDistribution[r.platform]++;
        }
      });

      // Среднее количество перенаправлений на продавца
      const sellerRedirects = new Map();
      redirects?.forEach(r => {
        const sellerRedirectsCount = sellerRedirects.get(r.sellerId) || 0;
        sellerRedirects.set(r.sellerId, sellerRedirectsCount + 1);
      });

      const averageRedirectsPerSeller = sellerRedirects.size > 0 
        ? Array.from(sellerRedirects.values()).reduce((sum, count) => sum + count, 0) / sellerRedirects.size()
        : 0;

      return {
        totalRedirects,
        activeRedirects,
        platformDistribution,
        averageRedirectsPerSeller,
        expiredRedirects
      };
    } catch (error) {
      logger.error('Error getting stats:', error);
      return {
        totalRedirects: 0,
        activeRedirects: 0,
        platformDistribution: {},
        averageRedirectsPerSeller: 0,
        expiredRedirects: 0
      };
    }
  }
}

export default MessengerRedirect.getInstance();
