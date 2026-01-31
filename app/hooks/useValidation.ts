import { useState, useCallback } from 'react';
import { validators, sanitize, spamProtection } from '../lib/security';

export interface ValidationRule {
  field: string;
  required?: boolean;
  validator: (value: any) => boolean;
  message: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
  sanitizedData: Record<string, any>;
}

export const useValidation = () => {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isValidating, setIsValidating] = useState(false);

  // Валидация формы
  const validate = useCallback(async (
    data: Record<string, any>,
    rules: ValidationRule[]
  ): Promise<ValidationResult> => {
    setIsValidating(true);
    const newErrors: Record<string, string> = {};
    const sanitizedData: Record<string, any> = {};

    try {
      // Валидация каждого поля
      for (const rule of rules) {
        const value = data[rule.field];
        
        // Проверка обязательных полей
        if (rule.required && (!value || value.toString().trim() === '')) {
          newErrors[rule.field] = `${rule.field} обязательно для заполнения`;
          continue;
        }

        // Если поле не обязательное и пустое, пропускаем валидацию
        if (!rule.required && (!value || value.toString().trim() === '')) {
          sanitizedData[rule.field] = '';
          continue;
        }

        // Валидация значения
        if (!rule.validator(value)) {
          newErrors[rule.field] = rule.message;
          continue;
        }

        // Санитизация данных
        if (typeof value === 'string') {
          sanitizedData[rule.field] = sanitize.normalizeText(value);
        } else {
          sanitizedData[rule.field] = value;
        }
      }

      // Проверка на спам для текстовых полей
      const textFields = rules.filter(rule => 
        typeof data[rule.field] === 'string' && 
        ['comment', 'message', 'review', 'description'].includes(rule.field)
      );

      for (const field of textFields) {
        const value = data[field.field];
        if (value && typeof value === 'string') {
          const spamCheck = spamProtection.detectSpam(value);
          if (spamCheck.isSpam) {
            newErrors[field.field] = `Обнаружен спам: ${spamCheck.reasons.join(', ')}`;
          }
        }
      }

      setErrors(newErrors);
      
      return {
        isValid: Object.keys(newErrors).length === 0,
        errors: newErrors,
        sanitizedData
      };

    } catch (error) {
      console.error('Ошибка валидации:', error);
      return {
        isValid: false,
        errors: { general: 'Ошибка валидации данных' },
        sanitizedData: data
      };
    } finally {
      setIsValidating(false);
    }
  }, []);

  // Валидация одного поля
  const validateField = useCallback((
    value: any,
    field: string,
    rules: ValidationRule[]
  ): string | null => {
    const rule = rules.find(r => r.field === field);
    if (!rule) return null;

    if (rule.required && (!value || value.toString().trim() === '')) {
      return `${field} обязательно для заполнения`;
    }

    if (!rule.required && (!value || value.toString().trim() === '')) {
      return null;
    }

    if (!rule.validator(value)) {
      return rule.message;
    }

    // Проверка на спам для текстовых полей
    if (typeof value === 'string' && ['comment', 'message', 'review', 'description'].includes(field)) {
      const spamCheck = spamProtection.detectSpam(value);
      if (spamCheck.isSpam) {
        return `Обнаружен спам: ${spamCheck.reasons.join(', ')}`;
      }
    }

    return null;
  }, []);

  // Очистка ошибок
  const clearErrors = useCallback(() => {
    setErrors({});
  }, []);

  // Очистка ошибки конкретного поля
  const clearFieldError = useCallback((field: string) => {
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[field];
      return newErrors;
    });
  }, []);

  return {
    errors,
    isValidating,
    validate,
    validateField,
    clearErrors,
    clearFieldError
  };
};

// Преднастроенные правила валидации
export const validationRules = {
  // Регистрация пользователя
  registration: [
    {
      field: 'email',
      required: true,
      validator: validators.email,
      message: 'Введите корректный email адрес'
    },
    {
      field: 'password',
      required: true,
      validator: (value: string) => value.length >= 8,
      message: 'Пароль должен содержать минимум 8 символов'
    },
    {
      field: 'username',
      required: true,
      validator: validators.username,
      message: 'Имя пользователя должно содержать 3-20 символов (буквы, цифры, _)'
    }
  ],

  // Товар
  product: [
    {
      field: 'name',
      required: true,
      validator: validators.productName,
      message: 'Название товара должно содержать 3-200 символов'
    },
    {
      field: 'price',
      required: true,
      validator: validators.price,
      message: 'Введите корректную цену'
    },
    {
      field: 'category',
      required: true,
      validator: validators.category,
      message: 'Выберите корректную категорию'
    },
    {
      field: 'image_url',
      required: true,
      validator: validators.url,
      message: 'Введите корректный URL изображения'
    }
  ],

  // Комментарий/отзыв
  comment: [
    {
      field: 'text',
      required: true,
      validator: validators.comment,
      message: 'Комментарий должен содержать 1-1000 символов'
    },
    {
      field: 'rating',
      required: true,
      validator: (value: number) => value >= 1 && value <= 5,
      message: 'Рейтинг должен быть от 1 до 5'
    }
  ],

  // Поиск
  search: [
    {
      field: 'query',
      required: true,
      validator: (value: string) => value.trim().length >= 2,
      message: 'Запрос должен содержать минимум 2 символа'
    }
  ],

  // Контактная форма
  contact: [
    {
      field: 'name',
      required: true,
      validator: (value: string) => value.trim().length >= 2,
      message: 'Имя должно содержать минимум 2 символа'
    },
    {
      field: 'email',
      required: true,
      validator: validators.email,
      message: 'Введите корректный email адрес'
    },
    {
      field: 'phone',
      required: false,
      validator: validators.phone,
      message: 'Введите корректный номер телефона'
    },
    {
      field: 'message',
      required: true,
      validator: (value: string) => value.trim().length >= 10 && value.trim().length <= 1000,
      message: 'Сообщение должно содержать 10-1000 символов'
    }
  ]
};
