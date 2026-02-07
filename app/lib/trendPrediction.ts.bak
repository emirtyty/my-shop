// Система прогнозирования трендов
import { logger } from './logger';

interface TrendData {
  category: string;
  currentValue: number;
  previousValue: number;
  growthRate: number;
  prediction: number;
  confidence: number;
  timeframe: 'daily' | 'weekly' | 'monthly';
  lastUpdated: number;
}

interface MarketTrend {
  id: string;
  name: string;
  description: string;
  type: 'emerging' | 'declining' | 'stable' | 'viral';
  categories: string[];
  confidence: number;
  timeframe: string;
  impact: 'high' | 'medium' | 'low';
  recommendations: string[];
}

interface PredictionModel {
  id: string;
  name: string;
  accuracy: number;
  dataPoints: number;
  lastTrained: number;
}

class TrendPredictionEngine {
  private static instance: TrendPredictionEngine;
  private historicalData: Map<string, number[]> = new Map();
  private trends: Map<string, TrendData> = new Map();
  private marketTrends: MarketTrend[] = [];
  private models: Map<string, PredictionModel> = new Map();

  private constructor() {
    this.initializeModels();
    this.generateMockData();
  }

  static getInstance(): TrendPredictionEngine {
    if (!TrendPredictionEngine.instance) {
      TrendPredictionEngine.instance = new TrendPredictionEngine();
    }
    return TrendPredictionEngine.instance;
  }

  // Инициализация моделей прогнозирования
  private initializeModels() {
    this.models.set('linear_regression', {
      id: 'linear_regression',
      name: 'Линейная регрессия',
      accuracy: 0.85,
      dataPoints: 1000,
      lastTrained: Date.now() - 7 * 24 * 60 * 60 * 1000 // 7 дней назад
    });

    this.models.set('moving_average', {
      id: 'moving_average',
      name: 'Скользящее среднее',
      accuracy: 0.78,
      dataPoints: 500,
      lastTrained: Date.now() - 3 * 24 * 60 * 60 * 1000 // 3 дня назад
    });

    this.models.set('exponential_smoothing', {
      id: 'exponential_smoothing',
      name: 'Экспоненциальное сглаживание',
      accuracy: 0.82,
      dataPoints: 800,
      lastTrained: Date.now() - 5 * 24 * 60 * 60 * 1000 // 5 дней назад
    });
  }

  // Генерация моковых исторических данных
  private generateMockData() {
    const categories = [
      'Смартфоны', 'Ноутбуки', 'Планшеты', 'Телевизоры', 'Наушники',
      'Часы', 'Одежда', 'Обувь', 'Мебель', 'Кухня',
      'Спорт', 'Красота', 'Автотовары', 'Книги', 'Игры'
    ];

    categories.forEach(category => {
      const data: number[] = [];
      const baseValue = Math.random() * 1000 + 500; // 500-1500
      
      // Генерируем данные за последние 30 дней
      for (let i = 0; i < 30; i++) {
        const trend = Math.sin(i * 0.2) * 200 + Math.random() * 100 - 50;
        const seasonal = Math.cos(i * 0.1) * 150;
        const noise = (Math.random() - 0.5) * 50;
        
        data.push(Math.max(100, baseValue + trend + seasonal + noise));
      }
      
      this.historicalData.set(category, data);
    });
  }

  // Прогноз тренда для категории
  async predictTrend(
    category: string, 
    timeframe: 'daily' | 'weekly' | 'monthly' = 'weekly'
  ): Promise<TrendData> {
    try {
      const data = this.historicalData.get(category);
      if (!data || data.length < 10) {
        return this.getDefaultTrendData(category, timeframe);
      }

      // Выбираем модель прогнозирования
      const model = this.selectBestModel(category);
      
      // Подготавливаем данные
      const preparedData = this.prepareData(data, timeframe);
      
      // Делаем прогноз
      const prediction = await this.makePrediction(preparedData, model);
      
      // Рассчитываем метрики
      const currentValue = data[data.length - 1];
      const previousValue = data[data.length - Math.floor(data.length / 7)];
      const growthRate = ((currentValue - previousValue) / previousValue) * 100;
      
      const trendData: TrendData = {
        category,
        currentValue,
        previousValue,
        growthRate,
        prediction,
        confidence: model.accuracy * 100,
        timeframe,
        lastUpdated: Date.now()
      };

      this.trends.set(`${category}_${timeframe}`, trendData);
      
      return trendData;
    } catch (error) {
      logger.error('Error predicting trend:', error);
      return this.getDefaultTrendData(category, timeframe);
    }
  }

  // Выбор лучшей модели для категории
  private selectBestModel(category: string): PredictionModel {
    // В реальном приложении здесь будет анализ исторической точности
    // Сейчас просто выбираем модель с самой высокой точностью
    return Array.from(this.models.values())
      .sort((a, b) => b.accuracy - a.accuracy)[0];
  }

  // Подготовка данных для прогнозирования
  private prepareData(data: number[], timeframe: 'daily' | 'weekly' | 'monthly'): number[] {
    let preparedData = [...data];
    
    // Агрегируем данные в зависимости от временного периода
    switch (timeframe) {
      case 'daily':
        // Данные уже по дням
        break;
      case 'weekly':
        // Агрегируем по неделям
        preparedData = this.aggregateData(data, 7);
        break;
      case 'monthly':
        // Агрегируем по месяцам
        preparedData = this.aggregateData(data, 30);
        break;
    }
    
    return preparedData;
  }

  // Агрегация данных
  private aggregateData(data: number[], period: number): number[] {
    const aggregated: number[] = [];
    
    for (let i = 0; i < data.length; i += period) {
      const chunk = data.slice(i, i + period);
      const average = chunk.reduce((sum, val) => sum + val, 0) / chunk.length;
      aggregated.push(average);
    }
    
    return aggregated;
  }

  // Прогноз с использованием модели
  private async makePrediction(data: number[], model: PredictionModel): Promise<number> {
    switch (model.id) {
      case 'linear_regression':
        return this.linearRegressionPrediction(data);
      case 'moving_average':
        return this.movingAveragePrediction(data);
      case 'exponential_smoothing':
        return this.exponentialSmoothingPrediction(data);
      default:
        return this.linearRegressionPrediction(data);
    }
  }

  // Линейная регрессия
  private linearRegressionPrediction(data: number[]): number {
    const n = data.length;
    const x = Array.from({ length: n }, (_, i) => i);
    
    const sumX = x.reduce((sum, val) => sum + val, 0);
    const sumY = data.reduce((sum, val) => sum + val, 0);
    const sumXY = x.reduce((sum, val, i) => sum + val * data[i], 0);
    const sumXX = x.reduce((sum, val) => sum + val * val, 0);
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;
    
    // Прогноз на следующий период
    const nextX = n;
    return slope * nextX + intercept;
  }

  // Скользящее среднее
  private movingAveragePrediction(data: number[]): number {
    const period = Math.min(5, Math.floor(data.length / 3));
    const recentData = data.slice(-period);
    const average = recentData.reduce((sum, val) => sum + val, 0) / recentData.length;
    
    // Добавляем небольшой тренд
    const trend = (recentData[recentData.length - 1] - recentData[0]) / recentData.length;
    return average + trend;
  }

  // Экспоненциальное сглаживание
  private exponentialSmoothingPrediction(data: number[]): number {
    const alpha = 0.3; // Коэффициент сглаживания
    let smoothed = data[0];
    
    for (let i = 1; i < data.length; i++) {
      smoothed = alpha * data[i] + (1 - alpha) * smoothed;
    }
    
    // Добавляем тренд
    const lastFew = data.slice(-3);
    const trend = (lastFew[2] - lastFew[0]) / 2;
    return smoothed + trend;
  }

  // Получить данные тренда по умолчанию
  private getDefaultTrendData(category: string, timeframe: 'daily' | 'weekly' | 'monthly'): TrendData {
    return {
      category,
      currentValue: 1000,
      previousValue: 950,
      growthRate: 5.26,
      prediction: 1050,
      confidence: 75,
      timeframe,
      lastUpdated: Date.now()
    };
  }

  // Получить все тренды
  getAllTrends(timeframe: 'daily' | 'weekly' | 'monthly' = 'weekly'): TrendData[] {
    return Array.from(this.trends.values())
      .filter(trend => trend.timeframe === timeframe)
      .sort((a, b) => b.confidence - a.confidence);
  }

  // Обнаружить новые тренды
  async detectEmergingTrends(): Promise<MarketTrend[]> {
    const trends: MarketTrend[] = [];
    const categories = Array.from(this.historicalData.keys());

    // Анализируем рост категорий
    for (const category of categories) {
      const data = this.historicalData.get(category);
      if (!data || data.length < 14) continue;

      const recentGrowth = this.calculateGrowthRate(data.slice(-7));
      const overallGrowth = this.calculateGrowthRate(data);

      // Определяем тип тренда
      let type: 'emerging' | 'declining' | 'stable' | 'viral';
      let impact: 'high' | 'medium' | 'low';
      
      if (recentGrowth > 20 && overallGrowth > 15) {
        type = 'emerging';
        impact = 'high';
      } else if (recentGrowth > 10 && overallGrowth > 5) {
        type = 'emerging';
        impact = 'medium';
      } else if (recentGrowth < -10 && overallGrowth < -5) {
        type = 'declining';
        impact = 'medium';
      } else if (Math.abs(recentGrowth) < 5) {
        type = 'stable';
        impact = 'low';
      }

      if (type === 'emerging' || type === 'viral') {
        trends.push({
          id: crypto.randomUUID(),
          name: `Рост категории "${category}"`,
          description: `Категория ${category} показывает рост на ${recentGrowth.toFixed(1)}%`,
          type,
          categories: [category],
          confidence: Math.min(95, 50 + Math.abs(recentGrowth)),
          timeframe: 'неделя',
          impact,
          recommendations: this.generateRecommendations(category, type)
        });
      }
    }

    // Сортируем по уверенности и влиянию
    trends.sort((a, b) => {
      const impactWeight = a.impact === 'high' ? 3 : a.impact === 'medium' ? 2 : 1;
      const bImpactWeight = b.impact === 'high' ? 3 : b.impact === 'medium' ? 2 : 1;
      
      return (b.confidence * bImpactWeight) - (a.confidence * aImpactWeight);
    });

    this.marketTrends = trends;
    return trends;
  }

  // Рассчитать темп роста
  private calculateGrowthRate(data: number[]): number {
    if (data.length < 2) return 0;
    
    const start = data[0];
    const end = data[data.length - 1];
    
    return ((end - start) / start) * 100;
  }

  // Генерировать рекомендации
  private generateRecommendations(category: string, type: string): string[] {
    const recommendations: string[] = [];
    
    switch (type) {
      case 'emerging':
        recommendations.push(
          `Увеличить маркетинг для категории ${category}`,
          `Добавить больше товаров в ${category}`,
          `Создать промо-акции для ${category}`
        );
        break;
      case 'viral':
        recommendations.push(
          `Запустить вирусную кампанию для ${category}`,
          `Использовать инфлюенсеров для ${category}`,
          `Создать контент про ${category}`
        );
        break;
      case 'declining':
        recommendations.push(
          `Проанализировать причины падения ${category}`,
          `Снизить цены на товары в ${category}`,
          `Обновить ассортимент в ${category}`
        );
        break;
      case 'stable':
        recommendations.push(
          `Поддерживать текущий уровень ${category}`,
          `Оптимизировать продажи в ${category}`,
          `Мониторить конкурентов в ${category}`
        );
        break;
    }
    
    return recommendations;
  }

  // Получить прогноз спроса
  async getDemandForecast(category: string, days: number = 30): Promise<{ date: string; demand: number; confidence: number }[]> {
    try {
      const data = this.historicalData.get(category);
      if (!data || data.length < 7) {
        return this.getDefaultForecast(days);
      }

      const forecast: { date: string; demand: number; confidence: number }[] = [];
      const model = this.selectBestModel(category);
      
      // Используем скользящее среднее для краткосрочных прогнозов
      let smoothedData = [...data];
      
      for (let i = 0; i < days; i++) {
        const alpha = 0.3;
        const lastValue = smoothedData[smoothedData.length - 1];
        const trend = this.calculateShortTermTrend(smoothedData);
        
        const nextValue = alpha * (lastValue + trend) + (1 - alpha) * lastValue;
        smoothedData.push(nextValue);
        
        const date = new Date();
        date.setDate(date.getDate() + i + 1);
        
        forecast.push({
          date: date.toISOString().split('T')[0],
          demand: Math.round(nextValue),
          confidence: model.accuracy * 100 * (1 - i / days) // Уверенность снижается со временем
        });
      }
      
      return forecast;
    } catch (error) {
      logger.error('Error getting demand forecast:', error);
      return this.getDefaultForecast(days);
    }
  }

  // Расчет краткосрочного тренда
  private calculateShortTermTrend(data: number[]): number {
    if (data.length < 3) return 0;
    
    const recent = data.slice(-3);
    return (recent[2] - recent[0]) / 2;
  }

  // Прогноз по умолчанию
  private getDefaultForecast(days: number): { date: string; demand: number; confidence: number }[] {
    const forecast: { date: string; demand: number; confidence: number }[] = [];
    
    for (let i = 0; i < days; i++) {
      const date = new Date();
      date.setDate(date.getDate() + i + 1);
      
      forecast.push({
        date: date.toISOString().split('T')[0],
        demand: 1000 + Math.floor(Math.random() * 200),
        confidence: 70
      });
    }
    
    return forecast;
  }

  // Обновить модели прогнозирования
  async updateModels(): Promise<void> {
    logger.log('Updating prediction models...');
    
    // В реальном приложении здесь будет:
    // - Переобучение моделей на новых данных
    // - Валидация точности моделей
    // - Оптимизация гиперпараметров
    
    // Обновляем время последнего обучения
    for (const [id, model] of this.models) {
      model.lastTrained = Date.now();
      model.dataPoints += Math.floor(Math.random() * 100);
      model.accuracy = Math.min(0.95, model.accuracy + Math.random() * 0.05);
    }
    
    logger.log('Prediction models updated successfully');
  }

  // Получить информацию о моделях
  getModelsInfo(): PredictionModel[] {
    return Array.from(this.models.values());
  }

  // Получить рыночные тренды
  getMarketTrends(): MarketTrend[] {
    return this.marketTrends;
  }
}

export default TrendPredictionEngine.getInstance();
