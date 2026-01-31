// 🛡️ Утилиты безопасности

// Rate limiting хранилище в памяти
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

export interface RateLimitConfig {
  windowMs: number; // окно времени в миллисекундах
  maxRequests: number; // максимальное количество запросов
  message?: string; // сообщение при превышении лимита
}

// Rate limiting middleware
export const rateLimit = (identifier: string, config: RateLimitConfig) => {
  const now = Date.now();
  const key = `${identifier}:${Math.floor(now / config.windowMs)}`;
  
  const record = rateLimitStore.get(key);
  
  if (!record) {
    // Новое окно времени
    rateLimitStore.set(key, { count: 1, resetTime: now + config.windowMs });
    return { allowed: true, remaining: config.maxRequests - 1 };
  }
  
  if (record.count >= config.maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetTime: record.resetTime,
      message: config.message || `Превышен лимит запросов. Попробуйте через ${Math.ceil((record.resetTime - now) / 1000)}с`
    };
  }
  
  record.count++;
  return {
    allowed: true,
    remaining: config.maxRequests - record.count,
    resetTime: record.resetTime
  };
};

// Очистка старых записей rate limiting
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of rateLimitStore.entries()) {
    if (now > record.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}, 60000); // Очистка каждую минуту

// Валидация данных
export const validators = {
  // Email валидация
  email: (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email) && email.length <= 255;
  },

  // Телефон (российский формат)
  phone: (phone: string): boolean => {
    const phoneRegex = /^(\+7|8)?[\s-]?\(?(\d{3})\)?[\s-]?(\d{3})[\s-]?(\d{2})[\s-]?(\d{2})$/;
    return phoneRegex.test(phone.replace(/\s/g, ''));
  },

  // Имя пользователя
  username: (username: string): boolean => {
    return /^[a-zA-Zа-яА-Я0-9_]{3,20}$/.test(username);
  },

  // Название товара
  productName: (name: string): boolean => {
    return name.trim().length >= 3 && name.trim().length <= 200;
  },

  // Цена
  price: (price: number): boolean => {
    return price >= 0 && price <= 999999999 && Number.isFinite(price);
  },

  // URL
  url: (url: string): boolean => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  },

  // ID (UUID или MongoDB ObjectId)
  id: (id: string): boolean => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    const mongoIdRegex = /^[0-9a-fA-F]{24}$/;
    return uuidRegex.test(id) || mongoIdRegex.test(id);
  },

  // Текст комментария/отзыва
  comment: (text: string): boolean => {
    const trimmed = text.trim();
    return trimmed.length >= 1 && trimmed.length <= 1000;
  },

  // Категория
  category: (category: string): boolean => {
    const validCategories = ['electronics', 'clothing', 'food', 'drinks', 'books', 'sports', 'home', 'beauty', 'toys', 'other'];
    return validCategories.includes(category.toLowerCase());
  }
};

// Санитизация данных
export const sanitize = {
  // Удаление HTML тегов
  stripHtml: (text: string): string => {
    return text.replace(/<[^>]*>/g, '');
  },

  // Экранирование HTML
  escapeHtml: (text: string): string => {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  },

  // Нормализация текста
  normalizeText: (text: string): string => {
    return text
      .trim()
      .replace(/\s+/g, ' ')
      .replace(/[^\w\sа-яА-ЯёЁ\-.,!?@#$%^&*()]/g, '');
  },

  // Маскирование email
  maskEmail: (email: string): string => {
    const [username, domain] = email.split('@');
    if (username.length <= 2) return email;
    return `${username.slice(0, 2)}***@${domain}`;
  },

  // Маскирование телефона
  maskPhone: (phone: string): string => {
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length < 10) return phone;
    return `+7 (${cleaned.slice(1, 4)}) ***-**-${cleaned.slice(-2)}`;
  }
};

// Защита от спама
export const spamProtection = {
  // Проверка на спам в тексте
  detectSpam: (text: string): { isSpam: boolean; reasons: string[] } => {
    const reasons: string[] = [];
    const lowerText = text.toLowerCase();

    // Список спам-слов
    const spamWords = [
      'viagra', 'cialis', 'casino', 'lottery', 'winner', 'congratulations',
      'click here', 'buy now', 'free money', 'guaranteed', 'limited offer',
      'act now', 'don\'t wait', 'exclusive deal', 'risk free'
    ];

    // Проверка на спам-слова
    const foundSpamWords = spamWords.filter(word => lowerText.includes(word));
    if (foundSpamWords.length > 0) {
      reasons.push(`Обнаружены спам-слова: ${foundSpamWords.join(', ')}`);
    }

    // Проверка на слишком много ссылок
    const urlCount = (text.match(/https?:\/\//g) || []).length;
    if (urlCount > 2) {
      reasons.push('Слишком много ссылок');
    }

    // Проверка на повторяющиеся символы
    if (/(.)\1{4,}/.test(text)) {
      reasons.push('Обнаружены повторяющиеся символы');
    }

    // Проверка на CAPS LOCK
    const upperCaseRatio = (text.match(/[A-Z]/g) || []).length / text.length;
    if (upperCaseRatio > 0.7 && text.length > 10) {
      reasons.push('Слишком много заглавных букв');
    }

    // Проверка на короткие бессмысленные сообщения
    if (text.trim().length < 3) {
      reasons.push('Слишком короткое сообщение');
    }

    return {
      isSpam: reasons.length > 0,
      reasons
    };
  },

  // Генерация honeypot поля
  generateHoneypot: (): string => {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2);
    return btoa(`${timestamp}:${random}`).replace(/[^a-zA-Z0-9]/g, '').substring(0, 10);
  },

  // Проверка honeypot
  verifyHoneypot: (honeypotValue: string, maxAge: number = 3600000): boolean => {
    try {
      const decoded = atob(honeypotValue);
      const [timestamp] = decoded.split(':');
      const age = Date.now() - parseInt(timestamp);
      return age < maxAge && age > 1000; // Не старше 1 часа, но и не мгновенный
    } catch {
      return false;
    }
  }
};

// CSRF защита
export const csrf = {
  // Генерация CSRF токена
  generateToken: (): string => {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  },

  // Проверка CSRF токена
  verifyToken: (token: string, sessionToken: string): boolean => {
    return token === sessionToken && token.length === 64;
  }
};

// Логирование безопасности
export const securityLogger = {
  log: (event: string, details: any, severity: 'low' | 'medium' | 'high' = 'medium') => {
    const logEntry = {
      timestamp: new Date().toISOString(),
      event,
      severity,
      details,
      userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'server',
      ip: typeof window !== 'undefined' ? 'client' : 'server'
    };

    console.warn(`🛡️ Security Event [${severity.toUpperCase()}]:`, logEntry);

    // В проде можно отправлять в Sentry/LogRocket
    if (severity === 'high' && typeof window !== 'undefined') {
      // Отправка критических событий на сервер
      fetch('/api/security/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(logEntry)
      }).catch(() => {
        // Игнорируем ошибки логирования
      });
    }
  }
};

// Конфигурации rate limiting для разных эндпоинтов
export const rateLimitConfigs = {
  // API запросы
  api: {
    windowMs: 60000, // 1 минута
    maxRequests: 100,
    message: 'Слишком много запросов к API. Попробуйте через минуту.'
  },
  
  // Аутентификация
  auth: {
    windowMs: 900000, // 15 минут
    maxRequests: 5,
    message: 'Слишком много попыток входа. Попробуйте через 15 минут.'
  },
  
  // Комментарии/отзывы
  comments: {
    windowMs: 60000, // 1 минута
    maxRequests: 3,
    message: 'Слишком много комментариев. Подождите минуту.'
  },
  
  // Поиск
  search: {
    windowMs: 60000, // 1 минута
    maxRequests: 30,
    message: 'Слишком много поисковых запросов. Попробуйте через минуту.'
  }
};
