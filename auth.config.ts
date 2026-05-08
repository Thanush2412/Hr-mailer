// Authentication configuration for Google Sign-In
// This file contains sensitive configuration that should be kept private

export interface GoogleAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

// These values should be stored in environment variables in production
// Get these from Google Cloud Console: https://console.cloud.google.com/apis/credentials
export const GOOGLE_AUTH_CONFIG: GoogleAuthConfig = {
  clientId: process.env.GOOGLE_CLIENT_ID || '',
  clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
  redirectUri: process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/api/auth/callback'
};

// Authorized email domains - only users from these domains can access
// This should be configured in environment variables
export const AUTHORIZED_EMAIL_DOMAINS = [
  process.env.AUTHORIZED_EMAIL_DOMAIN || 'faceprep.com'
];

// Authorized individual emails (for personal access)
export const AUTHORIZED_EMAILS = (
  process.env.AUTHORIZED_EMAILS ?
    process.env.AUTHORIZED_EMAILS.split(',').map(email => email.trim()) :
    []
);

// Return true if email is authorized
export function isEmailAuthorized(email: string): boolean {
  // Check if email is in the list of authorized individual emails
  if (AUTHORIZED_EMAILS.includes(email)) {
    return true;
  }

  // Check if email domain is authorized
  const domain = email.split('@')[1];
  if (AUTHORIZED_EMAIL_DOMAINS.includes(domain)) {
    return true;
  }

  return false;
}