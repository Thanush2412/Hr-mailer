import { NextRequest, NextResponse } from 'next/server';
import { GOOGLE_AUTH_CONFIG, isEmailAuthorized } from '@/auth.config';

// Log login attempt to Google Apps Script
async function logLoginAttempt(email: string, success: boolean, ipAddress: string, userAgent: string) {
  // Get GAS URL from config
  const gasUrl = process.env.GAS_URL ?? "";
  if (!gasUrl) {
    console.error("Cannot log login attempt: GAS_URL not configured");
    return;
  }

  try {
    const loginData = {
      action: "logLogin",
      email: email,
      success: success,
      ipAddress: ipAddress,
      userAgent: userAgent,
      timestamp: new Date().toISOString()
    };

    const res = await fetch(gasUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(loginData),
    });

    if (!res.ok) {
      console.error("Login log failed with status:", res.status);
    }
  } catch (err) {
    console.error("Failed to log login attempt:", err);
  }
}

// Handle Google OAuth authorization request (GET)
export async function GET(request: NextRequest) {
  // For security reasons, we should not allow direct GET requests to this endpoint for authentication
  // This endpoint is now only used for POST requests from the frontend
  return NextResponse.json({ error: 'Use POST method to initiate Google sign-in' }, { status: 405 });
}

// Handle Google OAuth sign-in (POST)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const action = body.action;
    const redirectUrl = body.redirectUrl || '/';

    // Handle sign-in request from frontend
    if (action === 'signIn') {
      // Since we're not using redirects, we need to return a URL for the frontend to open in a popup
      // Generate the Google OAuth URL
      const authUrl = new URL('https://accounts.google.com/o/oauth2/auth');
      authUrl.searchParams.set('client_id', GOOGLE_AUTH_CONFIG.clientId);
      authUrl.searchParams.set('redirect_uri', GOOGLE_AUTH_CONFIG.redirectUri);
      authUrl.searchParams.set('response_type', 'code');
      authUrl.searchParams.set('scope', 'openid email profile');
      authUrl.searchParams.set('access_type', 'offline');
      authUrl.searchParams.set('prompt', 'consent');
      authUrl.searchParams.set('state', btoa(redirectUrl));

      // Return the auth URL to the frontend so it can open in a popup
      return NextResponse.json({
        success: true,
        authUrl: authUrl.toString(),
        message: 'Open this URL in a popup for authentication'
      });
    }

    // Handle callback from popup (if needed)
    // This would require setting up a popup window and listening for messages
    // But we're going to handle this differently as requested without redirects
    // So we won't implement this callback method

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}