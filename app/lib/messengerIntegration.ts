// Интеграция с мессенджерами
import { logger } from './logger';

interface MessageTemplate {
  id: string;
  name: string;
  platform: 'telegram' | 'whatsapp' | 'viber' | 'instagram';
  template: string;
  variables: string[];
}

interface MessagePayload {
  platform: 'telegram' | 'whatsapp' | 'viber' | 'instagram';
  recipient: string;
  message: string;
  template?: string;
  variables?: { [key: string]: any };
  media?: {
    type: 'image' | 'video' | 'document';
    url: string;
    caption?: string;
  };
  buttons?: Array<{
    text: string;
    url?: string;
    action?: string;
  }>;
}

interface WebhookPayload {
  platform: string;
  event: 'message' | 'callback' | 'delivery';
  data: any;
  timestamp: number;
}

class MessengerIntegration {
  private static instance: MessengerIntegration;
  private webhooks: Map<string, string> = new Map();
  private templates: Map<string, MessageTemplate> = new Map();
  private botTokens: Map<string, string> = new Map();

  private constructor() {
    this.initializeTemplates();
    this.setupWebhooks();
  }

  static getInstance(): MessengerIntegration {
    if (!MessengerIntegration.instance) {
      MessengerIntegration.instance = new MessengerIntegration();
    }
    return MessengerIntegration.instance;
  }

  // Инициализация шаблонов сообщений
  private initializeTemplates() {
    const templates: MessageTemplate[] = [
      {
        id: 'new_product',
        name: 'Новый товар',
        platform: 'telegram',
        template: '🆕 Новый товар в маркетплейсе!\n\n📦 {productName}\n💰 {price}₽\n📝 {description}\n\n🔗 [Посмотреть]({productUrl})',
        variables: ['productName', 'price', 'description', 'productUrl']
      },
      {
        id: 'order_confirmation',
        name: 'Подтверждение заказа',
        platform: 'telegram',
        template: '✅ Заказ подтвержден!\n\n📦 Товар: {productName}\n💰 Сумма: {price}₽n📍 Адрес: {address}\n\n📋 Отслеживать заказ: {trackingUrl}',
        variables: ['productName', 'price', 'address', 'trackingUrl']
      },
      {
        id: 'price_drop',
        name: 'Снижение цены',
        platform: 'telegram',
        template: '🔥 СКИДКА!\n\n{productName}\n\nСтарая цена: {oldPrice}₽\nНовая цена: {newPrice}₽\nЭкономия: {savings}₽\n\n🛒 [Купить]({productUrl})',
        variables: ['productName', 'oldPrice', 'newPrice', 'savings', 'productUrl']
      },
      {
        id: 'stock_alert',
        name: 'Остаток товара',
        platform: 'telegram',
        template: '⚠️ Осталось мало товара!\n\n{productName}\nОстаток: {stock} шт.\n\n🛒 [Заказать]({productUrl})',
        variables: ['productName', 'stock', 'productUrl']
      },
      {
        id: 'welcome',
        name: 'Приветствие',
        platform: 'telegram',
        template: '👋 Добро пожаловать в RA DELL Marketplace!\n\n🛍️ Что вас интересует?\n\n📦 [Каталог товаров]({catalogUrl})\n🔍 [Поиск]({searchUrl})\n❓ [Помощь]({helpUrl})',
        variables: ['catalogUrl', 'searchUrl', 'helpUrl']
      }
    ];

    templates.forEach(template => {
      this.templates.set(template.id, template);
    });
  }

  // Настройка вебхуков
  private setupWebhooks() {
    // В реальном приложении здесь будут реальные URL вебхуков
    this.webhooks.set('telegram', 'https://api.telegram.org/bot{token}/setWebhook');
    this.webhooks.set('whatsapp', 'https://graph.facebook.com/v15.0/{phone-number-id}/webhooks');
    
    // Токены для ботов (в реальном приложении будут в переменных окружения)
    this.botTokens.set('telegram', process.env.TELEGRAM_BOT_TOKEN || '');
    this.botTokens.set('whatsapp', process.env.WHATSAPP_TOKEN || '');
  }

  // Отправить сообщение
  async sendMessage(payload: MessagePayload): Promise<boolean> {
    try {
      switch (payload.platform) {
        case 'telegram':
          return await this.sendTelegramMessage(payload);
        case 'whatsapp':
          return await this.sendWhatsAppMessage(payload);
        case 'viber':
          return await this.sendViberMessage(payload);
        case 'instagram':
          return await this.sendInstagramMessage(payload);
        default:
          logger.error('Unsupported platform:', payload.platform);
          return false;
      }
    } catch (error) {
      logger.error('Error sending message:', error);
      return false;
    }
  }

  // Отправить сообщение в Telegram
  private async sendTelegramMessage(payload: MessagePayload): Promise<boolean> {
    try {
      const token = this.botTokens.get('telegram');
      if (!token) {
        logger.error('Telegram bot token not configured');
        return false;
      }

      const url = `https://api.telegram.org/bot${token}/sendMessage`;
      
      const body = {
        chat_id: payload.recipient,
        text: payload.message,
        parse_mode: 'HTML',
        disable_web_page_preview: false
      };

      // Добавляем кнопки если есть
      if (payload.buttons && payload.buttons.length > 0) {
        body['reply_markup'] = {
          inline_keyboard: payload.buttons.map(button => [
            {
              text: button.text,
              url: button.url,
              callback_data: button.action
            }
          ])
        };
      }

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body)
      });

      const result = await response.json();
      
      if (result.ok) {
        logger.log('Telegram message sent successfully');
        return true;
      } else {
        logger.error('Telegram API error:', result);
        return false;
      }
    } catch (error) {
      logger.error('Error sending Telegram message:', error);
      return false;
    }
  }

  // Отправить сообщение в WhatsApp
  private async sendWhatsAppMessage(payload: MessagePayload): Promise<boolean> {
    try {
      const token = this.botTokens.get('whatsapp');
      if (!token) {
        logger.error('WhatsApp token not configured');
        return false;
      }

      const url = `https://graph.facebook.com/v15.0/${token}/messages`;
      
      const body = {
        messaging_product: 'whatsapp',
        to: payload.recipient,
        type: 'text',
        text: {
          body: payload.message
        }
      };

      // Добавляем медиа если есть
      if (payload.media) {
        body.type = payload.media.type;
        body[payload.media.type] = {
          link: payload.media.url,
          caption: payload.media.caption
        };
      }

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body)
      });

      const result = await response.json();
      
      if (result.error) {
        logger.error('WhatsApp API error:', result.error);
        return false;
      }

      logger.log('WhatsApp message sent successfully');
      return true;
    } catch (error) {
      logger.error('Error sending WhatsApp message:', error);
      return false;
    }
  }

  // Отправить сообщение в Viber
  private async sendViberMessage(payload: MessagePayload): Promise<boolean> {
    try {
      const token = this.botTokens.get('viber');
      if (!token) {
        logger.error('Viber token not configured');
        return false;
      }

      const url = `https://chatapi.viber.com/pa/send-message`;
      
      const body = {
        receiver: payload.recipient,
        min_api_version: 1,
        sender: {
          name: 'RA DELL Marketplace',
          avatar: 'https://example.com/avatar.png'
        },
        tracking_data: 'tracking_id',
        type: 'text',
        text: payload.message
      };

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'X-Viber-Auth-Token': token,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body)
      });

      const result = await response.json();
      
      if (result.status === 0) {
        logger.error('Viber API error:', result.status_message);
        return false;
      }

      logger.log('Viber message sent successfully');
      return true;
    } catch (error) {
      logger.error('Error sending Viber message:', error);
      return false;
    }
  }

  // Отправить сообщение в Instagram (через Direct API)
  private async sendInstagramMessage(payload: MessagePayload): Promise<boolean> {
    try {
      // Instagram Direct API требует бизнес-аккаунт
      logger.warn('Instagram integration requires business account');
      return false;
    } catch (error) {
      logger.error('Error sending Instagram message:', error);
      return false;
    }
  }

  // Отправить шаблонное сообщение
  async sendTemplate(templateId: string, platform: 'telegram' | 'whatsapp' | 'viber', recipient: string, variables: { [key: string]: any }): Promise<boolean> {
    try {
      const template = this.templates.get(templateId);
      if (!template) {
        logger.error('Template not found:', templateId);
        return false;
      }

      // Заменяем переменные в шаблоне
      let message = template.template;
      for (const [key, value] of Object.entries(variables)) {
        message = message.replace(new RegExp(`{${key}}`, 'g'), String(value));
      }

      return await this.sendMessage({
        platform,
        recipient,
        message
      });
    } catch (error) {
      logger.error('Error sending template message:', error);
      return false;
    }
  }

  // Массовая рассылка
  async broadcast(templateId: string, platform: 'telegram' | 'whatsapp' | 'viber', recipients: string[], variables?: { [key: string]: any }): Promise<{ success: number; failed: number }> {
    let success = 0;
    let failed = 0;

    for (const recipient of recipients) {
      const result = await this.sendTemplate(templateId, platform, recipient, variables || {});
      if (result) {
        success++;
      } else {
        failed++;
      }

      // Небольшая задержка между сообщениями
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    logger.log(`Broadcast completed: ${success} success, ${failed} failed`);
    return { success, failed };
  }

  // Обработка вебхуков
  async handleWebhook(platform: string, payload: WebhookPayload): Promise<void> {
    try {
      logger.log(`Webhook received from ${platform}:`, payload.event);

      switch (payload.event) {
        case 'message':
          await this.handleMessage(platform, payload.data);
          break;
        case 'callback':
          await this.handleCallback(platform, payload.data);
          break;
        case 'delivery':
          await this.handleDelivery(platform, payload.data);
          break;
        default:
          logger.warn('Unknown webhook event:', payload.event);
      }
    } catch (error) {
      logger.error('Error handling webhook:', error);
    }
  }

  // Обработка входящего сообщения
  private async handleMessage(platform: string, data: any): Promise<void> {
    const message = data.message || data.text || '';
    const userId = data.from?.id || data.chat?.id;

    logger.log(`Message received from ${userId}:`, message);

    // Простая логика автоответа
    if (message.toLowerCase().includes('привет')) {
      await this.sendTemplate('welcome', platform as any, userId, {
        catalogUrl: 'https://my-shop-lemon-nine.vercel.app',
        searchUrl: 'https://my-shop-lemon-nine.vercel.app/search',
        helpUrl: 'https://my-shop-lemon-nine.vercel.app/help'
      });
    }
  }

  // Обработка callback'а
  private async handleCallback(platform: string, data: any): Promise<void> {
    const callbackData = data.data;
    logger.log('Callback received:', callbackData);
  }

  // Обработка подтверждения доставки
  private async handleDelivery(platform: string, data: any): Promise<void> {
    logger.log('Delivery confirmation received:', data);
  }

  // Получить информацию о боте
  async getBotInfo(platform: 'telegram' | 'whatsapp' | 'viber'): Promise<any> {
    try {
      switch (platform) {
        case 'telegram':
          return await this.getTelegramBotInfo();
        case 'whatsapp':
          return await this.getWhatsAppInfo();
        case 'viber':
          return await this.getViberInfo();
        default:
          return null;
      }
    } catch (error) {
      logger.error('Error getting bot info:', error);
      return null;
    }
  }

  // Получить информацию о Telegram боте
  private async getTelegramBotInfo(): Promise<any> {
    const token = this.botTokens.get('telegram');
    if (!token) return null;

    const response = await fetch(`https://api.telegram.org/bot${token}/getMe`);
    return await response.json();
  }

  // Получить информацию о WhatsApp боте
  private async getWhatsAppInfo(): Promise<any> {
    const token = this.botTokens.get('whatsapp');
    if (!token) return null;

    const response = await fetch(`https://graph.facebook.com/v15.0/${token}`);
    return await response.json();
  }

  // Получить информацию о Viber боте
  private async getViberInfo(): Promise<any> {
    const token = this.botTokens.get('viber');
    if (!token) return null;

    const response = await fetch('https://chatapi.viber.com/pa/get_account_info', {
      headers: {
        'X-Viber-Auth-Token': token,
      }
    });
    return await response.json();
  }

  // Настроить вебхук
  async setupWebhook(platform: string, webhookUrl: string): Promise<boolean> {
    try {
      const token = this.botTokens.get(platform);
      if (!token) {
        logger.error(`${platform} token not configured`);
        return false;
      }

      let url = '';
      let body = {};

      switch (platform) {
        case 'telegram':
          url = `https://api.telegram.org/bot${token}/setWebhook`;
          body = { url: webhookUrl };
          break;
        case 'whatsapp':
          url = `https://graph.facebook.com/v15.0/${token}/webhooks`;
          body = {
            webhook_url: webhookUrl,
            fields: ['messages', 'message_reads', 'message_deliveries']
          };
          break;
        case 'viber':
          url = 'https://chatapi.viber.com/pa/set_webhook';
          body = {
            url: webhookUrl,
            event_types: ['message_seen', 'message_delivered', 'subscribed', 'unsubscribed', 'conversation_started']
          };
          break;
        default:
          logger.error('Unsupported platform for webhook setup:', platform);
          return false;
      }

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(platform === 'viber' && { 'X-Viber-Auth-Token': token }),
        },
        body: JSON.stringify(body)
      });

      const result = await response.json();
      
      if (platform === 'telegram' && result.ok) {
        logger.log('Telegram webhook setup successful');
        return true;
      } else if (platform === 'viber' && result.status === 0) {
        logger.log('Viber webhook setup successful');
        return true;
      } else if (platform === 'whatsapp' && !result.error) {
        logger.log('WhatsApp webhook setup successful');
        return true;
      } else {
        logger.error(`${platform} webhook setup failed:`, result);
        return false;
      }
    } catch (error) {
      logger.error('Error setting up webhook:', error);
      return false;
    }
  }
}

export default MessengerIntegration.getInstance();
