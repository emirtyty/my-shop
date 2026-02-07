'use client';

import { useState, useEffect, useRef } from 'react';
import { logger } from '../lib/logger';

interface ProductView {
  productId: string;
  productName: string;
  category: string;
  timestamp: number;
  userId?: string;
}

interface HeatmapData {
  productId: string;
  productName: string;
  x: number;
  y: number;
  intensity: number;
  category: string;
}

interface TrendData {
  category: string;
  count: number;
  trend: 'up' | 'down' | 'stable';
  change: number;
}

export default function LiveAnalytics() {
  const [productViews, setProductViews] = useState<ProductView[]>([]);
  const [heatmapData, setHeatmapData] = useState<HeatmapData[]>([]);
  const [trends, setTrends] = useState<TrendData[]>([]);
  const [isLive, setIsLive] = useState(true);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();

  useEffect(() => {
    // Симуляция реальных данных (в реальном приложении здесь будет WebSocket)
    const interval = setInterval(() => {
      if (!isLive) return;
      
      // Генерируем случайные просмотры товаров
      const newView: ProductView = {
        productId: Math.random().toString(36).substr(2, 9),
        productName: `Товар ${Math.floor(Math.random() * 100)}`,
        category: ['Смартфоны', 'Ноутбуки', 'Планшеты', 'Телевизоры', 'Наушники'][Math.floor(Math.random() * 5)],
        timestamp: Date.now(),
        userId: Math.random().toString(36).substr(2, 9)
      };
      
      setProductViews(prev => {
        const updated = [...prev, newView];
        // Ограничиваем историю последними 100 просмотрами
        return updated.slice(-100);
      });
      
      // Обновляем тепловую карту
      setHeatmapData(prev => {
        const newHeatmap: HeatmapData = {
          productId: newView.productId,
          productName: newView.productName,
          x: Math.random() * 100,
          y: Math.random() * 100,
          intensity: Math.random(),
          category: newView.category
        };
        
        const updated = [...prev, newHeatmap];
        // Удаляем старые точки (старше 5 минут)
        const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
        return updated.filter(point => {
          const view = productViews.find(v => v.productId === point.productId);
          return view && view.timestamp > fiveMinutesAgo;
        });
      });
      
      // Обновляем тренды
      updateTrends();
    }, 2000); // Обновляем каждые 2 секунды

    return () => clearInterval(interval);
  }, [isLive, productViews]);

  useEffect(() => {
    // Рисуем тепловую карту
    drawHeatmap();
  }, [heatmapData]);

  const updateTrends = () => {
    const categories = ['Смартфоны', 'Ноутбуки', 'Планшеты', 'Телевизоры', 'Наушники'];
    const newTrends: TrendData[] = categories.map(category => {
      const count = productViews.filter(view => view.category === category).length;
      const previousCount = productViews.filter(view => 
        view.category === category && 
        view.timestamp < Date.now() - 60000 // За последнюю минуту
      ).length;
      
      let trend: 'up' | 'down' | 'stable' = 'stable';
      let change = 0;
      
      if (count > previousCount) {
        trend = 'up';
        change = Math.round(((count - previousCount) / Math.max(previousCount, 1)) * 100);
      } else if (count < previousCount) {
        trend = 'down';
        change = Math.round(((previousCount - count) / Math.max(previousCount, 1)) * 100);
      }
      
      return { category, count, trend, change };
    });
    
    setTrends(newTrends);
  };

  const drawHeatmap = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Очищаем canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Рисуем точки тепловой карты
    heatmapData.forEach(point => {
      const x = (point.x / 100) * canvas.width;
      const y = (point.y / 100) * canvas.height;
      const radius = 20 + point.intensity * 30;
      
      // Создаем градиент для точки
      const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
      
      if (point.intensity > 0.7) {
        gradient.addColorStop(0, 'rgba(255, 0, 0, 0.8)'); // Красный
        gradient.addColorStop(0.5, 'rgba(255, 100, 0, 0.4)'); // Оранжевый
        gradient.addColorStop(1, 'rgba(255, 200, 0, 0)'); // Желтый
      } else if (point.intensity > 0.4) {
        gradient.addColorStop(0, 'rgba(255, 200, 0, 0.6)'); // Желтый
        gradient.addColorStop(0.5, 'rgba(255, 255, 0, 0.3)'); // Светло-желтый
        gradient.addColorStop(1, 'rgba(255, 255, 0, 0)'); // Прозрачный желтый
      } else {
        gradient.addColorStop(0, 'rgba(0, 255, 0, 0.4)'); // Зеленый
        gradient.addColorStop(0.5, 'rgba(100, 255, 100, 0.2)'); // Светло-зеленый
        gradient.addColorStop(1, 'rgba(0, 255, 0, 0)'); // Прозрачный зеленый
      }
      
      ctx.fillStyle = gradient;
      ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
    });
  };

  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up': return '📈';
      case 'down': return '📉';
      default: return '➡️';
    }
  };

  const getTrendColor = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up': return 'text-green-500';
      case 'down': return 'text-red-500';
      default: return 'text-gray-500';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 space-y-6">
      {/* Заголовок с контролами */}
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-bold text-gray-800">🔥 Живая аналитика</h3>
        <button
          onClick={() => setIsLive(!isLive)}
          className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
            isLive 
              ? 'bg-green-500 text-white' 
              : 'bg-gray-200 text-gray-600'
          }`}
        >
          {isLive ? '🔴 В прямом эфире' : '⏸️ Пауза'}
        </button>
      </div>

      {/* Тепловая карта */}
      <div className="space-y-2">
        <h4 className="text-sm font-semibold text-gray-700">🗺️ Тепловая карта просмотров</h4>
        <div className="relative">
          <canvas
            ref={canvasRef}
            width={400}
            height={200}
            className="w-full h-48 bg-gray-100 rounded-lg border border-gray-200"
          />
          <div className="absolute top-2 right-2 bg-white/80 backdrop-blur px-2 py-1 rounded text-xs">
            {heatmapData.length} активных просмотров
          </div>
        </div>
        <div className="flex justify-between text-xs text-gray-500">
          <span>🔴 Высокая активность</span>
          <span>🟡 Средняя активность</span>
          <span>🟢 Низкая активность</span>
        </div>
      </div>

      {/* Тренды категорий */}
      <div className="space-y-2">
        <h4 className="text-sm font-semibold text-gray-700">📊 Популярность категорий</h4>
        <div className="space-y-2">
          {trends.map((trend, index) => (
            <div key={trend.category} className="flex items-center justify-between p-2 bg-gray-50 rounded">
              <div className="flex items-center gap-2">
                <span className="text-lg">{getTrendIcon(trend.trend)}</span>
                <span className="text-sm font-medium">{trend.category}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">{trend.count} просмотров</span>
                {trend.change > 0 && (
                  <span className={`text-xs font-medium ${getTrendColor(trend.trend)}`}>
                    {trend.trend === 'up' ? '+' : ''}{trend.change}%
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Последние просмотры */}
      <div className="space-y-2">
        <h4 className="text-sm font-semibold text-gray-700">👁️ Последние просмотры</h4>
        <div className="max-h-32 overflow-y-auto space-y-1">
          {productViews.slice(-10).reverse().map((view, index) => (
            <div key={`${view.productId}-${index}`} className="flex items-center justify-between text-xs p-1 bg-gray-50 rounded">
              <span className="font-medium">{view.productName}</span>
              <div className="flex items-center gap-2">
                <span className="text-gray-500">{view.category}</span>
                <span className="text-gray-400">
                  {new Date(view.timestamp).toLocaleTimeString()}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
