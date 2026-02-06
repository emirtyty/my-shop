// Система отслеживания покупок через мессенджеры
import { logger } from './logger';
import { supabase } from './supabase';

interface PurchaseIntent {
  id: string;
  buyerId: string;
  sellerId: string;
  productId: string;
  productPrice: number;
  status: 'initiated' | 'confirmed' | 'disputed' | 'completed' | 'cancelled';
  initiatedAt: string;
  confirmedAt?: string;
  completedAt?: string;
  cancelledAt?: string;
  disputeReason?: string;
  evidence: {
    screenshots: string[];
    chatHistory: string[];
    paymentConfirmation?: string;
    deliveryConfirmation?: string;
  };
  verificationCode: string;
  expiresAt: string;
}

interface MessengerWebhook {
  platform: 'telegram' | 'whatsapp' | 'viber' | 'instagram';
  event: 'message' | 'payment_confirmation' | 'delivery_confirmation' | 'dispute';
  data: {
    messageId: string;
    senderId: string;
    recipientId: string;
    content: string;
    timestamp: string;
    attachments?: Array<{
      type: 'image' | 'document' | 'payment_proof';
      url: string;
      filename: string;
    }>;
    metadata?: {
      productId?: string;
      purchaseId?: string;
      eventType?: string;
    };
  };
}

class PurchaseTrackingService {
  private static instance: PurchaseTrackingService;
  private activeIntents: Map<string, PurchaseIntent> = new Map();
  private verificationCodes: Map<string, string> = new Map();

  private constructor() {
    this.initializeWebhooks();
    this.startExpirationChecker();
  }

  static getInstance(): PurchaseTrackingService {
    if (!PurchaseTrackingService.instance) {
      PurchaseTrackingService.instance = new PurchaseTrackingService();
    }
    return PurchaseTrackingService.instance;
  }

  // Инициализация намерения покупки
  async initiatePurchase(
    buyerId: string,
    sellerId: string,
    productId: string,
    productPrice: number
  ): Promise<PurchaseIntent> {
    try {
      // Проверяем, нет ли активной покупки этого товара
      const existingIntent = await this.getActivePurchaseIntent(buyerId, productId);
      if (existingIntent) {
        throw new Error('У вас уже есть активная покупка этого товара');
      }

      // Генерируем код верификации
      const verificationCode = this.generateVerificationCode();
      
      // Создаем намерение покупки
      const intent: PurchaseIntent = {
        id: crypto.randomUUID(),
        buyerId,
        sellerId,
        productId,
        productPrice,
        status: 'initiated',
        initiatedAt: new Date().toISOString(),
        verificationCode,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 часа
        evidence: {
          screenshots: [],
          chatHistory: []
        }
      };

      // Сохраняем в базу
      const { data, error } = await supabase
        .from('purchase_intents')
        .insert(intent)
        .select()
        .single();

      if (error) throw error;

      // Сохраняем в кэш
      this.activeIntents.set(intent.id, intent);
      this.verificationCodes.set(verificationCode, intent.id);

      // Отправляем код верификации покупателю
      await this.sendVerificationCode(buyerId, verificationCode, productId);

      logger.log('Purchase intent initiated:', intent.id);
      return intent;
    } catch (error) {
      logger.error('Error initiating purchase:', error);
      throw error;
    }
  }

  // Генерация кода верификации
  private generateVerificationCode(): string {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  }

  // Отправка кода верификации
  private async sendVerificationCode(buyerId: string, code: string, productId: string): Promise<void> {
    try {
      // Получаем информацию о покупателе
      const { data: buyer, error } = await supabase
        .from('users')
        .select('telegram_id, whatsapp_id, email')
        .eq('id', buyerId)
        .single();

      if (error) throw error;

      // Получаем информацию о товаре
      const { data: product, error: productError } = await supabase
        .from('product_market')
        .select('name, price')
        .eq('id', productId)
        .single();

      if (productError) throw productError;

      // Формируем сообщение
      const message = `🔐 Код верификации покупки\n\n` +
        `Товар: ${product.name}\n` +
        `Цена: ${product.price}₽\n` +
        `Код: ${code}\n\n` +
        `Покажите этот код продавцу для подтверждения покупки.\n` +
        `Код действителен 24 часа.`;

      // Отправляем в Telegram если есть
      if (buyer.telegram_id) {
        await this.sendTelegramMessage(buyer.telegram_id, message);
      }

      // Отправляем email если есть
      if (buyer.email) {
        await this.sendEmail(buyer.email, 'Код верификации покупки', message);
      }

      logger.log('Verification code sent to buyer:', buyerId);
    } catch (error) {
      logger.error('Error sending verification code:', error);
      throw error;
    }
  }

  // Подтверждение покупки продавцом
  async confirmPurchase(purchaseId: string, verificationCode: string, sellerId: string): Promise<boolean> {
    try {
      // Проверяем код верификации
      const intentId = this.verificationCodes.get(verificationCode);
      if (!intentId || intentId !== purchaseId) {
        throw new Error('Неверный код верификации');
      }

      const intent = this.activeIntents.get(purchaseId);
      if (!intent) {
        throw new Error('Покупка не найдена');
      }

      if (intent.sellerId !== sellerId) {
        throw new Error('Вы не можете подтвердить эту покупку');
      }

      if (intent.status !== 'initiated') {
        throw new Error('Покупка уже обработана');
      }

      // Обновляем статус
      const { error } = await supabase
        .from('purchase_intents')
        .update({
          status: 'confirmed',
          confirmedAt: new Date().toISOString()
        })
        .eq('id', purchaseId);

      if (error) throw error;

      intent.status = 'confirmed';
      intent.confirmedAt = new Date().toISOString();

      // Обновляем статистику продаж
      await this.updateSalesStats(intent);

      // Создаем возможность оставить отзыв
      await this.createReviewOpportunity(intent);

      // Отправляем уведомления
      await this.notifyPurchaseConfirmed(intent);

      logger.log('Purchase confirmed:', purchaseId);
      return true;
    } catch (error) {
      logger.error('Error confirming purchase:', error);
      throw error;
    }
  }

  // Обработка вебхуков из мессенджеров
  async handleMessengerWebhook(webhook: MessengerWebhook): Promise<void> {
    try {
      switch (webhook.event) {
        case 'message':
          await this.handleMessage(webhook);
          break;
        case 'payment_confirmation':
          await this.handlePaymentConfirmation(webhook);
          break;
        case 'delivery_confirmation':
          await this.handleDeliveryConfirmation(webhook);
          break;
        case 'dispute':
          await this.handleDispute(webhook);
          break;
      }
    } catch (error) {
      logger.error('Error handling messenger webhook:', error);
    }
  }

  // Обработка сообщения
  private async handleMessage(webhook: MessengerWebhook): Promise<void> {
    const { data } = webhook;
    
    // Ищем упоминания кода верификации
    const codeMatch = data.content.match(/\b([A-Z0-9]{6})\b/);
    if (codeMatch) {
      const code = codeMatch[1];
      await this.handleVerificationCode(data.senderId, code, data.messageId);
    }

    // Сохраняем историю чата
    await this.saveChatHistory(data.senderId, data.recipientId, data.content, data.timestamp);
  }

  // Обработка кода верификации
  private async handleVerificationCode(senderId: string, code: string, messageId: string): Promise<void> {
    try {
      const intentId = this.verificationCodes.get(code);
      if (!intentId) return;

      const intent = this.activeIntents.get(intentId);
      if (!intent) return;

      // Проверяем, что отправитель - покупатель
      if (intent.buyerId !== senderId) return;

      // Добавляем скриншот/доказательство
      await this.addEvidence(intentId, 'chat_message', {
        messageId,
        content: `Код верификации: ${code}`,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Error handling verification code:', error);
    }
  }

  // Обработка подтверждения оплаты
  private async handlePaymentConfirmation(webhook: MessengerWebhook): Promise<void> {
    const { data } = webhook;
    
    if (!data.metadata?.purchaseId) return;

    const intent = this.activeIntents.get(data.metadata.purchaseId);
    if (!intent) return;

    // Добавляем доказательство оплаты
    if (data.attachments) {
      for (const attachment of data.attachments) {
        if (attachment.type === 'payment_proof') {
          await this.addEvidence(intent.id, 'payment_confirmation', {
            url: attachment.url,
            filename: attachment.filename,
            timestamp: data.timestamp
          });
        }
      }
    }
  }

  // Обработка подтверждения доставки
  private async handleDeliveryConfirmation(webhook: MessengerWebhook): Promise<void> {
    const { data } = webhook;
    
    if (!data.metadata?.purchaseId) return;

    const intent = this.activeIntents.get(data.metadata.purchaseId);
    if (!intent) return;

    // Добавляем доказательство доставки
    if (data.attachments) {
      for (const attachment of data.attachments) {
        if (attachment.type === 'image') {
          await this.addEvidence(intent.id, 'delivery_confirmation', {
            url: attachment.url,
            filename: attachment.filename,
            timestamp: data.timestamp
          });
        }
      }
    }

    // Завершаем покупку
    await this.completePurchase(intent.id);
  }

  // Обработка спора
  private async handleDispute(webhook: MessengerWebhook): Promise<void> {
    const { data } = webhook;
    
    if (!data.metadata?.purchaseId) return;

    const intent = this.activeIntents.get(data.metadata.purchaseId);
    if (!intent) return;

    // Создаем спор
    await this.createDispute(intent.id, data.senderId, data.content, data.attachments);
  }

  // Добавление доказательства
  private async addEvidence(purchaseId: string, type: string, evidence: any): Promise<void> {
    try {
      const { error } = await supabase
        .from('purchase_evidence')
        .insert({
          purchaseId,
          type,
          evidence,
          createdAt: new Date().toISOString()
        });

      if (error) throw error;
    } catch (error) {
      logger.error('Error adding evidence:', error);
    }
  }

  // Сохранение истории чата
  private async saveChatHistory(senderId: string, recipientId: string, content: string, timestamp: string): Promise<void> {
    try {
      // Ищем активную покупку между этими пользователями
      const intents = Array.from(this.activeIntents.values())
        .filter(intent => 
          (intent.buyerId === senderId && intent.sellerId === recipientId) ||
          (intent.buyerId === recipientId && intent.sellerId === senderId)
        );

      if (intents.length === 0) return;

      const intent = intents[0];
      
      const { error } = await supabase
        .from('chat_history')
        .insert({
          purchaseId: intent.id,
          senderId,
          recipientId,
          content,
          timestamp
        });

      if (error) throw error;
    } catch (error) {
      logger.error('Error saving chat history:', error);
    }
  }

  // Завершение покупки
  private async completePurchase(purchaseId: string): Promise<void> {
    try {
      const intent = this.activeIntents.get(purchaseId);
      if (!intent) return;

      const { error } = await supabase
        .from('purchase_intents')
        .update({
          status: 'completed',
          completedAt: new Date().toISOString()
        })
        .eq('id', purchaseId);

      if (error) throw error;

      intent.status = 'completed';
      intent.completedAt = new Date().toISOString();

      // Обновляем статистику
      await this.updateSalesStats(intent);

      // Отправляем уведомления
      await this.notifyPurchaseCompleted(intent);

      logger.log('Purchase completed:', purchaseId);
    } catch (error) {
      logger.error('Error completing purchase:', error);
    }
  }

  // Создание спора
  private async createDispute(purchaseId: string, initiatorId: string, reason: string, attachments?: any[]): Promise<void> {
    try {
      const { error } = await supabase
        .from('purchase_disputes')
        .insert({
          purchaseId,
          initiatorId,
          reason,
          attachments: attachments || [],
          status: 'open',
          createdAt: new Date().toISOString()
        });

      if (error) throw error;

      // Обновляем статус покупки
      await supabase
        .from('purchase_intents')
        .update({ status: 'disputed' })
        .eq('id', purchaseId);

      const intent = this.activeIntents.get(purchaseId);
      if (intent) {
        intent.status = 'disputed';
      }

      logger.log('Dispute created:', purchaseId);
    } catch (error) {
      logger.error('Error creating dispute:', error);
    }
  }

  // Обновление статистики продаж
  private async updateSalesStats(intent: PurchaseIntent): Promise<void> {
    try {
      // Обновляем статистику товара
      await supabase.rpc('increment_product_sales', {
        p_product_id: intent.productId,
        p_amount: intent.productPrice
      });

      // Обновляем статистику продавца
      await supabase.rpc('increment_seller_sales', {
        p_seller_id: intent.sellerId,
        p_amount: intent.productPrice
      });

      // Обновляем статистику категории
      const { data: product } = await supabase
        .from('product_market')
        .select('category')
        .eq('id', intent.productId)
        .single();

      if (product) {
        await supabase.rpc('increment_category_sales', {
          p_category: product.category,
          p_amount: intent.productPrice
        });
      }
    } catch (error) {
      logger.error('Error updating sales stats:', error);
    }
  }

  // Создание возможности оставить отзыв
  private async createReviewOpportunity(intent: PurchaseIntent): Promise<void> {
    try {
      const { error } = await supabase
        .from('review_opportunities')
        .insert({
          purchaseId: intent.id,
          buyerId: intent.buyerId,
          sellerId: intent.sellerId,
          productId: intent.productId,
          status: 'available',
          createdAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString() // 14 дней
        });

      if (error) throw error;
    } catch (error) {
      logger.error('Error creating review opportunity:', error);
    }
  }

  // Получение активных намерений покупки
  async getActivePurchaseIntents(buyerId?: string, sellerId?: string): Promise<PurchaseIntent[]> {
    try {
      let query = supabase
        .from('purchase_intents')
        .select('*')
        .in('status', ['initiated', 'confirmed']);

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
      logger.error('Error getting active purchase intents:', error);
      return [];
    }
  }

  // Получение конкретного намерения покупки
  async getActivePurchaseIntent(buyerId: string, productId: string): Promise<PurchaseIntent | null> {
    try {
      const { data, error } = await supabase
        .from('purchase_intents')
        .select('*')
        .eq('buyerId', buyerId)
        .eq('productId', productId)
        .in('status', ['initiated', 'confirmed'])
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data;
    } catch (error) {
      logger.error('Error getting active purchase intent:', error);
      return null;
    }
  }

  // Проверка истечения срока действия
  private startExpirationChecker(): void {
    setInterval(async () => {
      try {
        const now = new Date();
        
        for (const [id, intent] of this.activeIntents) {
          if (new Date(intent.expiresAt) < now && intent.status === 'initiated') {
            // Отменяем просроченную покупку
            await this.cancelPurchase(id, 'Истек срок действия');
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
        .from('purchase_intents')
        .update({
          status: 'cancelled',
          cancelledAt: new Date().toISOString()
        })
        .eq('id', purchaseId);

      if (error) throw error;

      const intent = this.activeIntents.get(purchaseId);
      if (intent) {
        intent.status = 'cancelled';
        intent.cancelledAt = new Date().toISOString();
      }

      logger.log('Purchase cancelled:', purchaseId);
    } catch (error) {
      logger.error('Error cancelling purchase:', error);
    }
  }

  // Отправка Telegram сообщения (имитация)
  private async sendTelegramMessage(telegramId: string, message: string): Promise<void> {
    // В реальном приложении здесь будет API вызов к Telegram Bot API
    logger.log(`Sending Telegram message to ${telegramId}: ${message}`);
  }

  // Отправка email (имитация)
  private async sendEmail(email: string, subject: string, body: string): Promise<void> {
    // В реальном приложении здесь будет отправка email
    logger.log(`Sending email to ${email}: ${subject}`);
  }

  // Уведомление о подтверждении покупки
  private async notifyPurchaseConfirmed(intent: PurchaseIntent): Promise<void> {
    // Уведомляем покупателя
    await this.sendNotification(intent.buyerId, 'purchase_confirmed', {
      productId: intent.productId,
      purchaseId: intent.id
    });

    // Уведомляем продавца
    await this.sendNotification(intent.sellerId, 'sale_confirmed', {
      productId: intent.productId,
      purchaseId: intent.id,
      amount: intent.productPrice
    });
  }

  // Уведомление о завершении покупки
  private async notifyPurchaseCompleted(intent: PurchaseIntent): Promise<void> {
    // Уведомляем покупателя о возможности оставить отзыв
    await this.sendNotification(intent.buyerId, 'purchase_completed_review_available', {
      productId: intent.productId,
      purchaseId: intent.id
    });
  }

  // Отправка уведомления (имитация)
  private async sendNotification(userId: string, type: string, data: any): Promise<void> {
    logger.log(`Sending notification to ${userId}: ${type}`, data);
  }

  // Инициализация вебхуков
  private initializeWebhooks(): void {
    // В реальном приложении здесь будет настройка эндпоинтов для вебхуков
    logger.log('Messenger webhooks initialized');
  }
}

export default PurchaseTrackingService.getInstance();
