import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function middleware(request: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  
  if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase configuration')
    return NextResponse.next()
  }

  const supabase = createClient(supabaseUrl, supabaseKey)
  const url = new URL(request.url)
  
  // Проверяем сессию только для админских маршрутов
  if (url.pathname.startsWith('/admin')) {
    try {
      const { data: { session }, error } = await supabase.auth.getSession()
      
      if (error || !session) {
        console.log('No session found, redirecting to auth/')
        return NextResponse.redirect(new URL('/auth/', request.url))
      }
      
      console.log('Session valid for user:', session.user.email)
    } catch (error) {
      console.error('Middleware error:', error)
      return NextResponse.redirect(new URL('/auth/', request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*']
}
