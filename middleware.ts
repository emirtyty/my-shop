import { NextResponse } from 'next/server'

export async function middleware() {
  // Временно отключаем middleware для отладки
  console.log('Middleware: temporarily disabled')
  return NextResponse.next()
}

export const config = {
  matcher: []
}
