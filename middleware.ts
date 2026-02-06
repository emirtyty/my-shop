import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function middleware(request: Request) {
  // Временно отключаем аутентификацию для админки
  // TODO: Добавить аутентификацию после тестирования
  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*']
}
