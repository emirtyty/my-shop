import { NextRequest, NextResponse } from 'next/server';
import { rateLimit, rateLimitConfigs } from './security';

// Rate limiting middleware для API routes
export const withRateLimit = async (
  request: NextRequest,
  configKey: keyof typeof rateLimitConfigs
) => {
  const config = rateLimitConfigs[configKey];
  
  // Получаем IP адрес клиента
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || 
    request.headers.get('x-real-ip') || 
    request.headers.get('cf-connecting-ip') || // Cloudflare
    'unknown';
  
  // User Agent для дополнительной идентификации
  const userAgent = request.headers.get('user-agent') || 'unknown';
  
  // Создаем уникальный идентификатор
  const identifier = `${ip}:${userAgent}:${configKey}`;
  
  // Проверяем rate limit
  const result = rateLimit(identifier, config);
  
  if (!result.allowed) {
    return NextResponse.json(
      { 
        error: config.message || 'Rate limit exceeded',
        retryAfter: Math.ceil((result.resetTime! - Date.now()) / 1000),
        remaining: result.remaining
      },
      { 
        status: 429,
        headers: {
          'X-RateLimit-Limit': config.maxRequests.toString(),
          'X-RateLimit-Remaining': result.remaining.toString(),
          'X-RateLimit-Reset': result.resetTime!.toString(),
          'Retry-After': Math.ceil((result.resetTime! - Date.now()) / 1000).toString()
        }
      }
    );
  }
  
  // Добавляем заголовки с информацией о rate limit
  const response = NextResponse.next();
  response.headers.set('X-RateLimit-Limit', config.maxRequests.toString());
  response.headers.set('X-RateLimit-Remaining', result.remaining.toString());
  response.headers.set('X-RateLimit-Reset', result.resetTime!.toString());
  
  return response;
};

// Rate limiting middleware для конкретных эндпоинтов
export const createRateLimitedHandler = (
  handler: (req: NextRequest, ...args: any[]) => Promise<NextResponse>,
  configKey: keyof typeof rateLimitConfigs
) => {
  return async (request: NextRequest, ...args: any[]) => {
    // Проверяем rate limit
    const rateLimitResponse = await withRateLimit(request, configKey);
    
    // Если rate limit превышен, возвращаем ошибку
    if (rateLimitResponse.status === 429) {
      return rateLimitResponse;
    }
    
    // Вызываем основной handler
    const response = await handler(request, ...args);
    
    // Копируем rate limit заголовки в ответ
    if (rateLimitResponse.headers) {
      rateLimitResponse.headers.forEach((value, key) => {
        response.headers.set(key, value);
      });
    }
    
    return response;
  };
};
