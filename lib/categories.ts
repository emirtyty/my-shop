import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Типы для категорий
export interface Category {
  id: string
  name: string
  icon: string
  color: string
  count: number
  is_active: boolean
  sort_order: number
  created_at: string
  updated_at: string
}

// API функции для категорий
export const categoriesAPI = {
  // Получить все категории
  getAll: async (): Promise<Category[]> => {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true })
    
    if (error) throw error
    return data || []
  },

  // Получить категорию по ID
  getById: async (id: string): Promise<Category | null> => {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('id', id)
      .single()
    
    if (error) throw error
    return data
  },

  // Создать новую категорию
  create: async (category: Omit<Category, 'id' | 'created_at' | 'updated_at'>): Promise<Category> => {
    const { data, error } = await supabase
      .from('categories')
      .insert([category])
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  // Обновить категорию
  update: async (id: string, updates: Partial<Category>): Promise<Category> => {
    const { data, error } = await supabase
      .from('categories')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  // Удалить категорию (мягкое удаление)
  delete: async (id: string): Promise<void> => {
    const { error } = await supabase
      .from('categories')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', id)
    
    if (error) throw error
  },

  // Обновить счетчик товаров в категории
  updateCount: async (id: string, count: number): Promise<void> => {
    const { error } = await supabase
      .from('categories')
      .update({ count, updated_at: new Date().toISOString() })
      .eq('id', id)
    
    if (error) throw error
  }
}

// Функция для инициализации категорий по умолчанию
export const initializeDefaultCategories = async (): Promise<void> => {
  const defaultCategories = [
    { name: 'Смартфоны', icon: '📱', color: 'from-blue-400 to-blue-600', sort_order: 1 },
    { name: 'Ноутбуки', icon: '💻', color: 'from-purple-400 to-purple-600', sort_order: 2 },
    { name: 'Планшеты', icon: '📋', color: 'from-green-400 to-green-600', sort_order: 3 },
    { name: 'Телевизоры', icon: '📺', color: 'from-red-400 to-red-600', sort_order: 4 },
    { name: 'Наушники', icon: '🎧', color: 'from-indigo-400 to-indigo-600', sort_order: 5 },
    { name: 'Часы', icon: '⌚', color: 'from-pink-400 to-pink-600', sort_order: 6 },
    { name: 'Фотоаппараты', icon: '📷', color: 'from-yellow-400 to-yellow-600', sort_order: 7 },
    { name: 'Игровые консоли', icon: '🎮', color: 'from-orange-400 to-orange-600', sort_order: 8 },
    { name: 'Мужская одежда', icon: '👔', color: 'from-gray-600 to-gray-800', sort_order: 9 },
    { name: 'Женская одежда', icon: '👗', color: 'from-rose-400 to-rose-600', sort_order: 10 },
    { name: 'Детская одежда', icon: '👶', color: 'from-cyan-400 to-cyan-600', sort_order: 11 },
    { name: 'Обувь', icon: '👟', color: 'from-amber-400 to-amber-600', sort_order: 12 },
    { name: 'Сумки и аксессуары', icon: '👜', color: 'from-teal-400 to-teal-600', sort_order: 13 },
    { name: 'Украшения', icon: '💍', color: 'from-violet-400 to-violet-600', sort_order: 14 },
    { name: 'Мебель', icon: '🪑', color: 'from-brown-400 to-brown-600', sort_order: 15 },
    { name: 'Кухня', icon: '🍳', color: 'from-lime-400 to-lime-600', sort_order: 16 },
    { name: 'Спорт', icon: '⚽', color: 'from-emerald-400 to-emerald-600', sort_order: 17 },
    { name: 'Красота', icon: '💄', color: 'from-fuchsia-400 to-fuchsia-600', sort_order: 18 },
    { name: 'Автотовары', icon: '🚗', color: 'from-slate-400 to-slate-600', sort_order: 19 },
    { name: 'Книги', icon: '📚', color: 'from-stone-400 to-stone-600', sort_order: 20 },
    { name: 'Домашние животные', icon: '🐾', color: 'from-zinc-400 to-zinc-600', sort_order: 21 },
    { name: 'Сад', icon: '🌱', color: 'from-green-500 to-green-700', sort_order: 22 },
    { name: 'Инструменты', icon: '🔧', color: 'from-gray-500 to-gray-700', sort_order: 23 },
    { name: 'Продукты', icon: '🍎', color: 'from-red-500 to-red-700', sort_order: 24 }
  ]

  for (const category of defaultCategories) {
    try {
      await categoriesAPI.create({
        ...category,
        count: 0,
        is_active: true
      })
    } catch (error) {
      // Категория уже существует, пропускаем
      console.log(`Category ${category.name} already exists`)
    }
  }
}
