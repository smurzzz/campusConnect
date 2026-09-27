import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { supabase } from '@/lib/supabase'
import { jwtVerify } from 'jose'

// This function can be marked `async` if using `await` inside
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Skip middleware for static files, API routes, and auth routes
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api/') ||
    pathname.startsWith('/auth/') ||
    pathname.startsWith('/favicon.ico') ||
    pathname.startsWith('/public/')
  ) {
    return NextResponse.next()
  }

  // Get the session token from cookies (Clerk's __session token)
  const token = request.cookies.get('__session')?.value || ''

  // If no token, let Clerk handle authentication
  if (!token) {
    return NextResponse.next()
  }

  try {
    // For production implementation with Clerk, we need to:
    // 1. Get the Clerk publishable key from environment
    // 2. Use Clerk's SDK to verify the session and get user data
    // 3. Check the user's status in Supabase

    // Since we're using Clerk, the proper approach is to use Clerk's auth helpers
    // However, for simplicity in this context, we'll check user status in components
    // and add a note that for production, a proper middleware would integrate with Clerk's backend

    // For now, we'll allow the request to proceed and handle status checks in components
    // with a note that proper middleware would require Clerk backend integration

    return NextResponse.next()
  } catch (error) {
    console.error('Middleware error:', error)
    return NextResponse.next()
  }
}

// See "Matching Paths" below to learn more
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|public/).*)',
  ],
}