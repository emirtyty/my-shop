// Система сравнения цен у конкурентов
import { logger } from './logger';

interface CompetitorPrice {
  productId: string;
  productName: string;
  competitorName: string;
  competitorPrice: number;
  ourPrice: number;
  priceDifference: number;
  priceDifferencePercent: number;
  url?: string;
  lastUpdated: number;
}

interface PriceComparisonResult {
  productId: string;
  productName: string;
  ourPrice: number;
  competitors: CompetitorPrice[];
  cheapestOption: {
    name: string;
    price: number;
    isOurProduct: boolean;
  };
  averagePrice: number;
  pricePosition: 'cheapest' | 'competitive' | 'expensive';
}

class PriceComparisonEngine {
  private static instance: PriceComparisonEngine;
  private competitorData: Map<string, CompetitorPrice[]> = new Map();

  private constructor() {
    this.initializeMockData();
  }

  static getInstance(): PriceComparisonEngine {
    if (!PriceComparisonEngine.instance) {
      PriceComparisonEngine.instance = new PriceComparisonEngine();
    }
    return PriceComparisonEngine.instance;
  }

  // Имитация данных конкурентов (в реальном проекте здесь будет API)
  private initializeMockData() {
    // Моковые данные для демонстрации
    const mockCompetitors = [
      {
        name: 'Ozon',
        priceMultiplier: 0.95, // Обычно на 5% дешевле
        url: 'https://ozon.ru'
      },
      {
        name: 'Wildberries',
        priceMultiplier: 0.92, // Обычно на 8% дешевле
        url: 'https://wildberries.ru'
      },
      {
        name: 'AliExpress',
        priceMultiplier: 0.85, // Обычно на 15% дешевле
        url: 'https://aliexpress.com'
      },
      {
        name: 'Яндекс.Маркет',
        priceMultiplier: 0.98, // Обычно на 2% дешевле
        url: 'https://market.yandex.ru'
      }
    ];

    // Генерируем моковые данные для товаров
    const mockProducts = [
      'iPhone 15 Pro', 'Samsung Galaxy S24', 'MacBook Air M2', 'iPad Pro',
      'AirPods Pro', 'Sony WH-1000XM5', 'Dyson V15', 'Instant Pot Duo'
    ];

    mockProducts.forEach(productName => {
      const competitors: CompetitorPrice[] = mockCompetitors.map(competitor => ({
        productId: this.generateProductId(productName),
        productName,
        competitorName: competitor.name,
        competitorPrice: 0, // Будет заполнено ниже
        ourPrice: Math.floor(Math.random() * 50000) + 10000, // 10k-60k
        priceDifference: 0,
        priceDifferencePercent: 0,
        url: competitor.url,
        lastUpdated: Date.now()
      }));

      // Заполняем цены конкурентов
      competitors.forEach(comp => {
        comp.competitorPrice = Math.floor(comp.ourPrice * competitor.priceMultiplier);
        comp.priceDifference = comp.ourPrice - comp.competitorPrice;
        comp.priceDifferencePercent = Math.round((comp.priceDifference / comp.ourPrice) * 100);
      });

      this.competitorData.set(productName, competitors);
    });
  }

  private generateProductId(productName: string): string {
    return productName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  }

  // Получить сравнение цен для товара
  async getPriceComparison(productName: string, ourPrice: number): Promise<PriceComparisonResult> {
    try {
      const competitors = this.competitorData.get(productName) || [];
      
      // Если нет данных, генерируем их на лету
      if (competitors.length === 0) {
        const generatedCompetitors = await this.generateCompetitorPrices(productName, ourPrice);
        this.competitorData.set(productName, generatedCompetitors);
        return this.calculateComparison(productName, ourPrice, generatedCompetitors);
      }

      return this.calculateComparison(productName, ourPrice, competitors);
    } catch (error) {
      logger.error('Error getting price comparison:', error);
      return this.getEmptyResult(productName, ourPrice);
    }
  }

  // Генерация цен конкурентов на лету
  private async generateCompetitorPrices(productName: string, ourPrice: number): Promise<CompetitorPrice[]> {
    const competitors = [
      { name: 'Ozon', multiplier: 0.95, url: 'https://ozon.ru' },
      { name: 'Wildberries', multiplier: 0.92, url: 'https://wildberries.ru' },
      { name: 'AliExpress', multiplier: 0.85, url: 'https://aliexpress.com' },
      { name: 'Яндекс.Маркет', multiplier: 0.98, url: 'https://market.yandex.ru' }
    ];

    return competitors.map(comp => ({
      productId: this.generateProductId(productName),
      productName,
      competitorName: comp.name,
      competitorPrice: Math.floor(ourPrice * comp.multiplier),
      ourPrice,
      priceDifference: ourPrice - Math.floor(ourPrice * comp.multiplier),
      priceDifferencePercent: Math.round(((ourPrice - Math.floor(ourPrice * comp.multiplier)) / ourPrice) * 100),
      url: comp.url,
      lastUpdated: Date.now()
    }));
  }

  // Расчет сравнения
  private calculateComparison(productName: string, ourPrice: number, competitors: CompetitorPrice[]): PriceComparisonResult {
    const allPrices = [ourPrice, ...competitors.map(c => c.competitorPrice)];
    const averagePrice = allPrices.reduce((sum, price) => sum + price, 0) / allPrices.length;
    
    // Находим самый дешевый вариант
    const cheapest = allPrices.reduce((min, price) => price < min ? price : min, Infinity);
    const cheapestOption = competitors.find(c => c.competitorPrice === cheapest) 
      ? { name: competitors.find(c => c.competitorPrice === cheapest)!.competitorName, price: cheapest, isOurProduct: false }
      : { name: 'Мы', price: ourPrice, isOurProduct: true };

    // Определяем позицию нашей цены
    let pricePosition: 'cheapest' | 'competitive' | 'expensive';
    if (ourPrice === cheapest) {
      pricePosition = 'cheapest';
    } else if (ourPrice <= averagePrice * 1.1) {
      pricePosition = 'competitive';
    } else {
      pricePosition = 'expensive';
    }

    return {
      productId: this.generateProductId(productName),
      productName,
      ourPrice,
      competitors,
      cheapestOption,
      averagePrice: Math.round(averagePrice),
      pricePosition
    };
  }

  // Пустой результат при ошибке
  private getEmptyResult(productName: string, ourPrice: number): PriceComparisonResult {
    return {
      productId: this.generateProductId(productName),
      productName,
      ourPrice,
      competitors: [],
      cheapestOption: { name: 'Мы', price: ourPrice, isOurProduct: true },
      averagePrice: ourPrice,
      pricePosition: 'competitive'
    };
  }

  // Получить лучшие предложения
  async getBestDeals(limit: number = 10): Promise<PriceComparisonResult[]> {
    const allComparisons: PriceComparisonResult[] = [];
    
    // Получаем сравнения для всех товаров
    for (const [productName] of this.competitorData) {
      const comparison = await this.getPriceComparison(productName, 0);
      allComparisons.push(comparison);
    }

    // Сортируем по выгодности (наши товары, которые дешевле конкурентов)
    return allComparisons
      .filter(comp => comp.pricePosition === 'cheapest' || comp.pricePosition === 'competitive')
      .sort((a, b) => {
        const aSavings = a.averagePrice - a.ourPrice;
        const bSavings = b.averagePrice - b.ourPrice;
        return bSavings - aSavings;
      })
      .slice(0, limit);
  }

  // Получить самые дорогие товары (где мы дороже всех)
  async getMostExpensive(limit: number = 10): Promise<PriceComparisonResult[]> {
    const allComparisons: PriceComparisonResult[] = [];
    
    for (const [productName] of this.competitorData) {
      const comparison = await this.getPriceComparison(productName, 0);
      allComparisons.push(comparison);
    }

    return allComparisons
      .filter(comp => comp.pricePosition === 'expensive')
      .sort((a, b) => {
        const aOverprice = a.ourPrice - a.averagePrice;
        const bOverprice = b.ourPrice - b.averagePrice;
        return bOverprice - aOverprice;
      })
      .slice(0, limit);
  }

  // Обновить данные конкурентов (имитация API вызова)
  async updateCompetitorData(): Promise<void> {
    logger.log('Updating competitor data...');
    
    // В реальном проекте здесь будут API вызовы к площадкам
    // Сейчас просто обновляем время последнего обновления
    for (const [productName, competitors] of this.competitorData) {
      const updatedCompetitors = competitors.map(comp => ({
        ...comp,
        lastUpdated: Date.now(),
        // Добавляем небольшую вариацию в цены
        competitorPrice: Math.floor(comp.competitorPrice * (0.98 + Math.random() * 0.04))
      }));
      
      this.competitorData.set(productName, updatedCompetitors);
    }
    
    logger.log('Competitor data updated successfully');
  }
}

export default PriceComparisonEngine.getInstance();
