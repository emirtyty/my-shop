// Автоматический импорт товаров из других площадок
import { logger } from './logger';
import { supabase } from './supabase';

interface ImportedProduct {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  images: string[];
  specifications: { [key: string]: any };
  stock: number;
  source: 'ozon' | 'wildberries' | 'aliexpress' | 'yandex_market' | 'avito';
  sourceId: string;
  sourceUrl: string;
  importedAt: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  error?: string;
}

interface ImportRule {
  id: string;
  name: string;
  source: 'ozon' | 'wildberries' | 'aliexpress' | 'yandex_market' | 'avito';
  categoryMapping: { [sourceCategory: string]: string };
  priceAdjustment: {
    type: 'percentage' | 'fixed';
    value: number;
  };
  filters: {
    minPrice?: number;
    maxPrice?: number;
    categories?: string[];
    keywords?: string[];
    excludeKeywords?: string[];
  };
  autoImport: boolean;
  importInterval: number; // в часах
  lastImport?: string;
  sellerId: string;
}

interface ImportSession {
  id: string;
  ruleId: string;
  status: 'running' | 'completed' | 'failed';
  startedAt: string;
  completedAt?: string;
  productsFound: number;
  productsImported: number;
  productsSkipped: number;
  errors: string[];
}

class AutoImportService {
  private static instance: AutoImportService;
  private activeSessions: Map<string, ImportSession> = new Map();
  private importIntervals: Map<string, NodeJS.Timeout> = new Map();

  private constructor() {
    this.startScheduledImports();
  }

  static getInstance(): AutoImportService {
    if (!AutoImportService.instance) {
      AutoImportService.instance = new AutoImportService();
    }
    return AutoImportService.instance;
  }

  // Создание правила импорта
  async createImportRule(rule: Omit<ImportRule, 'id'>): Promise<ImportRule> {
    try {
      const { data, error } = await supabase
        .from('import_rules')
        .insert({
          ...rule,
          id: crypto.randomUUID()
        })
        .select()
        .single();

      if (error) throw error;

      // Запускаем автоматический импорт если включен
      if (rule.autoImport) {
        this.scheduleImport(data.id, rule.importInterval);
      }

      logger.log('Import rule created:', data.id);
      return data;
    } catch (error) {
      logger.error('Error creating import rule:', error);
      throw error;
    }
  }

  // Запуск импорта по правилу
  async startImport(ruleId: string): Promise<ImportSession> {
    try {
      const rule = await this.getImportRule(ruleId);
      if (!rule) {
        throw new Error('Import rule not found');
      }

      // Проверяем, нет ли активной сессии
      const existingSession = this.activeSessions.get(ruleId);
      if (existingSession && existingSession.status === 'running') {
        throw new Error('Import session already running');
      }

      const sessionId = crypto.randomUUID();
      const session: ImportSession = {
        id: sessionId,
        ruleId,
        status: 'running',
        startedAt: new Date().toISOString(),
        productsFound: 0,
        productsImported: 0,
        productsSkipped: 0,
        errors: []
      };

      this.activeSessions.set(ruleId, session);

      // Запускаем импорт в фоновом режиме
      this.processImport(sessionId, rule);

      logger.log('Import session started:', sessionId);
      return session;
    } catch (error) {
      logger.error('Error starting import:', error);
      throw error;
    }
  }

  // Обработка импорта
  private async processImport(sessionId: string, rule: ImportRule): Promise<void> {
    try {
      const session = this.activeSessions.get(rule.id);
      if (!session) return;

      // Получаем товары из источника
      const sourceProducts = await this.fetchProductsFromSource(rule.source, rule);
      session.productsFound = sourceProducts.length;

      // Фильтруем и преобразуем товары
      const filteredProducts = this.filterAndTransformProducts(sourceProducts, rule);

      // Импортируем товары
      let importedCount = 0;
      let skippedCount = 0;

      for (const product of filteredProducts) {
        try {
          const existing = await this.checkProductExists(product.sourceId, rule.source);
          
          if (!existing) {
            await this.importProduct(product, rule.sellerId);
            importedCount++;
          } else {
            skippedCount++;
          }
        } catch (error) {
          session.errors.push(`Error importing ${product.name}: ${error}`);
        }
      }

      // Обновляем сессию
      session.status = 'completed';
      session.completedAt = new Date().toISOString();
      session.productsImported = importedCount;
      session.productsSkipped = skippedCount;

      // Обновляем правило
      await this.updateImportRule(rule.id, {
        lastImport: new Date().toISOString()
      });

      logger.log(`Import session ${sessionId} completed: ${importedCount} imported, ${skippedCount} skipped`);
    } catch (error) {
      logger.error('Error processing import:', error);
      
      const session = this.activeSessions.get(rule.id);
      if (session) {
        session.status = 'failed';
        session.completedAt = new Date().toISOString();
        session.errors.push(error.message);
      }
    }
  }

  // Получение товаров из источника
  private async fetchProductsFromSource(
    source: ImportRule['source'], 
    rule: ImportRule
  ): Promise<any[]> {
    try {
      switch (source) {
        case 'ozon':
          return await this.fetchOzonProducts(rule);
        case 'wildberries':
          return await this.fetchWildberriesProducts(rule);
        case 'aliexpress':
          return await this.fetchAliexpressProducts(rule);
        case 'yandex_market':
          return await this.fetchYandexMarketProducts(rule);
        case 'avito':
          return await this.fetchAvitoProducts(rule);
        default:
          throw new Error(`Unsupported source: ${source}`);
      }
    } catch (error) {
      logger.error(`Error fetching products from ${source}:`, error);
      return [];
    }
  }

  // Имитация получения товаров с Ozon
  private async fetchOzonProducts(rule: ImportRule): Promise<any[]> {
    // В реальном приложении здесь будет API вызов к Ozon
    const mockProducts = [];
    const categories = Object.keys(rule.categoryMapping);

    for (let i = 0; i < 100; i++) {
      const category = categories[Math.floor(Math.random() * categories.length)];
      const basePrice = 1000 + Math.random() * 50000;

      mockProducts.push({
        id: `ozon_${i}`,
        name: `Товар ${i} с Ozon`,
        description: `Описание товара ${i} из категории ${category}`,
        price: basePrice,
        category,
        images: [`https://example.com/image${i}.jpg`],
        specifications: {
          brand: 'Бренд',
          model: `Модель ${i}`,
          color: 'Черный',
          weight: Math.floor(Math.random() * 1000) + 100
        },
        stock: Math.floor(Math.random() * 100),
        rating: 3 + Math.random() * 2,
        reviews: Math.floor(Math.random() * 1000)
      });
    }

    return mockProducts;
  }

  // Имитация получения товаров с Wildberries
  private async fetchWildberriesProducts(rule: ImportRule): Promise<any[]> {
    // В реальном приложении здесь будет API вызов к Wildberries
    const mockProducts = [];
    const categories = Object.keys(rule.categoryMapping);

    for (let i = 0; i < 80; i++) {
      const category = categories[Math.floor(Math.random() * categories.length)];
      const basePrice = 800 + Math.random() * 40000;

      mockProducts.push({
        id: `wb_${i}`,
        name: `Товар ${i} с Wildberries`,
        description: `Описание товара ${i} из категории ${category}`,
        price: basePrice,
        category,
        images: [`https://example.com/wb_image${i}.jpg`],
        specifications: {
          brand: 'Бренд WB',
          model: `Модель WB ${i}`,
          material: 'Пластик',
          dimensions: '30x20x10'
        },
        stock: Math.floor(Math.random() * 80),
        rating: 3.5 + Math.random() * 1.5,
        reviews: Math.floor(Math.random() * 800)
      });
    }

    return mockProducts;
  }

  // Имитация получения товаров с AliExpress
  private async fetchAliexpressProducts(rule: ImportRule): Promise<any[]> {
    // В реальном приложении здесь будет API вызов к AliExpress
    const mockProducts = [];
    const categories = Object.keys(rule.categoryMapping);

    for (let i = 0; i < 200; i++) {
      const category = categories[Math.floor(Math.random() * categories.length)];
      const basePrice = 500 + Math.random() * 20000;

      mockProducts.push({
        id: `ae_${i}`,
        name: `Product ${i} from AliExpress`,
        description: `Description of product ${i} in category ${category}`,
        price: basePrice,
        category,
        images: [`https://example.com/ae_image${i}.jpg`],
        specifications: {
          brand: 'Ali Brand',
          model: `Model AE ${i}`,
          origin: 'China',
          shipping: 'Free shipping'
        },
        stock: Math.floor(Math.random() * 200),
        rating: 4 + Math.random() * 1,
        reviews: Math.floor(Math.random() * 2000)
      });
    }

    return mockProducts;
  }

  // Имитация получения товаров с Яндекс.Маркет
  private async fetchYandexMarketProducts(rule: ImportRule): Promise<any[]> {
    // В реальном приложении здесь будет API вызов к Яндекс.Маркет
    const mockProducts = [];
    const categories = Object.keys(rule.categoryMapping);

    for (let i = 0; i < 60; i++) {
      const category = categories[Math.floor(Math.random() * categories.length)];
      const basePrice = 2000 + Math.random() * 60000;

      mockProducts.push({
        id: `ym_${i}`,
        name: `Товар ${i} с Яндекс.Маркет`,
        description: `Описание товара ${i} из категории ${category}`,
        price: basePrice,
        category,
        images: [`https://example.com/ym_image${i}.jpg`],
        specifications: {
          brand: 'Яндекс Бренд',
          model: `Модель YM ${i}`,
          warranty: '1 год',
          country: 'Россия'
        },
        stock: Math.floor(Math.random() * 50),
        rating: 4 + Math.random() * 1,
        reviews: Math.floor(Math.random() * 500)
      });
    }

    return mockProducts;
  }

  // Имитация получения товаров с Avito
  private async fetchAvitoProducts(rule: ImportRule): Promise<any[]> {
    // В реальном приложении здесь будет API вызов к Avito
    const mockProducts = [];
    const categories = Object.keys(rule.categoryMapping);

    for (let i = 0; i < 40; i++) {
      const category = categories[Math.floor(Math.random() * categories.length)];
      const basePrice = 1500 + Math.random() * 45000;

      mockProducts.push({
        id: `av_${i}`,
        name: `Товар ${i} с Avito`,
        description: `Описание товара ${i} из категории ${category}`,
        price: basePrice,
        category,
        images: [`https://example.com/av_image${i}.jpg`],
        specifications: {
          condition: 'Б/У',
          location: 'Москва',
          delivery: 'Самовывоз'
        },
        stock: 1, // Avito обычно единичные товары
        rating: 3 + Math.random() * 2,
        reviews: Math.floor(Math.random() * 100)
      });
    }

    return mockProducts;
  }

  // Фильтрация и преобразование товаров
  private filterAndTransformProducts(sourceProducts: any[], rule: ImportRule): ImportedProduct[] {
    return sourceProducts
      .filter(product => this.passesFilters(product, rule))
      .map(product => this.transformProduct(product, rule));
  }

  // Проверка фильтров
  private passesFilters(product: any, rule: ImportRule): boolean {
    const { filters } = rule;

    // Фильтр по цене
    if (filters.minPrice && product.price < filters.minPrice) return false;
    if (filters.maxPrice && product.price > filters.maxPrice) return false;

    // Фильтр по категориям
    if (filters.categories && !filters.categories.includes(product.category)) return false;

    // Фильтр по ключевым словам
    if (filters.keywords && !filters.keywords.some(keyword => 
      product.name.toLowerCase().includes(keyword.toLowerCase()) ||
      product.description.toLowerCase().includes(keyword.toLowerCase())
    )) return false;

    // Исключение по ключевым словам
    if (filters.excludeKeywords && filters.excludeKeywords.some(keyword => 
      product.name.toLowerCase().includes(keyword.toLowerCase()) ||
      product.description.toLowerCase().includes(keyword.toLowerCase())
    )) return false;

    return true;
  }

  // Преобразование товара
  private transformProduct(sourceProduct: any, rule: ImportRule): ImportedProduct {
    // Корректировка цены
    let adjustedPrice = sourceProduct.price;
    if (rule.priceAdjustment.type === 'percentage') {
      adjustedPrice = sourceProduct.price * (1 + rule.priceAdjustment.value / 100);
    } else {
      adjustedPrice = sourceProduct.price + rule.priceAdjustment.value;
    }

    // Преобразование категории
    const category = rule.categoryMapping[sourceProduct.category] || sourceProduct.category;

    return {
      id: crypto.randomUUID(),
      name: sourceProduct.name,
      description: sourceProduct.description,
      price: Math.round(adjustedPrice),
      category,
      images: sourceProduct.images || [],
      specifications: sourceProduct.specifications || {},
      stock: sourceProduct.stock || 0,
      source: rule.source,
      sourceId: sourceProduct.id,
      sourceUrl: this.generateSourceUrl(sourceProduct, rule.source),
      importedAt: new Date().toISOString(),
      status: 'pending'
    };
  }

  // Генерация URL источника
  private generateSourceUrl(product: any, source: string): string {
    switch (source) {
      case 'ozon':
        return `https://www.ozon.ru/product/${product.id}`;
      case 'wildberries':
        return `https://www.wildberries.ru/catalog/${product.id}/detail.aspx`;
      case 'aliexpress':
        return `https://www.aliexpress.com/item/${product.id}.html`;
      case 'yandex_market':
        return `https://market.yandex.ru/product/${product.id}`;
      case 'avito':
        return `https://www.avito.ru/${product.id}`;
      default:
        return '#';
    }
  }

  // Проверка существования товара
  private async checkProductExists(sourceId: string, source: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('imported_products')
        .select('id')
        .eq('sourceId', sourceId)
        .eq('source', source)
        .single();

      return !error && !!data;
    } catch (error) {
      return false;
    }
  }

  // Импорт товара
  private async importProduct(product: ImportedProduct, sellerId: string): Promise<void> {
    try {
      // Создаем товар в основной таблице
      const { error: productError } = await supabase
        .from('product_market')
        .insert({
          name: product.name,
          description: product.description,
          price: product.price,
          category: product.category,
          image_url: product.images[0] || '',
          stock_quantity: product.stock,
          seller_id: sellerId,
          created_at: new Date().toISOString()
        });

      if (productError) throw productError;

      // Сохраняем информацию об импорте
      const { error: importError } = await supabase
        .from('imported_products')
        .insert({
          productId: product.id,
          sourceId: product.sourceId,
          source: product.source,
          sourceUrl: product.sourceUrl,
          importedAt: product.importedAt,
          sellerId
        });

      if (importError) throw importError;

      logger.log(`Product imported: ${product.name}`);
    } catch (error) {
      logger.error('Error importing product:', error);
      throw error;
    }
  }

  // Получение правила импорта
  private async getImportRule(ruleId: string): Promise<ImportRule | null> {
    try {
      const { data, error } = await supabase
        .from('import_rules')
        .select('*')
        .eq('id', ruleId)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      logger.error('Error getting import rule:', error);
      return null;
    }
  }

  // Обновление правила импорта
  private async updateImportRule(ruleId: string, updates: Partial<ImportRule>): Promise<void> {
    try {
      const { error } = await supabase
        .from('import_rules')
        .update(updates)
        .eq('id', ruleId);

      if (error) throw error;
    } catch (error) {
      logger.error('Error updating import rule:', error);
      throw error;
    }
  }

  // Планирование импорта
  private scheduleImport(ruleId: string, intervalHours: number): void {
    // Останавливаем предыдущий интервал если есть
    const existingInterval = this.importIntervals.get(ruleId);
    if (existingInterval) {
      clearInterval(existingInterval);
    }

    // Устанавливаем новый интервал
    const interval = setInterval(async () => {
      try {
        await this.startImport(ruleId);
      } catch (error) {
        logger.error('Error in scheduled import:', error);
      }
    }, intervalHours * 60 * 60 * 1000);

    this.importIntervals.set(ruleId, interval);
  }

  // Запуск планированных импортов
  private startScheduledImports(): void {
    // При старте сервиса запускаем все активные правила
    supabase
      .from('import_rules')
      .select('*')
      .eq('autoImport', true)
      .then(({ data, error }) => {
        if (error) {
          logger.error('Error loading import rules:', error);
          return;
        }

        (data || []).forEach(rule => {
          this.scheduleImport(rule.id, rule.importInterval);
        });

        logger.log(`Started ${data?.length || 0} scheduled imports`);
      });
  }

  // Получение активных сессий
  getActiveSessions(): ImportSession[] {
    return Array.from(this.activeSessions.values());
  }

  // Получение правил импорта
  async getImportRules(sellerId?: string): Promise<ImportRule[]> {
    try {
      let query = supabase
        .from('import_rules')
        .select('*')
        .order('createdAt', { ascending: false });

      if (sellerId) {
        query = query.eq('sellerId', sellerId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data || [];
    } catch (error) {
      logger.error('Error getting import rules:', error);
      return [];
    }
  }

  // Удаление правила импорта
  async deleteImportRule(ruleId: string): Promise<boolean> {
    try {
      // Останавливаем интервал
      const interval = this.importIntervals.get(ruleId);
      if (interval) {
        clearInterval(interval);
        this.importIntervals.delete(ruleId);
      }

      // Удаляем правило
      const { error } = await supabase
        .from('import_rules')
        .delete()
        .eq('id', ruleId);

      if (error) throw error;

      logger.log('Import rule deleted:', ruleId);
      return true;
    } catch (error) {
      logger.error('Error deleting import rule:', error);
      return false;
    }
  }

  // Получение статистики импорта
  async getImportStats(sellerId?: string): Promise<{
    totalRules: number;
    activeRules: number;
    totalImports: number;
    successfulImports: number;
    averageProductsPerImport: number;
    topSources: { [key: string]: number };
  }> {
    try {
      const rules = await this.getImportRules(sellerId);
      const sessions = this.getActiveSessions();

      const totalRules = rules.length;
      const activeRules = rules.filter(r => r.autoImport).length;
      const totalImports = sessions.length;
      const successfulImports = sessions.filter(s => s.status === 'completed').length;
      
      const averageProductsPerImport = successfulImports > 0
        ? sessions
            .filter(s => s.status === 'completed')
            .reduce((sum, s) => sum + s.productsImported, 0) / successfulImports
        : 0;

      const topSources: { [key: string]: number } = {};
      rules.forEach(rule => {
        topSources[rule.source] = (topSources[rule.source] || 0) + 1;
      });

      return {
        totalRules,
        activeRules,
        totalImports,
        successfulImports,
        averageProductsPerImport,
        topSources
      };
    } catch (error) {
      logger.error('Error getting import stats:', error);
      return {
        totalRules: 0,
        activeRules: 0,
        totalImports: 0,
        successfulImports: 0,
        averageProductsPerImport: 0,
        topSources: {}
      };
    }
  }
}

export default AutoImportService.getInstance();
