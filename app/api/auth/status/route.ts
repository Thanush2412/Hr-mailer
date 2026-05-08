import { NextRequest, NextResponse } from 'next/server';
import { isEmailAuthorized } from '@/auth.config';

// Check authentication status
export async function GET(request: NextRequest) {
  // Get session cookie
  const session = request.cookies.get('session')?.value;

  if (!session) {
    return NextResponse.json({ authenticated: false }, { status: 200 });
  }

  try {
    // Decode session token
    const sessionData = JSON.parse(atob(session));

    // Check if session is expired
    if (Date.now() > sessionData.expires) {
      // Clear expired session
      const response = NextResponse.json({ authenticated: false }, { status: 200 });
      response.cookies.set('session', '', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 0,
        path: '/',
        sameSite: 'strict'
      });
      return response;
    }

    // Verify email is still authorized
    if (!isEmailAuthorized(sessionData.email)) {
      // Clear unauthorized session
      const response = NextResponse.json({ authenticated: false }, { status: 200 });
      response.cookies.set('session', '', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 0,
        path: '/',
        sameSite: 'strict'
      });
      return response;
    }

    // Return authenticated status with user info
    return NextResponse.json({
      authenticated: true,
      user: {
        email: sessionData.email,
        name: sessionData.name,
        picture: sessionData.picture
      }
    }, { status: 200 });
  } catch (error) {
    // Invalid session
    const response = NextResponse.json({ authenticated: false }, { status: 200 });
    response.cookies.set('session', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 0,
      path: '/',
      sameSite: 'strict'
    });
    return response;
  }
}

// Handle logout
export async function POST(request: NextRequest) {
  const response = NextResponse.json({ success: true });
  response.cookies.set('session', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 0,
    path: '/',
    sameSite: 'strict'
  });
  return response;
}