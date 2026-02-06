// Система уведомлений
import { logger } from './logger';

export interface NotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: any;
  requireInteraction?: boolean;
  actions?: NotificationAction[];
}

export interface NotificationAction {
  action: string;
  title: string;
  icon?: string;
}

class NotificationManager {
  private static instance: NotificationManager;
  private swRegistration: ServiceWorkerRegistration | null = null;

  private constructor() {
    this.initServiceWorker();
  }

  static getInstance(): NotificationManager {
    if (!NotificationManager.instance) {
      NotificationManager.instance = new NotificationManager();
    }
    return NotificationManager.instance;
  }

  private async initServiceWorker() {
    if ('serviceWorker' in navigator) {
      try {
        this.swRegistration = await navigator.serviceWorker.ready;
        logger.log('Service Worker initialized for notifications');
      } catch (error) {
        logger.error('Service Worker initialization failed:', error);
      }
    }
  }

  // Запрос разрешения на уведомления
  async requestPermission(): Promise<boolean> {
    if (!('Notification' in navigator)) {
      logger.warn('Notifications not supported');
      return false;
    }

    if (Notification.permission === 'granted') {
      return true;
    }

    if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      logger.log('Notification permission:', permission);
      return permission === 'granted';
    }

    return false;
  }

  // Показать браузерное уведомление
  async showNotification(payload: NotificationPayload): Promise<void> {
    const hasPermission = await this.requestPermission();
    
    if (!hasPermission) {
      logger.warn('No notification permission');
      return;
    }

    try {
      const notification = new Notification(payload.title, {
        body: payload.body,
        icon: payload.icon || '/icon.png',
        badge: payload.badge || '/favicon.ico',
        tag: payload.tag,
        data: payload.data,
        requireInteraction: payload.requireInteraction,
        actions: payload.actions
      });

      // Автоматически закрываем через 5 секунд
      setTimeout(() => {
        notification.close();
      }, 5000);

      logger.log('Notification shown:', payload.title);
    } catch (error) {
      logger.error('Error showing notification:', error);
    }
  }

  // Push-уведомление через Service Worker
  async pushNotification(payload: NotificationPayload): Promise<void> {
    if (!this.swRegistration) {
      logger.warn('Service Worker not available for push notifications');
      return;
    }

    try {
      await this.swRegistration.showNotification(payload.title, {
        body: payload.body,
        icon: payload.icon || '/icon.png',
        badge: payload.badge || '/favicon.ico',
        tag: payload.tag,
        data: payload.data,
        requireInteraction: payload.requireInteraction,
        actions: payload.actions
      });

      logger.log('Push notification sent:', payload.title);
    } catch (error) {
      logger.error('Error sending push notification:', error);
    }
  }

  // Уведомление о новой скидке
  async notifyDiscount(productName: string, discount: number, oldPrice: number): Promise<void> {
    const newPrice = oldPrice * (1 - discount / 100);
    
    await this.showNotification({
      title: '🔥 Скидка!',
      body: `${productName} со скидкой ${discount}% - всего ${newPrice}₽ вместо ${oldPrice}₽`,
      icon: '/icon.png',
      tag: 'discount',
      data: {
        type: 'discount',
        productName,
        discount,
        oldPrice,
        newPrice
      },
      actions: [
        {
          action: 'view',
          title: 'Посмотреть',
          icon: '👁️'
        }
      ]
    });
  }

  // Уведомление о новом товаре
  async notifyNewProduct(productName: string, category: string): Promise<void> {
    await this.showNotification({
      title: '🆕 Новый товар!',
      body: `${productName} в категории ${category}`,
      icon: '/icon.png',
      tag: 'new-product',
      data: {
        type: 'new-product',
        productName,
        category
      }
    });
  }

  // Уведомление о низком остатке
  async notifyLowStock(productName: string, stock: number): Promise<void> {
    await this.showNotification({
      title: '⚠️ Мало товара!',
      body: `${productName} осталось всего ${stock} шт.`,
      icon: '/icon.png',
      tag: 'low-stock',
      data: {
        type: 'low-stock',
        productName,
        stock
      },
      requireInteraction: true
    });
  }
}

export default NotificationManager.getInstance();
