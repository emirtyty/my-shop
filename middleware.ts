import { createClient } from '@supabase/supabase-js'
import { NextResponse, NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
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
      console.log('Middleware: Checking session for /admin route')
      const { data: { session }, error } = await supabase.auth.getSession()
      
      console.log('Middleware: Session result:', { error: !!error, session: !!session })
      
      if (error || !session) {
        console.log('Middleware: No session found, redirecting to auth/')
        const redirectUrl = new URL('/auth/', request.url)
        return NextResponse.redirect(redirectUrl, 302)
      }
      
      console.log('Middleware: Session valid for user:', session.user.email)
    } catch (error) {
      console.error('Middleware error:', error)
      const redirectUrl = new URL('/auth/', request.url)
      return NextResponse.redirect(redirectUrl, 302)
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*']
}
