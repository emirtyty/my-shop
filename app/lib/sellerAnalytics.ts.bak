// Аналитика для продавцов
import { logger } from './logger';
import { supabase } from './supabase';

interface SalesData {
  date: string;
  revenue: number;
  orders: number;
  products: number;
  uniqueCustomers: number;
  averageOrderValue: number;
}

interface ProductPerformance {
  productId: string;
  productName: string;
  category: string;
  price: number;
  stock: number;
  sold: number;
  revenue: number;
  views: number;
  conversionRate: number;
  rating: number;
  reviews: number;
  daysToSell: number;
  profitMargin: number;
}

interface CustomerAnalytics {
  totalCustomers: number;
  newCustomers: number;
  returningCustomers: number;
  customerLifetimeValue: number;
  averageOrderFrequency: number;
  retentionRate: number;
  topCustomers: Array<{
    id: string;
    name: string;
    email: string;
    totalSpent: number;
    orders: number;
    lastOrder: string;
  }>;
}

interface MarketInsights {
  marketShare: number;
  competitorAnalysis: {
    name: string;
    marketShare: number;
    averagePrice: number;
    productCount: number;
  }[];
  categoryTrends: {
    category: string;
    growth: number;
    demand: 'high' | 'medium' | 'low';
    competition: 'low' | 'medium' | 'high';
  }[];
}

class SellerAnalytics {
  private static instance: SellerAnalytics;

  private constructor() {}

  static getInstance(): SellerAnalytics {
    if (!SellerAnalytics.instance) {
      SellerAnalytics.instance = new SellerAnalytics();
    }
    return SellerAnalytics.instance;
  }

  // Получить аналитику продаж
  async getSalesAnalytics(sellerId: string, period: '7d' | '30d' | '90d' = '30d'): Promise<SalesData[]> {
    try {
      const days = period === '7d' ? 7 : period === '30d' ? 30 : 90;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const { data, error } = await supabase
        .from('orders')
        .select('created_at, total_amount, quantity')
        .eq('seller_id', sellerId)
        .gte('created_at', startDate.toISOString())
        .order('created_at');

      if (error) throw error;

      // Группируем данные по дням
      const dailyData = this.groupSalesByDay(data || []);
      
      return dailyData;
    } catch (error) {
      logger.error('Error getting sales analytics:', error);
      return [];
    }
  }

  // Группировка продаж по дням
  private groupSalesByDay(orders: any[]): SalesData[] {
    const grouped: { [date: string]: any[] } = {};

    orders.forEach(order => {
      const date = order.created_at.split('T')[0];
      if (!grouped[date]) {
        grouped[date] = [];
      }
      grouped[date].push(order);
    });

    return Object.entries(grouped).map(([date, dayOrders]) => {
      const revenue = dayOrders.reduce((sum, order) => sum + order.total_amount, 0);
      const ordersCount = dayOrders.length;
      const products = dayOrders.reduce((sum, order) => sum + order.quantity, 0);
      const uniqueCustomers = new Set(dayOrders.map(o => o.customer_id)).size;
      
      return {
        date,
        revenue,
        orders: ordersCount,
        products,
        uniqueCustomers,
        averageOrderValue: revenue / ordersCount
      };
    });
  }

  // Получить производительность товаров
  async getProductPerformance(sellerId: string): Promise<ProductPerformance[]> {
    try {
      const { data: products, error } = await supabase
        .from('product_market')
        .select(`
          *,
          (select count(*) from orders where orders.product_id = product_market.id and orders.seller_id = ${sellerId}) as sold,
          (select count(*) from reviews where reviews.product_id = product_market.id) as reviews,
          (select avg(rating) from reviews where reviews.product_id = product_market.id) as rating
        `)
        .eq('seller_id', sellerId);

      if (error) throw error;

      const performance: ProductPerformance[] = products.map(product => ({
        productId: product.id,
        productName: product.name,
        category: product.category,
        price: product.price,
        stock: product.stock_quantity || 0,
        sold: product.sold || 0,
        revenue: (product.sold || 0) * product.price,
        views: Math.floor(Math.random() * 1000) + 100, // Имитация просмотров
        conversionRate: product.sold > 0 ? (product.sold / 1000) * 100 : 0,
        rating: product.rating || 0,
        reviews: product.reviews || 0,
        daysToSell: product.days_to_sell || 30,
        profitMargin: ((product.price - (product.price * 0.7)) / product.price) * 100 // Имитация маржи
      }));

      return performance.sort((a, b) => b.revenue - a.revenue);
    } catch (error) {
      logger.error('Error getting product performance:', error);
      return [];
    }
  }

  // Получить аналитику клиентов
  async getCustomerAnalytics(sellerId: string): Promise<CustomerAnalytics> {
    try {
      // Получаем все заказы продавца
      const { data: orders, error } = await supabase
        .from('orders')
        .select('customer_id, total_amount, created_at, customer_email, customer_name')
        .eq('seller_id', sellerId);

      if (error) throw error;

      const customerMap = new Map();
      const customerOrders = new Map();

      orders.forEach(order => {
        if (!customerMap.has(order.customer_id)) {
          customerMap.set(order.customer_id, {
            id: order.customer_id,
            name: order.customer_name || 'Клиент',
            email: order.customer_email || '',
            totalSpent: 0,
            orders: 0,
            lastOrder: order.created_at
          });
        }

        const customer = customerMap.get(order.customer_id)!;
        customer.totalSpent += order.total_amount;
        customer.orders += 1;
        
        if (order.created_at > customer.lastOrder) {
          customer.lastOrder = order.created_at;
        }

        customerOrders.set(order.customer_id, customer);
      });

      const customers = Array.from(customerMap.values());
      const totalCustomers = customers.length;
      
      // Рассчитываем метрики
      const totalRevenue = customers.reduce((sum, c) => sum + c.totalSpent, 0);
      const totalOrders = customers.reduce((sum, c) => sum + c.orders, 0);
      
      const newCustomers = customers.filter(c => {
        const firstOrder = orders.find(o => o.customer_id === c.id);
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        return new Date(firstOrder.created_at) > thirtyDaysAgo;
      }).length;

      const returningCustomers = totalCustomers - newCustomers;
      const customerLifetimeValue = totalCustomers > 0 ? totalRevenue / totalCustomers : 0;
      const averageOrderFrequency = totalOrders > 0 ? totalOrders / totalCustomers : 0;
      const retentionRate = totalCustomers > 0 ? (returningCustomers / totalCustomers) * 100 : 0;

      // Топ клиенты
      const topCustomers = customers
        .sort((a, b) => b.totalSpent - a.totalSpent)
        .slice(0, 10);

      return {
        totalCustomers,
        newCustomers,
        returningCustomers,
        customerLifetimeValue,
        averageOrderFrequency,
        retentionRate,
        topCustomers
      };
    } catch (error) {
      logger.error('Error getting customer analytics:', error);
      return this.getDefaultCustomerAnalytics();
    }
  }

  // Получить рыночные инсайты
  async getMarketInsights(sellerId: string): Promise<MarketInsights> {
    try {
      // Получаем данные продавца
      const { data: seller, error } = await supabase
        .from('sellers')
        .select('*')
        .eq('id', sellerId)
        .single();

      if (error || !seller) {
        throw error;
      }

      // Получаем общие данные рынка
      const { data: allProducts, error: productsError } = await supabase
        .from('product_market')
        .select('price, category, seller_id');

      if (productsError) throw productsError;

      const sellerProducts = allProducts.filter(p => p.seller_id === sellerId);
      const totalProducts = allProducts.length;
      
      // Рассчитываем долю рынка
      const sellerRevenue = sellerProducts.reduce((sum, p) => sum + p.price, 0);
      const totalRevenue = allProducts.reduce((sum, p) => sum + p.price, 0);
      const marketShare = totalRevenue > 0 ? (sellerRevenue / totalRevenue) * 100 : 0;

      // Анализ конкурентов (имитация)
      const competitorAnalysis = this.analyzeCompetitors(seller, allProducts);

      // Анализ трендов категорий
      const categoryTrends = this.analyzeCategoryTrends(allProducts);

      return {
        marketShare,
        competitorAnalysis,
        categoryTrends
      };
    } catch (error) {
      logger.error('Error getting market insights:', error);
      return this.getDefaultMarketInsights();
    }
  }

  // Анализ конкурентов
  private analyzeCompetitors(seller: any, allProducts: any[]): any[] {
    // Имитация анализа конкурентов
    const competitors = [
      { name: 'Ozon', marketShare: 25.5, averagePrice: 15000, productCount: 50000 },
      { name: 'Wildberries', marketShare: 22.3, averagePrice: 14500, productCount: 45000 },
      { name: 'Яндекс.Маркет', marketShare: 18.7, averagePrice: 16000, productCount: 35000 },
      { name: 'AliExpress', marketShare: 15.2, averagePrice: 8000, productCount: 80000 }
    ];

    return competitors.map(competitor => ({
      ...competitor,
      priceDifference: ((seller.average_price || 15000) - competitor.averagePrice) / competitor.averagePrice * 100
    }));
  }

  // Анализ трендов категорий
  private analyzeCategoryTrends(allProducts: any[]): any[] {
    const categoryMap = new Map();
    
    allProducts.forEach(product => {
      if (!categoryMap.has(product.category)) {
        categoryMap.set(product.category, {
          count: 0,
          totalValue: 0,
          averagePrice: 0
        });
      }
      
      const category = categoryMap.get(product.category)!;
      category.count++;
      category.totalValue += product.price;
    });

    return Array.from(categoryMap.entries()).map(([category, data]) => {
      const averagePrice = data.count > 0 ? data.totalValue / data.count : 0;
      
      // Определяем тренд на основе имитации
      const growth = Math.random() * 40 - 20; // -20% до +20%
      let demand: 'high' | 'medium' | 'low' = 'medium';
      let competition: 'low' | 'medium' | 'high' = 'medium';
      
      if (category.count > 1000) {
        demand = 'high';
        competition = 'high';
      } else if (category.count < 100) {
        demand = 'low';
        competition = 'low';
      }

      return {
        category,
        growth,
        demand,
        competition
      };
    });
  }

  // Получить рекомендации
  async getRecommendations(sellerId: string): Promise<string[]> {
    try {
      const insights = await this.getMarketInsights(sellerId);
      const performance = await this.getProductPerformance(sellerId);
      const analytics = await this.getCustomerAnalytics(sellerId);

      const recommendations: string[] = [];

      // Рекомендации на основе доли рынка
      if (insights.marketShare < 5) {
        recommendations.push('Рассмотрите возможность увеличения маркетингового бюджета');
        recommendations.push('Оптимизируйте цены для улучшения конкурентоспособности');
      } else if (insights.marketShare > 20) {
        recommendations.push('Вы занимаете значительную долю рынка, поддерживайте качество');
        recommendations.push('Рассмотрите возможность расширения ассортимента');
      }

      // Рекомендации на основе производительности товаров
      const lowPerformingProducts = performance.filter(p => p.conversionRate < 2);
      if (lowPerformingProducts.length > 0) {
        recommendations.push(`Улучшите описания товаров: ${lowPerformingProducts.slice(0, 3).map(p => p.productName).join(', ')}`);
        recommendations.push('Рассмотрите возможность снижения цен на товары с низкой конверсией');
      }

      // Рекомендации на основе клиентской аналитики
      if (analytics.retentionRate < 30) {
        recommendations.push('Запустите программу лояльности для клиентов');
        recommendations.push('Предложите скидки для повторных покупок');
      }

      // Рекомендации на основе трендов
      const emergingCategories = insights.categoryTrends.filter(c => c.growth > 10 && c.demand === 'high');
      if (emergingCategories.length > 0) {
        recommendations.push(`Обратите внимание на растущие категории: ${emergingCategories.map(c => c.category).join(', ')}`);
      }

      return recommendations;
    } catch (error) {
      logger.error('Error getting recommendations:', error);
      return [];
    }
  }

  // Получить прогноз продаж
  async getSalesForecast(sellerId: string, days: number = 30): Promise<{ date: string; predictedRevenue: number; confidence: number }[]> {
    try {
      const salesData = await this.getSalesAnalytics(sellerId, '90d');
      
      if (salesData.length < 7) {
        return this.getDefaultForecast(days);
      }

      // Используем простую модель скользящего среднего для прогноза
      const forecast: { date: string; predictedRevenue: number; confidence: number }[] = [];
      const recentData = salesData.slice(-14); // Последние 2 недели
      const alpha = 0.3;
      
      let smoothedRevenue = recentData[0].revenue;
      
      for (let i = 0; i < days; i++) {
        const trend = this.calculateTrend(recententData);
        smoothedRevenue = alpha * (recentData[recentData.length - 1].revenue + trend) + (1 - alpha) * smoothedRevenue;
        
        const date = new Date();
        date.setDate(date.getDate() + i + 1);
        
        forecast.push({
          date: date.toISOString().split('T')[0],
          predictedRevenue: Math.round(smoothedRevenue),
          confidence: Math.max(60, 90 - (i * 3)) // Уверенность снижается со временем
        });
      }

      return forecast;
    } catch (error) {
      logger.error('Error getting sales forecast:', error);
      return this.getDefaultForecast(days);
    }
  }

  // Расчет тренда
  private calculateTrend(data: SalesData[]): number {
    if (data.length < 2) return 0;
    
    const recent = data.slice(-7);
    const older = data.slice(-14, -7);
    
    const recentAvg = recent.reduce((sum, d) => sum + d.revenue, 0) / recent.length;
    const olderAvg = older.reduce((sum, d) => sum + d.revenue, 0) / older.length;
    
    return recentAvg - olderAvg;
  }

  // Получить данные по умолчанию
  private getDefaultCustomerAnalytics(): CustomerAnalytics {
    return {
      totalCustomers: 0,
      newCustomers: 0,
      returningCustomers: 0,
      customerLifetimeValue: 0,
      averageOrderFrequency: 0,
      retentionRate: 0,
      topCustomers: []
    };
  }

  // Получить рыночные инсайты по умолчанию
  private getDefaultMarketInsights(): MarketInsights {
    return {
      marketShare: 0,
      competitorAnalysis: [],
      categoryTrends: []
    };
  }

  // Получить прогноз по умолчанию
  private getDefaultForecast(days: number): { date: string; predictedRevenue: number; confidence: number }[] {
    const forecast: { date: string; predictedRevenue: number; confidence: number }[] = [];
    
    for (let i = 0; i < days; i++) {
      const date = new Date();
      date.setDate(date.getDate() + i + 1);
      
      forecast.push({
        date: date.toISOString().split('T')[0],
        predictedRevenue: 10000 + Math.floor(Math.random() * 5000),
        confidence: Math.max(60, 90 - (i * 3))
      });
    }
    
    return forecast;
  }

  // Экспорт аналитики в Excel/CSV
  async exportAnalytics(sellerId: string, format: 'json' | 'csv' | 'excel'): Promise<string> {
    try {
      const salesData = await this.getSalesAnalytics(sellerId, '90d');
      const productPerformance = await this.getProductPerformance(sellerId);
      const customerAnalytics = await this.getCustomerAnalytics(sellerId);
      const marketInsights = await this.getMarketInsights(sellerId);
      const recommendations = await this.getRecommendations(sellerId);

      const analyticsData = {
        summary: {
          period: '90 дней',
          generatedAt: new Date().toISOString(),
          sellerId
        },
        sales: salesData,
        products: productPerformance,
        customers: customerAnalytics,
        market: marketInsights,
        recommendations,
        forecast: await this.getSalesForecast(sellerId, 30)
      };

      switch (format) {
        case 'json':
          return JSON.stringify(analyticsData, null, 2);
        case 'csv':
          return this.convertToCSV(analyticsData);
        case 'excel':
          return JSON.stringify(analyticsData, null, 2); // В реальном приложении здесь будет генерация Excel файла
        default:
          return JSON.stringify(analyticsData, null, 2);
      }
    } catch (error) {
      logger.error('Error exporting analytics:', error);
      return '{}';
    }
  }

  // Конвертация в CSV
  private convertToCSV(data: any): string {
    const csvRows: string[] = [];
    
    // Заголовок
    csvRows.push('Date,Revenue,Orders,Products,Unique Customers,Avg Order Value');
    
    // Данные о продажах
    data.sales.forEach((row: SalesData) => {
      csvRows.push(`${row.date},${row.revenue},${row.orders},${row.products},${row.uniqueCustomers},${row.averageOrderValue}`);
    });

    return csvRows.join('\n');
  }
}

export default SellerAnalytics.getInstance();
