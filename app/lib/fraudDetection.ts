// Система защиты от мошенников
import { logger } from './logger';

interface FraudSignal {
  type: 'suspicious_behavior' | 'fake_account' | 'scam_listing' | 'spam' | 'price_manipulation';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  confidence: number; // 0-100
  timestamp: number;
  userId?: string;
  productId?: string;
  sellerId?: string;
}

interface UserRiskProfile {
  userId: string;
  riskScore: number; // 0-100
  fraudSignals: FraudSignal[];
  lastActivity: number;
  accountAge: number;
  verificationStatus: 'unverified' | 'pending' | 'verified';
  suspiciousActivities: number;
}

interface ProductRiskProfile {
  productId: string;
  riskScore: number;
  fraudSignals: FraudSignal[];
  priceAnomaly: boolean;
  descriptionAnomaly: boolean;
  imageAnomaly: boolean;
  sellerRisk: number;
}

class FraudDetectionEngine {
  private static instance: FraudDetectionEngine;
  private userProfiles: Map<string, UserRiskProfile> = new Map();
  private productProfiles: Map<string, ProductRiskProfile> = new Map();
  private fraudPatterns: Map<string, RegExp> = new Map();

  private constructor() {
    this.initializeFraudPatterns();
  }

  static getInstance(): FraudDetectionEngine {
    if (!FraudDetectionEngine.instance) {
      FraudDetectionEngine.instance = new FraudDetectionEngine();
    }
    return FraudDetectionEngine.instance;
  }

  // Инициализация паттернов мошенничества
  private initializeFraudPatterns() {
    // Подозрительные паттерны в описаниях
    this.fraudPatterns.set('too_good_to_be_true', /(?:бесплатно|бесплатный|подарок|халява|скидка\s*99%|скидка\s*100%|ограниченное предложение|только сегодня)/i);
    
    // Паттерны спама
    this.fraudPatterns.set('spam', /(?:купи|закажи|перейди|нажми|кликни|ссылка|http|www\.|\.com|\.ru)/i);
    
    // Паттерны фишинга
    this.fraudPatterns.set('phishing', /(?:подтверди|верифицируй|введи|логин|пароль|карту|счет|банковский)/i);
    
    // Паттерны сомнительных цен
    this.fraudPatterns.set('price_manipulation', /(?:дешевле|ниже|выгоднее|лучше|уникальный|эксклюзив)/i);
  }

  // Анализ пользователя
  async analyzeUser(userId: string, userActivity: any): Promise<UserRiskProfile> {
    try {
      const existingProfile = this.userProfiles.get(userId);
      const accountAge = this.calculateAccountAge(userId);
      
      const fraudSignals: FraudSignal[] = [];
      let riskScore = 0;

      // Проверка возраста аккаунта
      if (accountAge < 24 * 60 * 60 * 1000) { // Менее 24 часов
        fraudSignals.push({
          type: 'fake_account',
          severity: 'high',
          description: 'Новый аккаунт (менее 24 часов)',
          confidence: 85,
          timestamp: Date.now(),
          userId
        });
        riskScore += 30;
      }

      // Проверка скорости действий
      const actionSpeed = this.calculateActionSpeed(userActivity);
      if (actionSpeed > 10) { // Более 10 действий в минуту
        fraudSignals.push({
          type: 'suspicious_behavior',
          severity: 'medium',
          description: 'Высокая скорость действий',
          confidence: 70,
          timestamp: Date.now(),
          userId
        });
        riskScore += 20;
      }

      // Проверка паттернов в действиях
      const suspiciousPatterns = this.detectSuspiciousPatterns(userActivity);
      fraudSignals.push(...suspiciousPatterns);
      riskScore += suspiciousPatterns.length * 15;

      // Проверка верификации
      const verificationStatus = await this.checkUserVerification(userId);
      if (verificationStatus === 'unverified') {
        riskScore += 25;
      }

      const profile: UserRiskProfile = {
        userId,
        riskScore: Math.min(100, riskScore),
        fraudSignals,
        lastActivity: Date.now(),
        accountAge,
        verificationStatus,
        suspiciousActivities: suspiciousPatterns.length
      };

      this.userProfiles.set(userId, profile);
      
      // Блокировка при высоком риске
      if (profile.riskScore > 80) {
        await this.flagSuspiciousUser(userId, profile);
      }

      return profile;
    } catch (error) {
      logger.error('Error analyzing user:', error);
      return this.getDefaultUserProfile(userId);
    }
  }

  // Анализ товара
  async analyzeProduct(productId: string, productData: any): Promise<ProductRiskProfile> {
    try {
      const fraudSignals: FraudSignal[] = [];
      let riskScore = 0;

      // Проверка аномалии цены
      const priceAnomaly = this.detectPriceAnomaly(productData);
      if (priceAnomaly.isAnomalous) {
        fraudSignals.push({
          type: 'price_manipulation',
          severity: 'high',
          description: `Слишком низкая цена (${priceAnomaly.expectedPrice}₽ вместо ${productData.price}₽)`,
          confidence: priceAnomaly.confidence,
          timestamp: Date.now(),
          productId
        });
        riskScore += 35;
      }

      // Проверка описания
      const descriptionAnomaly = this.detectDescriptionAnomaly(productData.description || '');
      if (descriptionAnomaly.isAnomalous) {
        fraudSignals.push({
          type: 'scam_listing',
          severity: 'medium',
          description: 'Подозрительное описание товара',
          confidence: descriptionAnomaly.confidence,
          timestamp: Date.now(),
          productId
        });
        riskScore += 25;
      }

      // Проверка изображений
      const imageAnomaly = this.detectImageAnomaly(productData.image_url);
      if (imageAnomaly.isAnomalous) {
        fraudSignals.push({
          type: 'scam_listing',
          severity: 'medium',
          description: 'Проблемы с изображениями товара',
          confidence: imageAnomaly.confidence,
          timestamp: Date.now(),
          productId
        });
        riskScore += 20;
      }

      // Проверка продавца
      const sellerRisk = await this.getSellerRisk(productData.seller_id);
      riskScore += sellerRisk * 0.3;

      const profile: ProductRiskProfile = {
        productId,
        riskScore: Math.min(100, riskScore),
        fraudSignals,
        priceAnomaly: priceAnomaly.isAnomalous,
        descriptionAnomaly: descriptionAnomaly.isAnomalous,
        imageAnomaly: imageAnomaly.isAnomalous,
        sellerRisk
      };

      this.productProfiles.set(productId, profile);

      // Блокировка при высоком риске
      if (profile.riskScore > 75) {
        await this.flagSuspiciousProduct(productId, profile);
      }

      return profile;
    } catch (error) {
      logger.error('Error analyzing product:', error);
      return this.getDefaultProductProfile(productId);
    }
  }

  // Расчет возраста аккаунта
  private calculateAccountAge(userId: string): number {
    // В реальном приложении здесь будет проверка даты регистрации
    // Сейчас имитируем случайный возраст
    return Math.random() * 30 * 24 * 60 * 60 * 1000; // 0-30 дней
  }

  // Расчет скорости действий
  private calculateActionSpeed(userActivity: any): number {
    // Имитация анализа скорости действий
    return Math.random() * 20; // 0-20 действий в минуту
  }

  // Обнаружение подозрительных паттернов
  private detectSuspiciousPatterns(userActivity: any): FraudSignal[] {
    const signals: FraudSignal[] = [];

    // Проверяем действия пользователя на предмет паттернов
    const actions = userActivity.actions || [];
    
    actions.forEach((action: any, index: number) => {
      if (action.type === 'message' || action.type === 'comment') {
        const content = action.content || '';
        
        // Проверяем каждый паттерн
        for (const [patternName, pattern] of this.fraudPatterns) {
          if (pattern.test(content)) {
            signals.push({
              type: patternName === 'too_good_to_be_true' ? 'scam_listing' : 'spam',
              severity: 'medium',
              description: `Подозрительный паттерн: ${patternName}`,
              confidence: 75,
              timestamp: Date.now(),
              userId: userActivity.userId
            });
          }
        }
      }
    });

    return signals;
  }

  // Обнаружение аномалии цены
  private detectPriceAnomaly(productData: any): { isAnomalous: boolean; expectedPrice: number; confidence: number } {
    const price = productData.price || 0;
    const category = productData.category || '';
    
    // Средние цены по категориям (имитация)
    const categoryPrices: { [key: string]: number } = {
      'Смартфоны': 25000,
      'Ноутбуки': 45000,
      'Планшеты': 20000,
      'Телевизоры': 30000,
      'Наушники': 5000,
      'Часы': 15000
    };

    const expectedPrice = categoryPrices[category] || 20000;
    const priceDifference = Math.abs(price - expectedPrice) / expectedPrice;

    return {
      isAnomalous: priceDifference > 0.7, // Цена отличается на 70%+
      expectedPrice,
      confidence: Math.min(95, priceDifference * 100)
    };
  }

  // Обнаружение аномалии в описании
  private detectDescriptionAnomaly(description: string): { isAnomalous: boolean; confidence: number } {
    let suspiciousCount = 0;
    let totalPatterns = 0;

    for (const [patternName, pattern] of this.fraudPatterns) {
      if (patternName === 'too_good_to_be_true' || patternName === 'spam') {
        totalPatterns++;
        if (pattern.test(description)) {
          suspiciousCount++;
        }
      }
    }

    const ratio = suspiciousCount / totalPatterns;
    return {
      isAnomalous: ratio > 0.3,
      confidence: Math.min(90, ratio * 100)
    };
  }

  // Обнаружение аномалии изображений
  private detectImageAnomaly(imageUrl: string): { isAnomalous: boolean; confidence: number } {
    // Имитация проверки изображений
    // В реальном приложении здесь будет анализ изображения с AI
    const suspiciousUrls = ['placeholder', 'default', 'sample', 'test'];
    const isSuspicious = suspiciousUrls.some(url => imageUrl.toLowerCase().includes(url));

    return {
      isAnomalous: isSuspicious,
      confidence: isSuspicious ? 80 : 10
    };
  }

  // Получить риск продавца
  private async getSellerRisk(sellerId: string): number {
    const profile = this.userProfiles.get(sellerId);
    return profile ? profile.riskScore : 25; // Риск по умолчанию
  }

  // Проверка верификации пользователя
  private async checkUserVerification(userId: string): Promise<'unverified' | 'pending' | 'verified'> {
    // Имитация проверки верификации
    return Math.random() > 0.7 ? 'verified' : 'unverified';
  }

  // Пометить подозрительного пользователя
  private async flagSuspiciousUser(userId: string, profile: UserRiskProfile): Promise<void> {
    logger.warn('Suspicious user flagged:', { userId, riskScore: profile.riskScore });
    
    // В реальном приложении здесь будет:
    // - Отправка уведомления администраторам
    // - Временная блокировка аккаунта
    // - Требование дополнительной верификации
  }

  // Пометить подозрительный товар
  private async flagSuspiciousProduct(productId: string, profile: ProductRiskProfile): Promise<void> {
    logger.warn('Suspicious product flagged:', { productId, riskScore: profile.riskScore });
    
    // В реальном приложении здесь будет:
    // - Скрытие товара из поиска
    // - Отправка на модерацию
    // - Уведомление администратора
  }

  // Получить профиль риска пользователя по умолчанию
  private getDefaultUserProfile(userId: string): UserRiskProfile {
    return {
      userId,
      riskScore: 25,
      fraudSignals: [],
      lastActivity: Date.now(),
      accountAge: 0,
      verificationStatus: 'unverified',
      suspiciousActivities: 0
    };
  }

  // Получить профиль риска товара по умолчанию
  private getDefaultProductProfile(productId: string): ProductRiskProfile {
    return {
      productId,
      riskScore: 25,
      fraudSignals: [],
      priceAnomaly: false,
      descriptionAnomaly: false,
      imageAnomaly: false,
      sellerRisk: 25
    };
  }

  // Получить всех пользователей с высоким риском
  getHighRiskUsers(threshold: number = 70): UserRiskProfile[] {
    return Array.from(this.userProfiles.values())
      .filter(profile => profile.riskScore >= threshold)
      .sort((a, b) => b.riskScore - a.riskScore);
  }

  // Получить все товары с высоким риском
  getHighRiskProducts(threshold: number = 70): ProductRiskProfile[] {
    return Array.from(this.productProfiles.values())
      .filter(profile => profile.riskScore >= threshold)
      .sort((a, b) => b.riskScore - a.riskScore);
  }

  // Обновить данные о мошенничестве
  async updateFraudData(): Promise<void> {
    logger.log('Updating fraud detection data...');
    
    // В реальном приложении здесь будет:
    // - Обновление ML моделей
    // - Загрузка новых паттернов мошенничества
    // - Анализ последних инцидентов
    
    logger.log('Fraud detection data updated');
  }
}

export default FraudDetectionEngine.getInstance();
